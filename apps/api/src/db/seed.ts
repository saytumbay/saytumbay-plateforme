/**
 * Données de démonstration pour l'API (développement, démo en ligne). Reprend le jeu partagé de la démo
 * navigateur, plus un historique : 10 jours de mesures simulées et 6 mois d'irrigations et de factures.
 * N'est appliqué que sur une base vide. Comptes fictifs ; mot de passe commun documenté dans le README.
 */
import { sql } from "drizzle-orm";
import { createSeed, setBatteryTargets, valueAt, WATER_BY_MONTH } from "@saytumbay/shared/demo";
import type { CostLine, Invoice, IrrigationEvent, Metric } from "@saytumbay/shared";
import type { AppContext } from "../context";
import { alerts, appMeta, auditLog, memberships, organizations, recoveryCodes, users, measurements } from "./schema";
import { encrypt, hashPassword, sha256 } from "../lib/crypto";

export const DEMO_PASSWORD = "Demo-SaytuMbay-2026";
/** Secret TOTP du compte console de démonstration (développement uniquement). */
export const DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
export const DEMO_RECOVERY = ["1111-2222", "3333-4444", "5555-6666", "7777-8888"];

const MIN = 60_000;
const D = 24 * 60 * MIN;

export async function seedIfEmpty(ctx: AppContext): Promise<boolean> {
  const n = await ctx.db.execute<{ n: number }>(sql`select count(*)::int as n from organizations`);
  if (Number(n.rows[0]?.n ?? 0) > 0) return false;
  await seedDemo(ctx);
  return true;
}

