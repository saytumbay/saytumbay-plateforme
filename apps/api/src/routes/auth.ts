/**
 * Authentification et compte : connexion (+ double authentification), déconnexion, mot de passe oublié,
 * invitation, profil, sessions ouvertes, activation TOTP.
 */
import type { FastifyInstance } from "fastify";
import { and, eq, gt, isNull, like, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { acceptInviteSchema, changePasswordSchema, forgotSchema, loginSchema, notifySchema, profileSchema, resetSchema, totpSchema } from "@saytumbay/shared";
import type { AppContext } from "../context";
import { invites, loginChallenges, loginFailures, memberships, organizations, passwordResets, recoveryCodes, sessions, users } from "../db/schema";
import { decrypt, encrypt, hashPassword, newRecoveryCodes, newTotpSecret, randomToken, sha256, verifyPassword, verifyTotp } from "../lib/crypto";
import { HttpError, parse } from "../lib/errors";
import { audit, clearSessionCookies, createSession, needUser, resolveCtx, SESSION_COOKIE, sessionUser } from "../plugins/auth";

const MIN = 60_000;
const LOCK_AFTER = 5;
const LOCK_MS = 15 * MIN;
const toE164 = (p: string) => (p.startsWith("+") ? p : `+221${p.replace(/^00221/, "")}`);

export function authRoutes(app: FastifyInstance, ctx: AppContext) {
  const { db } = ctx;
  const strict = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

  app.get("/auth/session", async (req) => sessionUser(ctx, req));

  app.post("/auth/login", strict, async (req, reply) => {
    const b = parse(loginSchema, req.body);
    const now = ctx.now();
    const [fail] = await db.select().from(loginFailures).where(eq(loginFailures.email, b.email)).limit(1);
    if (fail?.lockedUntil && fail.lockedUntil > now) {
      await audit(ctx, req, "connexion bloquée", b.email, "refus", null, null);
      throw new HttpError(429, "trop_de_tentatives", "Trop de tentatives. Pour votre sécurité, réessayez dans 15 minutes ou réinitialisez votre mot de passe.");
    }
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${b.email}`).limit(1);
    const ok = await verifyPassword(user?.passwordHash, b.password);
    if (!user || !ok) {
      const count = (fail && (!fail.lockedUntil || fail.lockedUntil <= now) ? fail.count : 0) + 1;
      const lockedUntil = count >= LOCK_AFTER ? new Date(now.getTime() + LOCK_MS) : null;
      await db
        .insert(loginFailures)
        .values({ email: b.email, count: lockedUntil ? 0 : count, lockedUntil, updatedAt: now })
        .onConflictDoUpdate({ target: loginFailures.email, set: { count: lockedUntil ? 0 : count, lockedUntil, updatedAt: now } });
      await audit(ctx, req, "connexion", b.email, "refus", null, null);
      throw new HttpError(401, "identifiants", "E-mail ou mot de passe incorrect.");
    }
    await db.delete(loginFailures).where(eq(loginFailures.email, b.email));
    if (user.twoFactorEnabled && user.totpSecret) {
      const id = randomToken();
      await db.insert(loginChallenges).values({ idHash: sha256(id), userId: user.id, remember: b.remember, expiresAt: new Date(now.getTime() + 5 * MIN) });
      return { status: "totp", challengeId: id, method: "application" };
    }
    await createSession(ctx, req, reply, user, b.remember);
    await audit(ctx, req, "connexion", "mot de passe", "succes", null);
    return { status: "ok", session: await sessionUser(ctx, req) };
  });

  app.post("/auth/totp", strict, async (req, reply) => {
    const b = parse(totpSchema, req.body);
    const now = ctx.now();
    const [ch] = await db
      .select()
      .from(loginChallenges)
      .where(and(eq(loginChallenges.idHash, sha256(b.challengeId)), gt(loginChallenges.expiresAt, now)))
      .limit(1);
    if (!ch || ch.attempts >= 5) throw new HttpError(401, "defi_expire", "La vérification a expiré. Reprenez la connexion.");
    const [user] = await db.select().from(users).where(eq(users.id, ch.userId)).limit(1);
    if (!user?.totpSecret) throw new HttpError(401, "defi_expire", "La vérification a expiré. Reprenez la connexion.");
    let ok = false;
    if (b.code.includes("-")) {
      const used = await db
        .update(recoveryCodes)
        .set({ usedAt: now })
        .where(and(eq(recoveryCodes.userId, user.id), eq(recoveryCodes.codeHash, sha256(b.code)), isNull(recoveryCodes.usedAt)))
        .returning();
      ok = used.length === 1;
    } else ok = verifyTotp(decrypt(ctx.env.encryptionKey, user.totpSecret), b.code, now.getTime());
    if (!ok) {
      await db
        .update(loginChallenges)
        .set({ attempts: ch.attempts + 1 })
        .where(eq(loginChallenges.idHash, ch.idHash));
      await audit(ctx, req, "double authentification", user.email, "refus", null, user);
      throw new HttpError(401, "code_invalide", b.code.includes("-") ? "Code de secours inconnu ou déjà utilisé." : "Code incorrect. Vérifiez l’heure de votre téléphone et réessayez.");
    }
    await db.delete(loginChallenges).where(eq(loginChallenges.idHash, ch.idHash));
    await createSession(ctx, req, reply, user, ch.remember);
    await audit(ctx, req, b.code.includes("-") ? "connexion (code de secours)" : "connexion (double authentification)", user.email, "succes", null);
    return sessionUser(ctx, req);
  });

  app.post("/auth/logout", async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
    if (req.user) await audit(ctx, req, "déconnexion", "session");
    clearSessionCookies(ctx, reply);
    return reply.status(204).send();
  });

  /** Même réponse que le compte existe ou non : pas d'énumération des adresses. */
  app.post("/auth/forgot", { config: { rateLimit: { max: 5, timeWindow: "15 minutes" } } }, async (req, reply) => {
    const b = parse(forgotSchema, req.body);
    const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${b.email}`).limit(1);
    if (user?.passwordHash) {
      const token = randomToken();
      await db.insert(passwordResets).values({ tokenHash: sha256(token), userId: user.id, expiresAt: new Date(ctx.now().getTime() + 30 * MIN) });
      await ctx.sms.send(user.phone, `SaytuMbay : pour choisir un nouveau mot de passe, ouvrez ${ctx.env.APP_URL}/reinitialiser?jeton=${token} (valable 30 min). Ignorez ce message si vous n’avez rien demandé.`);
      await audit(ctx, req, "réinitialisation demandée", user.email, "succes", null, user);
    }
    return reply.status(204).send();
  });

  app.post("/auth/reset", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (req, reply) => {
    const b = parse(resetSchema, req.body);
    const now = ctx.now();
    const [r] = await db
      .update(passwordResets)
      .set({ usedAt: now })
      .where(and(eq(passwordResets.tokenHash, sha256(b.token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, now)))
      .returning();
    if (!r) throw new HttpError(410, "lien_expire", "Ce lien n’est plus valable. Demandez-en un nouveau.");
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(b.password) })
      .where(eq(users.id, r.userId));
    // Toutes les sessions sont fermées : un mot de passe compromis ne laisse aucune porte ouverte.
    await db.delete(sessions).where(eq(sessions.userId, r.userId));
    await db.delete(loginFailures).where(sql`${loginFailures.email} = (select lower(email) from users where id = ${r.userId})`);
    await audit(ctx, req, "mot de passe réinitialisé", r.userId, "succes", null, null);
    return reply.status(204).send();
  });

  async function findInvite(token: string) {
    if (token.length < 32 || token.length > 256) return null;
    const [row] = await db
      .select({ i: invites, u: users, o: organizations })
      .from(invites)
      .innerJoin(users, eq(users.id, invites.userId))
      .innerJoin(organizations, eq(organizations.id, invites.orgId))
      .where(and(eq(invites.tokenHash, sha256(token)), isNull(invites.acceptedAt), gt(invites.expiresAt, ctx.now())))
      .limit(1);
    return row ?? null;
  }

  app.get("/auth/invite/:token", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req) => {
    const row = await findInvite((req.params as { token: string }).token);
    if (!row) throw new HttpError(404, "invitation_invalide", "Cette invitation a expiré ou a déjà été utilisée. Demandez un nouveau lien au responsable de votre organisation.");
    const [by] = await db.select().from(users).where(eq(users.id, row.i.invitedBy)).limit(1);
    return { orgName: row.o.name, email: row.u.email, phone: row.u.phone, role: row.i.role, firstName: row.u.firstName, lastName: row.u.lastName, invitedBy: by ? `${by.firstName} ${by.lastName}` : "Votre organisation" };
  });

  app.post("/auth/invite/accept", strict, async (req, reply) => {
    const b = parse(acceptInviteSchema, req.body);
    const row = await findInvite(b.token);
    if (!row) throw new HttpError(404, "invitation_invalide", "Cette invitation a expiré ou a déjà été utilisée.");
    const now = ctx.now();
    await db.update(invites).set({ acceptedAt: now }).where(eq(invites.tokenHash, row.i.tokenHash));
    await db
      .update(users)
      .set({ firstName: b.firstName, lastName: b.lastName, passwordHash: await hashPassword(b.password) })
      .where(eq(users.id, row.u.id));
    await db
      .update(memberships)
      .set({ status: "actif" })
      .where(and(eq(memberships.userId, row.u.id), eq(memberships.orgId, row.i.orgId)));
    const [user] = await db.select().from(users).where(eq(users.id, row.u.id)).limit(1);
    await createSession(ctx, req, reply, user!, false, row.i.orgId);
    await audit(ctx, req, "invitation acceptée", user!.email, "succes", row.i.orgId);
    return sessionUser(ctx, req);
  });

  app.post("/auth/demo", strict, async (req, reply) => {
    if (!ctx.env.demoLogin) throw new HttpError(404, "introuvable", "Ressource introuvable.");
    const persona = parse(z.object({ persona: z.enum(["responsable", "technicien", "admin"]) }), req.body).persona;
    const id = { responsable: "u-awa", technicien: "u-ibou", admin: "u-mame" }[persona];
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!user) throw new HttpError(404, "introuvable", "Profil de démonstration absent : lancez l’API avec SEED_DEMO=true sur une base vide.");
    await createSession(ctx, req, reply, user, false);
    await audit(ctx, req, "connexion (accès démo)", persona, "succes", null);
    return sessionUser(ctx, req);
  });

  /* ——— Compte ——— */

  app.post("/me/org", async (req) => {
    const { user, session } = needUser(req);
    const orgId = parse(z.object({ orgId: z.string().min(1).max(80) }), req.body).orgId;
    const [m] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, user.id), eq(memberships.orgId, orgId), ne(memberships.status, "desactive")))
      .limit(1);
    if (!m) throw new HttpError(403, "interdit", "Vous n’êtes pas membre de cette organisation.");
    await db.update(sessions).set({ activeOrgId: orgId }).where(eq(sessions.tokenHash, session.tokenHash));
    req.session = { ...session, activeOrgId: orgId };
    return sessionUser(ctx, req);
  });

  app.patch("/me/profile", async (req) => {
    const { user } = needUser(req);
    const b = parse(profileSchema, req.body);
    await db
      .update(users)
      .set({ firstName: b.firstName, lastName: b.lastName, phone: toE164(b.phone), locale: b.locale })
      .where(eq(users.id, user.id));
    req.user = { ...user, firstName: b.firstName, lastName: b.lastName, phone: toE164(b.phone), locale: b.locale };
    await audit(ctx, req, "profil modifié", user.email);
    return sessionUser(ctx, req);
  });

  app.put("/me/password", strict, async (req, reply) => {
    const { user, session } = needUser(req);
    const b = parse(changePasswordSchema, req.body);
    if (!(await verifyPassword(user.passwordHash, b.current))) throw new HttpError(422, "validation", "Mot de passe actuel incorrect.", { fields: { current: "Mot de passe actuel incorrect" } });
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(b.password) })
      .where(eq(users.id, user.id));
    await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.tokenHash, session.tokenHash)));
    await audit(ctx, req, "mot de passe modifié", user.email);
    return reply.status(204).send();
  });

  app.put("/me/notifications", async (req, reply) => {
    const c = await resolveCtx(ctx, req, true);
    const b = parse(notifySchema, req.body);
    await db
      .update(memberships)
      .set({ notify: b })
      .where(and(eq(memberships.userId, c.user.id), eq(memberships.orgId, c.orgId)));
    return reply.status(204).send();
  });

  app.post("/me/totp/setup", strict, async (req) => {
    const { user } = needUser(req);
    const secret = newTotpSecret();
    await db
      .update(users)
      .set({ totpPending: encrypt(ctx.env.encryptionKey, secret) })
      .where(eq(users.id, user.id));
    return { secret, otpauth: `otpauth://totp/SaytuMbay:${encodeURIComponent(user.email)}?secret=${secret}&issuer=SaytuMbay&digits=6&period=30` };
  });

  app.post("/me/totp/enable", strict, async (req) => {
    const { user, session } = needUser(req);
    const code = parse(z.object({ code: z.string().trim().regex(/^\d{6}$/, "Code à 6 chiffres") }), req.body).code;
    if (!user.totpPending) throw new HttpError(409, "pas_de_configuration", "Recommencez la configuration de la double authentification.");
    const secret = decrypt(ctx.env.encryptionKey, user.totpPending);
    if (!verifyTotp(secret, code, ctx.now().getTime())) throw new HttpError(422, "validation", "Code incorrect.", { fields: { code: "Code incorrect : vérifiez l’heure de votre téléphone" } });
    const codes = newRecoveryCodes();
    await db
      .update(users)
      .set({ totpSecret: user.totpPending, totpPending: null, twoFactorEnabled: true })
      .where(eq(users.id, user.id));
    await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, user.id));
    await db.insert(recoveryCodes).values(codes.map((c) => ({ userId: user.id, codeHash: sha256(c) })));
    await db.delete(sessions).where(and(eq(sessions.userId, user.id), ne(sessions.tokenHash, session.tokenHash)));
    await audit(ctx, req, "double authentification activée", user.email);
    return { recoveryCodes: codes };
  });

  app.get("/me/sessions", async (req) => {
    const { user, session } = needUser(req);
    const rows = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, ctx.now())));
    return rows
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime())
      .map((s) => ({ id: s.tokenHash.slice(0, 16), current: s.tokenHash === session.tokenHash, device: describeAgent(s.userAgent), ip: s.ip ?? "—", lastSeenAt: s.lastSeenAt.toISOString() }));
  });

  app.delete("/me/sessions/:id", async (req, reply) => {
    const { user, session } = needUser(req);
    const id = (req.params as { id: string }).id;
    if (!/^[0-9a-f]{16}$/.test(id)) throw new HttpError(404, "introuvable", "Session introuvable.");
    if (session.tokenHash.startsWith(id)) throw new HttpError(409, "session_courante", "Utilisez « Se déconnecter » pour fermer la session en cours.");
    const r = await db
      .delete(sessions)
      .where(and(eq(sessions.userId, user.id), like(sessions.tokenHash, `${id}%`)))
      .returning();
    if (!r.length) throw new HttpError(404, "introuvable", "Session introuvable.");
    await audit(ctx, req, "session révoquée", describeAgent(r[0]!.userAgent));
    return reply.status(204).send();
  });
}

function describeAgent(ua: string | null): string {
  if (!ua) return "Appareil inconnu";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "Appareil";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navigateur";
  return `${os} · ${br}`;
}
