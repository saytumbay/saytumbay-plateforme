/**
 * Sessions, CSRF et contrôle d'accès.
 *
 * - Session : cookie `sb_session` HttpOnly + Secure + SameSite=Lax contenant un jeton aléatoire de 256 bits ;
 *   la base ne garde que son empreinte SHA-256. Expiration 12 h (30 jours si « rester connecté »), glissante.
 * - CSRF : jeton de synchronisation lié à la session, exposé dans le cookie lisible `sb_csrf` et exigé dans
 *   l'en-tête `X-CSRF-Token` pour toute méthode non sûre. Avant connexion, l'en-tête Origin doit être celui du site.
 * - Accès : `need()` vérifie l'appartenance à l'organisation active et la permission du rôle (RBAC partagé).
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt, sql } from "drizzle-orm";
import { can, type OrgRole, type Permission, type SessionUser } from "@saytumbay/shared";
import { memberships, organizations, sessions, users, auditLog } from "../db/schema";
import { randomToken, safeEqual, sha256 } from "../lib/crypto";
import { forbidden, HttpError } from "../lib/errors";
import type { AppContext } from "../context";

export const SESSION_COOKIE = "sb_session";
export const CSRF_COOKIE = "sb_csrf";
const SHORT = 12 * 3600_000;
const LONG = 30 * 24 * 3600_000;

type UserRow = typeof users.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;

declare module "fastify" {
  interface FastifyRequest {
    session: SessionRow | null;
    user: UserRow | null;
  }
}

export interface Ctx {
  user: UserRow;
  session: SessionRow;
  orgId: string;
  role: OrgRole | null;
  membership: typeof memberships.$inferSelect | null;
}

export function cookieOpts(ctx: AppContext, remember: boolean, httpOnly: boolean) {
  return { path: "/", httpOnly, secure: ctx.env.cookieSecure, sameSite: "lax" as const, ...(remember ? { maxAge: LONG / 1000 } : {}) };
}

/** Ouvre une nouvelle session (toujours un nouveau jeton : pas de fixation de session) et l'attache à la requête. */
export async function createSession(ctx: AppContext, req: FastifyRequest, reply: FastifyReply, user: UserRow, remember: boolean, activeOrgId: string | null = null) {
  const token = randomToken();
  const csrf = randomToken(24);
  const now = ctx.now();
  const [row] = await ctx.db
    .insert(sessions)
    .values({ tokenHash: sha256(token), userId: user.id, activeOrgId, csrf, remember, ip: req.ip, userAgent: String(req.headers["user-agent"] ?? "").slice(0, 200), createdAt: now, lastSeenAt: now, expiresAt: new Date(now.getTime() + (remember ? LONG : SHORT)) })
    .returning();
  await ctx.db.update(users).set({ lastSeenAt: now }).where(eq(users.id, user.id));
  reply.setCookie(SESSION_COOKIE, token, cookieOpts(ctx, remember, true));
  reply.setCookie(CSRF_COOKIE, csrf, cookieOpts(ctx, remember, false));
  req.session = row!;
  req.user = { ...user, lastSeenAt: now };
}

export function clearSessionCookies(ctx: AppContext, reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE, { path: "/", secure: ctx.env.cookieSecure, sameSite: "lax", httpOnly: true });
  reply.clearCookie(CSRF_COOKIE, { path: "/", secure: ctx.env.cookieSecure, sameSite: "lax" });
}

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

export function registerAuth(app: FastifyInstance, ctx: AppContext) {
  app.decorateRequest("session", null);
  app.decorateRequest("user", null);
  const appOrigin = new URL(ctx.env.APP_URL).origin;

  app.addHook("onRequest", async (req) => {
    // Contrôle d'origine sur toute écriture : bloque les formulaires et scripts d'autres sites.
    if (!SAFE.has(req.method)) {
      const origin = req.headers.origin;
      if (origin && origin !== appOrigin) throw new HttpError(403, "origine_refusee", "Requête refusée : origine inconnue.");
    }
    const token = req.cookies[SESSION_COOKIE];
    if (!token || token.length > 100) return;
    const now = ctx.now();
    const [row] = await ctx.db
      .select()
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, now)))
      .limit(1);
    if (!row) return;
    req.session = row.sessions;
    req.user = row.users;
    // Glissement : au plus une écriture toutes les 5 minutes.
    if (now.getTime() - row.sessions.lastSeenAt.getTime() > 5 * 60_000) {
      const exp = new Date(now.getTime() + (row.sessions.remember ? LONG : SHORT));
      await ctx.db.update(sessions).set({ lastSeenAt: now, expiresAt: exp }).where(eq(sessions.tokenHash, row.sessions.tokenHash));
      await ctx.db.update(users).set({ lastSeenAt: now }).where(eq(users.id, row.users.id));
    }
  });

  app.addHook("preHandler", async (req) => {
    if (SAFE.has(req.method) || !req.session) return;
    const header = req.headers["x-csrf-token"];
    if (typeof header !== "string" || !safeEqual(header, req.session.csrf)) throw new HttpError(403, "csrf", "Session expirée ou requête non autorisée. Rechargez la page.");
  });
}