export async function seedDemo(ctx: AppContext, opts: { historyDays?: number } = {}) {
  const t0 = Date.now();
  const now = ctx.now();
  const s = createSeed(now);
  const anchor = s.now.getTime();
  const r = ctx.repos;
  const db = ctx.db;

  await db.insert(organizations).values(s.organizations.map((o) => ({ id: o.id, name: o.name, type: o.type, region: o.region, locality: o.locality, plan: o.plan, status: o.status, modules: o.modules, createdAt: new Date(o.createdAt), trialEndsAt: o.trialEndsAt ? new Date(o.trialEndsAt) : null })));
  const pw = await hashPassword(DEMO_PASSWORD);
  await db.insert(users).values(
    s.users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      passwordHash: pw,
      platformRole: u.platformRole,
      twoFactorEnabled: u.twoFactorEnabled,
      totpSecret: u.twoFactorEnabled ? encrypt(ctx.env.encryptionKey, DEMO_TOTP_SECRET) : null,
      locale: u.locale,
      createdAt: new Date(u.createdAt),
      lastSeenAt: u.lastSeenAt ? new Date(u.lastSeenAt) : null,
    })),
  );
  for (const u of s.users.filter((x) => x.twoFactorEnabled)) await db.insert(recoveryCodes).values(DEMO_RECOVERY.map((c) => ({ userId: u.id, codeHash: sha256(c) })));
  await db.insert(memberships).values(s.memberships.map((m) => ({ userId: m.userId, orgId: m.orgId, role: m.role, parcels: m.parcels, notify: m.notify, invitedAt: new Date(m.invitedAt), status: m.status })));

  await r.sites.insertMany(s.sites.map((x) => ({ orgId: x.orgId, id: x.id, data: x })));
  await r.parcels.insertMany(s.parcels.map((x) => ({ orgId: x.orgId, id: x.id, data: x })));
  await r.devices.insertMany(s.devices.map((x) => ({ orgId: x.orgId, id: x.id, data: x })));
  await r.pumps.insertMany(s.pumps.map((x) => ({ orgId: x.orgId, id: x.id, data: x })));
  await r.valves.insertMany(s.valves.map((x) => ({ orgId: x.orgId, id: x.id, data: x })));
  const orgOfParcel = (pid: string) => s.parcels.find((p) => p.id === pid)?.orgId ?? s.organizations[0]!.id;
  await r.rules.insertMany(s.rules.map((x) => ({ orgId: orgOfParcel(x.parcelId), id: x.parcelId, data: x, ref: x.parcelId })));
  await r.schedules.insertMany(s.schedules.map((x) => ({ orgId: orgOfParcel(x.parcelId), id: x.id, data: x, ref: x.parcelId })));

  // Historique d'irrigation : volumes mensuels du jeu partagé répartis en arrosages de 20 à 30 minutes.
  const events: IrrigationEvent[] = [...s.irrigationEvents];
  for (const [pid, months] of Object.entries(WATER_BY_MONTH)) {
    months.forEach((m3, i) => {
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months.length - 1 - i), 1));
      const daysInMonth = i === months.length - 1 ? Math.max(1, now.getUTCDate() - 1) : 28;
      let liters = Math.round(m3 * 1000);
      let k = 0;
      while (liters > 0 && k < 60) {
        const l = Math.min(liters, 112 + ((k * 37) % 56));
        const at = new Date(monthStart.getTime() + ((k * 3) % daysInMonth) * D + (6 * 60 + ((k * 13) % 50)) * MIN);
        if (at < now) events.push({ id: `ie-h-${pid}-${i}-${k}`, parcelId: pid, kind: "terminee", trigger: k % 4 === 0 ? "programmee" : "automatique", at: at.toISOString(), durationMin: Math.round(l / 5.6), liters: l, by: null, note: "" });
        liters -= l;
        k += 1;
      }
    });
  }
  await r.events.insertMany(events.map((x) => ({ orgId: orgOfParcel(x.parcelId), id: x.id, data: x, ref: x.parcelId })));

  await r.warehouses.insertMany(s.warehouses.map((x) => ({ orgId: x.orgId, id: x.id, data: x })));
  await r.lots.insertMany(s.lots.map((x) => ({ orgId: x.orgId, id: x.id, data: x, ref: x.warehouseId })));
  const orgOfWarehouse = (wid: string) => s.warehouses.find((w) => w.id === wid)?.orgId ?? s.organizations[0]!.id;
  await r.inspections.insertMany(s.inspections.map((x) => ({ orgId: orgOfWarehouse(x.warehouseId), id: x.id, data: x, ref: x.warehouseId })));
  await r.tasks.insertMany(s.tasks.map((x) => ({ orgId: x.orgId, id: x.id, data: x })));

  // Factures : celles du jeu partagé, plus les abonnements payés des mois précédents.
  const invoices: Invoice[] = [...s.invoices];
  let n = 26;
  for (let back = 2; back <= 5; back++) {
    for (const sub of s.subscriptions.filter((x) => x.baseFcfa > 0)) {
      const issued = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1, 9));
      const amount = sub.baseFcfa + sub.perSensorFcfa * Math.max(3, sub.sensors - back);
      invoices.push({ id: `F-2026-${String(n--).padStart(3, "0")}`, orgId: sub.orgId, label: `Abonnement · ${Math.max(3, sub.sensors - back)} capteurs`, amount, paidAmount: amount, issuedAt: issued.toISOString(), dueAt: new Date(issued.getTime() + 10 * D).toISOString(), status: "payee", method: back % 2 ? "wave" : "orange_money", paidAt: new Date(issued.getTime() + 6 * D).toISOString() });
    }
  }
  await r.invoices.insertMany(invoices.map((x) => ({ orgId: x.orgId, id: x.id, data: x })));
  await r.subscriptions.insertMany(s.subscriptions.map((x) => ({ orgId: x.orgId, id: x.orgId, data: x })));
  const costs: CostLine[] = [...s.costLines];
  s.finance.slice(0, -1).forEach((f, i) => costs.push({ id: `c-h-${i}`, month: f.month, category: "autre", label: "Coûts consolidés du mois", detail: "Matériel amorti, hébergement, SMS, terrain", amount: f.costs }));
  await r.costLines.insertMany(costs.map((x) => ({ orgId: "platform", id: x.id, data: x })));
  await r.firmware.insertMany(s.firmware.map((x) => ({ orgId: "platform", id: x.version, data: x })));
  await r.rollouts.insertMany(s.rollouts.map((x) => ({ orgId: "platform", id: x.id, data: x })));

  await db.insert(auditLog).values(s.audit.map((a) => ({ at: new Date(a.at), actorId: a.actorId, actorLabel: a.actorLabel, orgId: a.orgId, action: a.action, target: a.target, ip: a.ip, outcome: a.outcome })));
  if (s.alertsHistory.length)
    await db.insert(alerts).values(
      s.alertsHistory.map((a) => ({ id: a.id, orgId: a.orgId, key: `hist-${a.id}`, module: a.module, kind: a.kind, severity: a.severity, status: a.status, title: a.title, detail: a.detail, source: a.source, notifications: a.notifications, createdAt: new Date(a.createdAt), acknowledgedBy: a.acknowledgedBy, acknowledgedAt: a.acknowledgedAt ? new Date(a.acknowledgedAt) : null, resolvedAt: a.resolvedAt ? new Date(a.resolvedAt) : null })),
    );

  // Mesures simulées sur l'historique (30 min ; 6 h pour les mesures lentes du sol).
  setBatteryTargets(Object.fromEntries(s.devices.filter((d) => d.battery != null).map((d) => [d.id, d.battery!])));
  const days = opts.historyDays ?? 10;
  const SOIL_FAST: Metric[] = ["soilMoisture", "soilTemp", "battery"];
  const SOIL_SLOW: Metric[] = ["ec", "ph", "n", "p", "k"];
  const AIR: Metric[] = ["airTemp", "airHumidity", "co2", "gas", "battery"];
  const rows: Array<typeof measurements.$inferInsert> = [];
  const end = Math.floor(now.getTime() / (30 * MIN)) * 30 * MIN;
  for (const d of s.devices.filter((x) => x.kind !== "passerelle")) {
    for (let t = end - days * D; t <= end; t += 30 * MIN) {
      const metrics = d.kind === "sol" ? [...SOIL_FAST, ...(t % (6 * 60 * MIN) === 0 ? SOIL_SLOW : [])] : AIR;
      for (const m of metrics) {
        const v = valueAt(d.id, m, t, anchor);
        if (v != null) rows.push({ deviceId: d.id, metric: m, ts: new Date(t), value: Math.round(v * 10) / 10 });
      }
    }
  }
  for (let i = 0; i < rows.length; i += 2000) await db.insert(measurements).values(rows.slice(i, i + 2000)).onConflictDoNothing();
  await db.insert(appMeta).values({ key: "demo_anchor", value: anchor }).onConflictDoUpdate({ target: appMeta.key, set: { value: anchor } });
  ctx.log.info({ measurements: rows.length, ms: Date.now() - t0 }, "données de démonstration créées");
}
