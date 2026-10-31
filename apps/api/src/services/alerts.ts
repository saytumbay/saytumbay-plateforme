/**
 * Moteur d'alertes : à partir de l'état courant d'une organisation, ouvre les alertes nouvelles
 * (et prévient par SMS les bonnes personnes), met à jour celles qui persistent et clôt celles dont
 * la cause a disparu. Une cause = une clé stable : jamais deux alertes ouvertes pour la même chose.
 */
import { and, desc, eq, gt, ne, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { ADVICE, alertKey, computeAlertCandidates, smsText, type Alert } from "@saytumbay/shared";
import type { AppContext } from "../context";
import { alerts, memberships, organizations, users } from "../db/schema";
import { orgState, type OrgState } from "./state";

type Row = typeof alerts.$inferSelect;

export function toAlert(r: Row): Alert {
  return {
    id: r.id,
    orgId: r.orgId,
    module: r.module,
    kind: r.kind,
    severity: r.severity,
    title: r.title,
    detail: r.detail,
    advice: ADVICE[r.kind],
    source: r.source,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    acknowledgedBy: r.acknowledgedBy,
    acknowledgedAt: r.acknowledgedAt?.toISOString() ?? null,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
    notifications: r.notifications,
  };
}

const SEV = { critique: 3, attention: 2, info: 1 } as const;

export async function listAlerts(ctx: AppContext, orgId: string, opts: { module?: string; status?: string } = {}): Promise<Alert[]> {
  const since = new Date(ctx.now().getTime() - 30 * 24 * 3600_000);
  const rows = await ctx.db
    .select()
    .from(alerts)
    .where(and(eq(alerts.orgId, orgId), sql`(${alerts.status} <> 'resolue' or ${alerts.resolvedAt} > ${since.toISOString()}::timestamptz)`))
    .orderBy(desc(alerts.createdAt))
    .limit(300);
  return rows
    .map(toAlert)
    .filter((a) => (!opts.module || a.module === opts.module) && (!opts.status || a.status === opts.status))
    .sort((a, b) => Number(a.status === "resolue") - Number(b.status === "resolue") || SEV[b.severity] - SEV[a.severity] || b.createdAt.localeCompare(a.createdAt));
}

/** Destinataires des SMS : responsable de la parcelle, techniciens pour le matériel, responsables pour le stockage. */
async function recipients(ctx: AppContext, orgId: string, a: Pick<Alert, "kind" | "source" | "module">, st: OrgState) {
  const rows = await ctx.db
    .select({ u: users, m: memberships })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.status, "actif")));
  const wantsSms = rows.filter((r) => r.m.notify.sms);
  if (a.kind === "capteur_hors_ligne" || a.kind === "batterie_faible") return wantsSms.filter((r) => r.m.role === "technicien" || r.m.role === "responsable").map((r) => r.u);
  if (a.source.type === "parcelle") {
    const p = st.parcels.find((x) => x.id === a.source.id);
    const resp = wantsSms.find((r) => r.u.id === p?.responsibleId);
    return resp ? [resp.u] : wantsSms.filter((r) => r.m.role === "responsable").map((r) => r.u);
  }
  return wantsSms.filter((r) => r.m.role === "responsable" || r.m.role === "proprietaire").map((r) => r.u);
}

export async function syncAlerts(ctx: AppContext, orgId: string, preloaded?: OrgState): Promise<void> {
  const st = preloaded ?? (await orgState(ctx, orgId));
  const now = ctx.now();
  const cands = computeAlertCandidates(
    {
      parcels: st.parcelSnaps,
      devices: st.devices,
      warehouses: st.warehouseSnaps,
      parcelCode: (id) => st.parcels.find((p) => p.id === id)?.code,
      warehouseName: (id) => st.warehouses.find((w) => w.id === id)?.name,
    },
    now,
  );
  const open = await ctx.db
    .select()
    .from(alerts)
    .where(and(eq(alerts.orgId, orgId), ne(alerts.status, "resolue")));
  const byKey = new Map(open.map((a) => [a.key, a]));
  const seen = new Set<string>();
  const [org] = await ctx.db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const short = (org?.name ?? "SaytuMbay").replace(/^Coopérative( de)?/i, "Coop.").slice(0, 24);

  for (const c of cands) {
    const key = alertKey(c);
    seen.add(key);
    const cur = byKey.get(key);
    if (cur) {
      if (cur.title !== c.title || cur.detail !== c.detail || cur.severity !== c.severity) await ctx.db.update(alerts).set({ title: c.title, detail: c.detail, severity: c.severity }).where(eq(alerts.id, cur.id));
      continue;
    }
    // Anti-rebond : une cause résolue il y a moins de 2 h est rouverte sans nouveau SMS.
    const [recent] = await ctx.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.orgId, orgId), eq(alerts.key, key), eq(alerts.status, "resolue"), gt(alerts.resolvedAt, new Date(now.getTime() - 2 * 3600_000))))
      .orderBy(desc(alerts.resolvedAt))
      .limit(1);
    if (recent) {
      await ctx.db.update(alerts).set({ status: "ouverte", resolvedAt: null, title: c.title, detail: c.detail, severity: c.severity }).where(eq(alerts.id, recent.id));
      continue;
    }
    const notifications: Alert["notifications"] = [];
    if (c.severity !== "info") {
      for (const u of await recipients(ctx, orgId, c, st)) {
        const delivered = await ctx.sms.send(u.phone, smsText({ title: c.title, kind: c.kind }, short), orgId);
        notifications.push({ channel: "sms", to: u.phone, at: now.toISOString(), delivered });
      }
    }
    await ctx.db
      .insert(alerts)
      .values({ id: `al-${randomUUID()}`, orgId, key, module: c.module, kind: c.kind, severity: c.severity, status: "ouverte", title: c.title, detail: c.detail, source: c.source, notifications, createdAt: now })
      .onConflictDoNothing();
  }

  for (const a of open) {
    if (seen.has(a.key) || a.kind === "stock_controle" || a.kind === "irrigation_annulee") continue;
    await ctx.db.update(alerts).set({ status: "resolue", resolvedAt: now }).where(eq(alerts.id, a.id));
  }
}