/* ——— Contrôle d'accès dans les routes ——— */

export function needUser(req: FastifyRequest): { user: UserRow; session: SessionRow } {
  if (!req.user || !req.session) throw new HttpError(401, "non_connecte", "Votre session a expiré. Reconnectez-vous.");
  return { user: req.user, session: req.session };
}

export async function resolveCtx(ctx: AppContext, req: FastifyRequest, needOrg = true): Promise<Ctx> {
  const { user, session } = needUser(req);
  let orgId = session.activeOrgId;
  let m: typeof memberships.$inferSelect | null | undefined = null;
  if (orgId) {
    [m] = await ctx.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), eq(memberships.orgId, orgId), sql`${memberships.status} <> 'desactive'`))
      .limit(1);
    m ??= null;
  }
  if (!m) {
    // Organisation active absente ou retirée : on prend la première appartenance valide.
    [m] = await ctx.db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), sql`${memberships.status} <> 'desactive'`))
      .limit(1);
    m ??= null;
    orgId = m?.orgId ?? null;
    await ctx.db.update(sessions).set({ activeOrgId: orgId }).where(eq(sessions.tokenHash, session.tokenHash));
  }
  if (needOrg && !m) throw new HttpError(403, "sans_organisation", "Ce compte n’est rattaché à aucune organisation cliente.");
  return { user, session, orgId: orgId ?? "", role: m?.role ?? null, membership: m ?? null };
}

export async function need(ctx: AppContext, req: FastifyRequest, perm: Permission): Promise<Ctx> {
  const c = await resolveCtx(ctx, req, true);
  if (!can(perm, { orgRole: c.role, platformRole: c.user.platformRole })) {
    await audit(ctx, req, "action refusée", perm, "refus", c.orgId);
    throw forbidden();
  }
  return c;
}

export async function needPlatform(ctx: AppContext, req: FastifyRequest, perm: Permission) {
  const { user } = needUser(req);
  if (!can(perm, { platformRole: user.platformRole })) {
    await audit(ctx, req, "accès console refusé", perm, "refus", null);
    throw new HttpError(403, "interdit", "Cette page est réservée à l’équipe SaytuMbay.");
  }
  // La console donne accès à tous les clients : double authentification obligatoire.
  if (!user.twoFactorEnabled) throw new HttpError(403, "double_auth_requise", "Activez la double authentification (Paramètres, onglet Sécurité) pour accéder à la console.");
  return user;
}

export async function audit(ctx: AppContext, req: FastifyRequest | null, action: string, target: string, outcome: "succes" | "refus" | "echec" = "succes", orgId?: string | null, actor?: { id: string; firstName: string; lastName: string } | null) {
  const u = actor ?? req?.user ?? null;
  await ctx.db.insert(auditLog).values({ at: ctx.now(), actorId: u?.id ?? null, actorLabel: u ? `${u.firstName} ${u.lastName}` : "inconnu", orgId: orgId === undefined ? (req?.session?.activeOrgId ?? null) : orgId, action, target: target.slice(0, 300), ip: req?.ip ?? null, outcome });
}

/** Session au format du contrat (`SessionUser`). */
export async function sessionUser(ctx: AppContext, req: FastifyRequest): Promise<SessionUser> {
  const c = await resolveCtx(ctx, req, false);
  const rows = await ctx.db
    .select({ m: memberships, o: organizations })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(and(eq(memberships.userId, c.user.id), sql`${memberships.status} <> 'desactive'`));
  const u = c.user;
  return {
    user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, platformRole: u.platformRole, twoFactorEnabled: u.twoFactorEnabled, locale: u.locale },
    memberships: rows.map(({ m, o }) => ({ userId: m.userId, orgId: m.orgId, role: m.role, parcels: m.parcels, notify: m.notify, invitedAt: m.invitedAt.toISOString(), status: m.status, org: { id: o.id, name: o.name, type: o.type, modules: o.modules, status: o.status } })),
    activeOrgId: c.orgId || null,
  };
}
