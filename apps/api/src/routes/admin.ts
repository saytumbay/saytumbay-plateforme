/**
 * Console de l'équipe SaytuMbay : clients, parc et mises à jour, facturation, coûts, utilisateurs, journal.
 * Accès : rôle plateforme + double authentification active (voir `needPlatform`).
 */
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { can, deviceStatus, fmt, markPaidSchema, rolloutSchema, type AdminOrgRow, type Device, type MonthlyFinance, type Rollout } from "@saytumbay/shared";
import type { AppContext } from "../context";
import { auditLog, memberships, organizations, users } from "../db/schema";
import { HttpError, notFound, parse } from "../lib/errors";
import { audit, needPlatform } from "../plugins/auth";
import { orgState } from "../services/state";
import { monthKeys } from "./agritech";

const PLATFORM = "platform";

export function adminRoutes(app: FastifyInstance, ctx: AppContext) {
  const r = ctx.repos;
  const db = ctx.db;

  async function allDevices(): Promise<Device[]> {
    const now = ctx.now();
    return (await r.devices.listAll()).map(({ data: d }) => ({ ...d, status: d.status === "maintenance" ? "maintenance" : deviceStatus(d, now) }));
  }

  async function orgRows(): Promise<AdminOrgRow[]> {
    const [orgs, devs, subs, parcels, whs] = await Promise.all([db.select().from(organizations), allDevices(), r.subscriptions.listAll(), r.parcels.listAll(), r.warehouses.listAll()]);
    const members = await db.execute<{ org_id: string; n: number }>(sql`select org_id, count(*)::int as n from memberships where status <> 'desactive' group by org_id`);
    const last = await db.execute<{ org_id: string; at: string | Date }>(sql`select org_id, max(at) as at from audit_log where org_id is not null group by org_id`);
    return orgs.map((o) => {
      const sub = subs.find((s) => s.orgId === o.id)?.data;
      const at = last.rows.find((x) => x.org_id === o.id)?.at;
      return {
        id: o.id,
        name: o.name,
        type: o.type,
        region: o.region,
        locality: o.locality,
        plan: o.plan,
        status: o.status,
        modules: o.modules,
        createdAt: o.createdAt.toISOString(),
        trialEndsAt: o.trialEndsAt?.toISOString() ?? null,
        devices: devs.filter((d) => d.orgId === o.id && d.kind !== "passerelle").length,
        offline: devs.filter((d) => d.orgId === o.id && d.status === "hors_ligne").length,
        members: Number(members.rows.find((x) => x.org_id === o.id)?.n ?? 0),
        parcels: parcels.filter((p) => p.orgId === o.id).length,
        warehouses: whs.filter((w) => w.orgId === o.id).length,
        mrr: sub ? sub.baseFcfa + sub.perSensorFcfa * sub.sensors : 0,
        lastActivityAt: at ? new Date(at).toISOString() : null,
      };
    });
  }

  async function finance(): Promise<MonthlyFinance[]> {
    const [inv, costs] = await Promise.all([r.invoices.listAll(), r.costLines.listAll()]);
    return monthKeys(ctx.now(), 6).map((month) => ({
      month,
      billed: inv.filter(({ data: i }) => i.issuedAt.startsWith(month) && i.status !== "annulee").reduce((a, { data: i }) => a + i.amount, 0),
      collected: inv.filter(({ data: i }) => i.paidAt?.startsWith(month)).reduce((a, { data: i }) => a + i.paidAmount, 0),
      costs: costs.filter(({ data: c }) => c.month === month).reduce((a, { data: c }) => a + c.amount, 0),
    }));
  }

  app.get("/admin/overview", async (req) => {
    await needPlatform(ctx, req, "admin:clients");
    const devs = (await allDevices()).filter((d) => d.kind !== "passerelle");
    const fw = (await r.firmware.list(PLATFORM)).sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
    const latest = fw[0]?.version ?? "—";
    const subs = await r.subscriptions.listAll();
    const inv = await r.invoices.listAll();
    const monthStart = new Date(Date.UTC(ctx.now().getUTCFullYear(), ctx.now().getUTCMonth(), 1));
    const [{ n: sms } = { n: 0 }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from sms_log where at >= ${monthStart.toISOString()}::timestamptz`)).rows;
    return {
      orgs: (await db.select({ id: organizations.id }).from(organizations)).length,
      devices: { installed: devs.length, online: devs.filter((d) => d.status !== "hors_ligne").length, offline: devs.filter((d) => d.status === "hors_ligne").map((d) => d.id) },
      outdated: devs.filter((d) => d.kind === "sol" && d.firmware !== latest).length,
      latestFirmware: latest,
      mrr: subs.reduce((a, { data: s }) => a + s.baseFcfa + s.perSensorFcfa * s.sensors, 0),
      openInvoices: inv.filter(({ data: i }) => i.status !== "payee" && i.status !== "annulee").length,
      overdue: inv.filter(({ data: i }) => i.status === "en_retard").length,
      smsMonth: Number(sms),
    };
  });

  app.get("/admin/orgs", async (req) => {
    await needPlatform(ctx, req, "admin:clients");
    return orgRows();
  });

  app.get("/admin/orgs/:id", async (req) => {
    const user = await needPlatform(ctx, req, "admin:clients");
    const id = (req.params as { id: string }).id;
    const org = (await orgRows()).find((o) => o.id === id);
    if (!org) throw notFound("Client introuvable.");
    const billing = can("admin:facturation", { platformRole: user.platformRole });
    const st = await orgState(ctx, id);
    const rows = await db
      .select({ u: users, m: memberships })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.orgId, id), ne(memberships.status, "desactive")));
    await audit(ctx, req, "fiche client consultée", org.name, "succes", null);
    return {
      org,
      subscription: (await r.subscriptions.get(id, id)) ?? (await r.subscriptions.list(id))[0] ?? null,
      invoices: billing ? (await r.invoices.list(id)).sort((a, b) => b.id.localeCompare(a.id)) : [],
      devices: st.rows,
      members: rows.map(({ u, m }) => ({
        user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, lastSeenAt: u.lastSeenAt?.toISOString() ?? null, twoFactorEnabled: u.twoFactorEnabled },
        membership: { userId: m.userId, orgId: m.orgId, role: m.role, parcels: m.parcels, notify: m.notify, invitedAt: m.invitedAt.toISOString(), status: m.status },
      })),
    };
  });

  /* ——— Parc et mises à jour ——— */

  app.get("/admin/firmware", async (req) => {
    await needPlatform(ctx, req, "admin:firmware");
    const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
    const devs = (await allDevices()).filter((d) => d.kind !== "passerelle");
    const versions = [...new Set(devs.map((d) => d.firmware))].sort().reverse();
    const [releases, rollouts] = await Promise.all([r.firmware.list(PLATFORM), r.rollouts.list(PLATFORM)]);
    const all = await r.devices.listAll();
    const st = new Map<string, Awaited<ReturnType<typeof orgState>>>();
    for (const o of orgs) st.set(o.id, await orgState(ctx, o.id));
    return {
      releases: releases.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt)),
      rollouts: rollouts.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      devicesByVersion: versions.map((v) => ({ version: v, count: devs.filter((d) => d.firmware === v).length })),
      devices: devs.map((d) => ({ id: d.id, orgId: d.orgId, kind: d.kind, firmware: d.firmware, status: d.status, label: `${orgs.find((o) => o.id === d.orgId)?.name ?? ""} · ${st.get(d.orgId)?.rows.find((x) => x.id === d.id)?.label ?? all.find((x) => x.data.id === d.id)?.data.model ?? ""}` })),
    };
  });

  app.post("/admin/rollouts", async (req, reply) => {
    await needPlatform(ctx, req, "admin:firmware");
    const b = parse(rolloutSchema, req.body);
    const releases = await r.firmware.list(PLATFORM);
    if (!releases.some((f) => f.version === b.version)) throw new HttpError(422, "validation", "Version inconnue.");
    const active = (await r.rollouts.list(PLATFORM)).find((x) => x.status === "en_cours" || x.status === "en_pause");
    if (active) throw new HttpError(409, "deja_en_cours", "Un déploiement est déjà en cours : terminez-le ou annulez-le d’abord.");
    const known = new Set((await r.devices.listAll()).map((d) => d.data.id));
    const ids = b.deviceIds.filter((id) => known.has(id));
    if (!ids.length) throw new HttpError(422, "validation", "Aucun capteur valide dans la liste.");
    const canary = ids.slice(0, Math.max(1, Math.ceil(ids.length * 0.1)));
    const ro: Rollout & { allTargets: string[] } = { id: `ro-${randomUUID().slice(0, 8)}`, version: b.version, startedAt: ctx.now().toISOString(), status: "en_cours", targetDeviceIds: canary, updatedDeviceIds: [], failedDeviceIds: [], stage: "canari", allTargets: ids };
    await r.rollouts.insert(PLATFORM, ro.id, ro);
    await audit(ctx, req, "mise à jour lancée (étape canari)", `${b.version} · ${canary.length} / ${ids.length} capteurs`, "succes", null);
    return reply.status(204).send();
  });

  app.post("/admin/rollouts/:id/:action", async (req, reply) => {
    await needPlatform(ctx, req, "admin:firmware");
    const { id, action } = parse(z.object({ id: z.string().max(40), action: z.enum(["pause", "reprendre", "annuler", "generaliser"]) }), req.params);
    const ro = (await r.rollouts.get(PLATFORM, id)) as (Rollout & { allTargets?: string[] }) | null;
    if (!ro) throw notFound("Déploiement introuvable.");
    if (ro.status === "termine" || ro.status === "annule") throw new HttpError(409, "termine", "Ce déploiement est terminé.");
    let patch: Partial<Rollout> = {};
    if (action === "pause") patch = { status: "en_pause" };
    if (action === "reprendre") patch = { status: "en_cours" };
    if (action === "annuler") patch = { status: "annule" };
    if (action === "generaliser") {
      if (ro.stage !== "canari") throw new HttpError(409, "deja_general", "Ce déploiement est déjà généralisé.");
      const devs = await allDevices();
      const all = ro.allTargets ?? devs.filter((d) => d.kind === "sol" && d.firmware !== ro.version).map((d) => d.id);
      patch = { targetDeviceIds: [...new Set([...ro.updatedDeviceIds, ...all])], stage: "general", status: "en_cours", startedAt: ctx.now().toISOString(), failedDeviceIds: [] };
    }
    await r.rollouts.update(PLATFORM, id, patch);
    await audit(ctx, req, `mise à jour : ${action}`, ro.version, "succes", null);
    return reply.status(204).send();
  });

  /* ——— Facturation ——— */

  app.get("/admin/billing", async (req) => {
    await needPlatform(ctx, req, "admin:facturation");
    const orgs = await db.select({ id: organizations.id, name: organizations.name }).from(organizations);
    const name = (id: string) => orgs.find((o) => o.id === id)?.name ?? "—";
    const subs = await r.subscriptions.listAll();
    return {
      invoices: (await r.invoices.listAll()).map(({ data: i }) => ({ ...i, orgName: name(i.orgId) })).sort((a, b) => b.id.localeCompare(a.id)),
      subscriptions: subs.map(({ data: s }) => ({ ...s, orgName: name(s.orgId) })),
      finance: await finance(),
      mrr: subs.reduce((a, { data: s }) => a + s.baseFcfa + s.perSensorFcfa * s.sensors, 0),
    };
  });

  app.post("/admin/invoices/:id/pay", async (req, reply) => {
    await needPlatform(ctx, req, "admin:facturation");
    const id = (req.params as { id: string }).id;
    const b = parse(markPaidSchema, req.body);
    const found = await r.invoices.find(id);
    if (!found) throw notFound("Facture introuvable.");
    const i = found.data;
    if (i.status === "payee" || i.status === "annulee") throw new HttpError(409, "deja_payee", "Cette facture est déjà réglée ou annulée.");
    const rest = i.amount - i.paidAmount;
    if (b.amount > rest) throw new HttpError(422, "validation", "Montant supérieur au reste à encaisser.", { fields: { amount: `Au plus ${fmt.fcfa(rest)}` } });
    const paidAmount = i.paidAmount + b.amount;
    await r.invoices.update(found.orgId, id, { paidAmount, status: paidAmount >= i.amount ? "payee" : "partielle", method: b.method, paidAt: ctx.now().toISOString() });
    await audit(ctx, req, "paiement enregistré", `${id} · ${fmt.fcfa(b.amount)} · ${b.method}`, "succes", null);
    return reply.status(204).send();
  });

  app.post("/admin/invoices/:id/remind", { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, async (req) => {
    await needPlatform(ctx, req, "admin:facturation");
    const id = (req.params as { id: string }).id;
    const found = await r.invoices.find(id);
    if (!found) throw notFound("Facture introuvable.");
    const i = found.data;
    if (i.status === "payee" || i.status === "annulee") throw new HttpError(409, "deja_payee", "Cette facture est déjà réglée.");
    // Pas plus d'une relance par facture et par jour.
    const since = new Date(ctx.now().getTime() - 24 * 3600_000);
    const recent = await db
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(and(eq(auditLog.action, "relance envoyée"), eq(auditLog.target, id), gte(auditLog.at, since)))
      .limit(1);
    if (recent.length) throw new HttpError(429, "relance_recente", "Une relance a déjà été envoyée pour cette facture aujourd’hui.");
    const [owner] = await db
      .select({ u: users })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.orgId, i.orgId), eq(memberships.status, "actif")))
      .orderBy(sql`case ${memberships.role} when 'proprietaire' then 0 when 'responsable' then 1 else 2 end`)
      .limit(1);
    if (!owner) throw new HttpError(409, "sans_contact", "Aucun contact actif pour ce client.");
    const text = `SaytuMbay : la facture ${i.id} (${fmt.fcfa(i.amount - i.paidAmount)}) arrive à échéance le ${fmt.date(i.dueAt)}. Paiement par Wave ou Orange Money au 77 833 57 81. Merci.`;
    await ctx.sms.send(owner.u.phone, text, i.orgId);
    await audit(ctx, req, "relance envoyée", id, "succes", null);
    return { sms: text };
  });

  /* ——— Coûts ——— */

  app.get("/admin/costs", async (req) => {
    await needPlatform(ctx, req, "admin:couts");
    const month = monthKeys(ctx.now(), 1)[0]!;
    const all = await r.costLines.listAll();
    const lines = all.map((x) => x.data).filter((c) => c.month === month);
    const devs = (await allDevices()).filter((d) => d.kind === "sol");
    const subs = (await r.subscriptions.listAll()).map((x) => x.data);
    const paying = subs.filter((s) => s.plan !== "essai");
    const sensorsPaying = paying.reduce((a, s) => a + s.sensors, 0);
    // Coût direct par capteur payant : capteurs amortis + SMS. Passerelles, serveur, 4G et terrain sont des coûts fixes.
    const direct = lines.filter((l) => (l.category === "materiel" && /capteur/i.test(l.label)) || l.category === "sms").reduce((a, l) => a + l.amount, 0);
    return { lines, finance: await finance(), sensorsInstalled: devs.length, sensorsPaying, fixedRevenue: paying.reduce((a, s) => a + s.baseFcfa, 0), variablePerSensor: devs.length ? Math.round(direct / Math.max(1, sensorsPaying)) : 0 };
  });

  /* ——— Utilisateurs et journal ——— */

  app.get("/admin/users", async (req) => {
    await needPlatform(ctx, req, "admin:utilisateurs");
    const [us, ms, orgs] = await Promise.all([db.select().from(users), db.select().from(memberships).where(ne(memberships.status, "desactive")), db.select({ id: organizations.id, name: organizations.name }).from(organizations)]);
    return us.map((u) => ({
      user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, platformRole: u.platformRole, twoFactorEnabled: u.twoFactorEnabled, locale: u.locale, createdAt: u.createdAt.toISOString(), lastSeenAt: u.lastSeenAt?.toISOString() ?? null },
      orgs: ms.filter((m) => m.userId === u.id).map((m) => ({ id: m.orgId, name: orgs.find((o) => o.id === m.orgId)?.name ?? "", role: m.role })),
    }));
  });

  app.get("/admin/audit", async (req) => {
    await needPlatform(ctx, req, "admin:audit");
    const rows = await db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(500);
    return rows.map((a) => ({ id: String(a.id), at: a.at.toISOString(), actorId: a.actorId, actorLabel: a.actorLabel, orgId: a.orgId, action: a.action, target: a.target, ip: a.ip, outcome: a.outcome }));
  });

}
