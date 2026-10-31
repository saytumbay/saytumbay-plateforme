/** Alertes, tâches, membres, rapports, recherche et formulaire de contact. */
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { alertActionSchema, canAssignRole, contactSchema, fmt, inviteSchema, taskSchema, taskStatusSchema, updateMemberSchema, type SearchHit, type Task } from "@saytumbay/shared";
import type { AppContext } from "../context";
import { alerts, contactMessages, invites, memberships, organizations, users } from "../db/schema";
import { randomToken, sha256 } from "../lib/crypto";
import { conflict, forbidden, HttpError, notFound, parse } from "../lib/errors";
import { audit, need, resolveCtx } from "../plugins/auth";
import { listAlerts, toAlert } from "../services/alerts";
import { memberScope, orgState, visibleParcelIds } from "../services/state";
import { litersToM3 } from "./agritech";

const MIN = 60_000;
const D = 24 * 60 * MIN;
const toE164 = (p: string) => (p.startsWith("+") ? p : `+221${p.replace(/^00221/, "")}`);
const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

async function memberRow(ctx: AppContext, orgId: string, userId: string) {
  const [row] = await ctx.db
    .select({ u: users, m: memberships })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)))
    .limit(1);
  return row ?? null;
}

const toMember = ({ u, m }: { u: typeof users.$inferSelect; m: typeof memberships.$inferSelect }) => ({
  user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, lastSeenAt: u.lastSeenAt?.toISOString() ?? null, twoFactorEnabled: u.twoFactorEnabled },
  membership: { userId: m.userId, orgId: m.orgId, role: m.role, parcels: m.parcels, notify: m.notify, invitedAt: m.invitedAt.toISOString(), status: m.status },
});

/** Saisons : sèche de novembre à juin, hivernage de juillet à octobre. */
export function seasons(now: Date) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const list: Array<{ label: string; from: Date; to: Date }> = [];
  let dryStart = m >= 11 ? y : y - 1;
  if (m >= 7 && m <= 10) list.push({ label: `Hivernage ${y}`, from: new Date(Date.UTC(y, 6, 1)), to: new Date(Date.UTC(y, 10, 1)) });
  for (let i = 0; list.length < 3; i++) {
    list.push({ label: `Saison sèche ${dryStart}-${dryStart + 1}`, from: new Date(Date.UTC(dryStart, 10, 1)), to: new Date(Date.UTC(dryStart + 1, 6, 1)) });
    if (list.length < 3) list.push({ label: `Hivernage ${dryStart}`, from: new Date(Date.UTC(dryStart, 6, 1)), to: new Date(Date.UTC(dryStart, 10, 1)) });
    dryStart -= 1;
  }
  return list.slice(0, 3);
}

export function workRoutes(app: FastifyInstance, ctx: AppContext) {
  const r = ctx.repos;
  const db = ctx.db;

  /* ——— Alertes ——— */

  app.get("/alerts", async (req) => {
    const c = await need(ctx, req, "alertes:lire");
    const q = parse(z.object({ module: z.enum(["agritech", "onion"]).optional(), status: z.enum(["ouverte", "prise_en_charge", "resolue"]).optional() }), req.query);
    const list = await listAlerts(ctx, c.orgId, q);
    if (!c.membership || c.membership.parcels === "all") return list;
    const scope = memberScope(c.membership, await orgState(ctx, c.orgId));
    return list.filter(scope.alertVisible);
  });

  app.post("/alerts/:id/action", async (req) => {
    const c = await need(ctx, req, "alertes:traiter");
    const id = (req.params as { id: string }).id;
    const b = parse(alertActionSchema, req.body);
    const [a] = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.orgId, c.orgId), eq(alerts.id, id)))
      .limit(1);
    if (!a) throw notFound("Cette alerte n’existe plus : la situation est peut-être revenue à la normale.");
    const now = ctx.now();
    const patch =
      b.action === "prendre_en_charge"
        ? { status: "prise_en_charge" as const, acknowledgedBy: c.user.id, acknowledgedAt: now }
        : b.action === "resoudre"
          ? { status: "resolue" as const, resolvedAt: now, acknowledgedBy: a.acknowledgedBy ?? c.user.id, acknowledgedAt: a.acknowledgedAt ?? now }
          : { status: "ouverte" as const, resolvedAt: null };
    if (b.action === "rouvrir") {
      const [dup] = await db
        .select({ id: alerts.id })
        .from(alerts)
        .where(and(eq(alerts.orgId, c.orgId), eq(alerts.key, a.key), ne(alerts.status, "resolue")))
        .limit(1);
      if (dup) throw conflict("deja_ouverte", "Une alerte est déjà ouverte pour cette cause.");
    }
    const [row] = await db.update(alerts).set(patch).where(eq(alerts.id, a.id)).returning();
    await audit(ctx, req, `alerte ${b.action === "prendre_en_charge" ? "prise en charge" : b.action === "resoudre" ? "résolue" : "rouverte"}`, a.source.label, "succes", c.orgId);
    return toAlert(row!);
  });

  /* ——— Tâches ——— */

  app.get("/tasks", async (req) => {
    const c = await need(ctx, req, "taches:lire");
    return (await r.tasks.list(c.orgId)).sort((a, b) => a.due.localeCompare(b.due));
  });

  app.post("/tasks", async (req) => {
    const c = await need(ctx, req, "taches:gerer");
    const b = parse(taskSchema, req.body);
    const who = b.assigneeId ? await memberRow(ctx, c.orgId, b.assigneeId) : null;
    if (b.assigneeId && (!who || who.m.status === "desactive")) throw new HttpError(422, "validation", "Membre inconnu.", { fields: { assigneeId: "Choisissez un membre de l’organisation" } });
    const t: Task = { id: `tk-${randomUUID().slice(0, 8)}`, orgId: c.orgId, module: b.module, title: b.title, assigneeId: b.assigneeId, due: b.due, status: "a_faire", link: b.link ?? null, createdAt: ctx.now().toISOString() };
    await r.tasks.insert(c.orgId, t.id, t);
    if (who && who.u.id !== c.user.id && who.m.notify.sms) await ctx.sms.send(who.u.phone, `SaytuMbay : nouvelle tâche « ${b.title} » pour le ${fmt.date(b.due)}.`, c.orgId);
    await audit(ctx, req, "tâche créée", b.title, "succes", c.orgId);
    return t;
  });

  app.patch("/tasks/:id", async (req) => {
    const c = await need(ctx, req, "taches:gerer");
    const t = await r.tasks.update(c.orgId, (req.params as { id: string }).id, { status: parse(taskStatusSchema, req.body).status });
    if (!t) throw notFound("Tâche introuvable.");
    return t;
  });

  app.delete("/tasks/:id", async (req, reply) => {
    const c = await need(ctx, req, "taches:gerer");
    if (!(await r.tasks.remove(c.orgId, (req.params as { id: string }).id))) throw notFound("Tâche introuvable.");
    return reply.status(204).send();
  });

  /* ——— Membres ——— */

  app.get("/members", async (req) => {
    const c = await need(ctx, req, "membres:lire");
    const rows = await db
      .select({ u: users, m: memberships })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(eq(memberships.orgId, c.orgId), ne(memberships.status, "desactive")));
    return rows.map(toMember);
  });

  app.post("/members/invite", { config: { rateLimit: { max: 20, timeWindow: "1 hour" } } }, async (req) => {
    const c = await need(ctx, req, "membres:gerer");
    const b = parse(inviteSchema, req.body);
    if (!c.role || !canAssignRole(c.role, b.role)) throw forbidden("Vous ne pouvez pas attribuer un rôle supérieur au vôtre.");
    const phone = toE164(b.phone);
    if (b.parcels !== "all") {
      const own = new Set((await r.parcels.list(c.orgId)).map((p) => p.id));
      if (b.parcels.some((p) => !own.has(p))) throw new HttpError(422, "validation", "Parcelle inconnue.", { fields: { parcels: "Parcelle inconnue" } });
    }
    const email = (b.email || `${b.firstName}.${b.lastName}`.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9.]/g, "") + "@invite.saytumbay.com").toLowerCase();
    let [user] = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email} or ${users.phone} = ${phone}`)
      .limit(1);
    if (user && (await memberRow(ctx, c.orgId, user.id))?.m.status === "actif") throw conflict("doublon", "Cette personne est déjà membre.", { phone: "Numéro déjà membre" });
    if (!user) [user] = await db.insert(users).values({ id: `u-${randomUUID().slice(0, 10)}`, firstName: b.firstName, lastName: b.lastName, email, phone }).returning();
    const now = ctx.now();
    await db
      .insert(memberships)
      .values({ userId: user!.id, orgId: c.orgId, role: b.role, parcels: b.parcels, notify: { sms: true, email: false, push: false }, invitedAt: now, status: user!.passwordHash ? "actif" : "invite" })
      .onConflictDoUpdate({ target: [memberships.userId, memberships.orgId], set: { role: b.role, parcels: b.parcels, status: user!.passwordHash ? "actif" : "invite", invitedAt: now } });
    const [org] = await db.select().from(organizations).where(eq(organizations.id, c.orgId)).limit(1);
    if (!user!.passwordHash) {
      const token = randomToken();
      await db.insert(invites).values({ tokenHash: sha256(token), orgId: c.orgId, userId: user!.id, invitedBy: c.user.id, role: b.role, expiresAt: new Date(now.getTime() + 7 * D) });
      await ctx.sms.send(phone, `${c.user.firstName} vous invite sur SaytuMbay (${org?.name}). Créez votre compte : ${ctx.env.APP_URL}/invitation/${token} (valable 7 jours).`, c.orgId);
    } else await ctx.sms.send(phone, `${c.user.firstName} vous a ajouté à ${org?.name} sur SaytuMbay. Connectez-vous : ${ctx.env.APP_URL}/connexion`, c.orgId);
    await audit(ctx, req, "membre invité", `${b.firstName} ${b.lastName} · ${b.role}`, "succes", c.orgId);
    return toMember((await memberRow(ctx, c.orgId, user!.id))!);
  });

  app.patch("/members/:userId", async (req) => {
    const c = await need(ctx, req, "membres:gerer");
    const userId = (req.params as { userId: string }).userId;
    const b = parse(updateMemberSchema, req.body);
    const row = await memberRow(ctx, c.orgId, userId);
    if (!row || row.m.status === "desactive") throw notFound("Membre introuvable.");
    if (userId === c.user.id && b.role) throw forbidden("Vous ne pouvez pas modifier votre propre rôle.");
    if (b.role && (!c.role || !canAssignRole(c.role, b.role) || !canAssignRole(c.role, row.m.role))) throw forbidden("Vous ne pouvez pas attribuer ou retirer un rôle supérieur au vôtre.");
    if (b.role && row.m.role === "proprietaire" && b.role !== "proprietaire") {
      const [{ n }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from memberships where org_id = ${c.orgId} and role = 'proprietaire' and status = 'actif'`)).rows as [{ n: number }];
      if (n <= 1) throw conflict("dernier_proprietaire", "L’organisation doit garder au moins un propriétaire.");
    }
    if (b.parcels && b.parcels !== "all") {
      const own = new Set((await r.parcels.list(c.orgId)).map((p) => p.id));
      if (b.parcels.some((p) => !own.has(p))) throw new HttpError(422, "validation", "Parcelle inconnue.", { fields: { parcels: "Parcelle inconnue" } });
    }
    await db
      .update(memberships)
      .set({ ...(b.role ? { role: b.role } : {}), ...(b.parcels ? { parcels: b.parcels } : {}) })
      .where(and(eq(memberships.orgId, c.orgId), eq(memberships.userId, userId)));
    await audit(ctx, req, "rôle modifié", `${row.u.firstName} ${row.u.lastName} → ${b.role ?? row.m.role}`, "succes", c.orgId);
    return toMember((await memberRow(ctx, c.orgId, userId))!);
  });

  app.delete("/members/:userId", async (req, reply) => {
    const c = await need(ctx, req, "membres:gerer");
    const userId = (req.params as { userId: string }).userId;
    const row = await memberRow(ctx, c.orgId, userId);
    if (!row || row.m.status === "desactive") throw notFound("Membre introuvable.");
    if (userId === c.user.id) throw forbidden("Vous ne pouvez pas vous retirer vous-même.");
    if (c.role && !canAssignRole(c.role, row.m.role)) throw forbidden("Vous ne pouvez pas retirer un membre de rôle supérieur.");
    if (row.m.role === "proprietaire") {
      const [{ n }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from memberships where org_id = ${c.orgId} and role = 'proprietaire' and status = 'actif'`)).rows as [{ n: number }];
      if (n <= 1) throw conflict("dernier_proprietaire", "L’organisation doit garder au moins un propriétaire.");
    }
    await db
      .update(memberships)
      .set({ status: "desactive" })
      .where(and(eq(memberships.orgId, c.orgId), eq(memberships.userId, userId)));
    // Ses sessions restent ouvertes, mais `resolveCtx` refuse désormais l'accès à cette organisation.
    await audit(ctx, req, "membre retiré", `${row.u.firstName} ${row.u.lastName}`, "succes", c.orgId);
    return reply.status(204).send();
  });

  /* ——— Rapports ——— */

  app.get("/reports/agritech", async (req) => {
    const c = await need(ctx, req, "rapports:lire");
    const all = seasons(ctx.now());
    const q = String((req.query as { season?: string }).season ?? "");
    const season = all.find((s) => s.label === q) ?? all[0]!;
    const st = await orgState(ctx, c.orgId);
    const inSeason = (iso: string) => iso >= season.from.toISOString() && iso < season.to.toISOString();
    const months: string[] = [];
    for (let d = new Date(season.from); d < season.to && d <= ctx.now(); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    // Jours sous le seuil sec : minimum journalier de chaque parcelle comparé à sa plage visée.
    const dry = await db.execute<{ parcel: string; day: string; mn: number }>(sql`
      select p.id as parcel, date_trunc('day', m.ts) as day, min(m.value) as mn
      from parcels p, jsonb_array_elements_text(p.data->'sensorIds') s(id)
      join measurements m on m.device_id = s.id and m.metric = 'soilMoisture'
      where p.org_id = ${c.orgId} and m.ts >= ${season.from.toISOString()}::timestamptz and m.ts < ${season.to.toISOString()}::timestamptz
      group by 1, 2`);
    const avg = await db.execute<{ parcel: string; v: number }>(sql`
      select p.id as parcel, avg(m.value) as v
      from parcels p, jsonb_array_elements_text(p.data->'sensorIds') s(id)
      join measurements m on m.device_id = s.id and m.metric = 'soilMoisture'
      where p.org_id = ${c.orgId} and m.ts >= ${season.from.toISOString()}::timestamptz and m.ts < ${season.to.toISOString()}::timestamptz
      group by 1`);
    const dryDays = (pid: string) => {
      const p = st.parcels.find((x) => x.id === pid)!;
      return dry.rows.filter((x) => x.parcel === pid && Number(x.mn) < p.moisture.dry).length;
    };
    const seasonAlerts = await db.execute<{ kind: string; n: number }>(sql`select kind, count(*)::int as n from alerts where org_id = ${c.orgId} and created_at >= ${season.from.toISOString()}::timestamptz and created_at < ${season.to.toISOString()}::timestamptz group by kind`);
    const count = (k: string) => seasonAlerts.rows.filter((x) => x.kind === k).reduce((a, x) => a + Number(x.n), 0);
    const monthRows = months.map((month) => ({ month, used: litersToM3(st.events, (e) => e.at.startsWith(month)), saved: null }));
    return {
      season: season.label,
      seasons: all.map((s) => s.label),
      waterTotalM3: Math.round(monthRows.reduce((a, m) => a + m.used, 0) * 10) / 10,
      savedPct: null,
      daysBelowThreshold: st.parcels.reduce((a, p) => a + dryDays(p.id), 0),
      months: monthRows,
      byParcel: st.parcels.map((p) => {
        const a = avg.rows.find((x) => x.parcel === p.id);
        return { parcelId: p.id, code: p.code, crop: p.crop, m3: litersToM3(st.events, (e) => e.parcelId === p.id && inSeason(e.at)), avgMoisture: a ? Math.round(Number(a.v)) : null, dryDays: a ? dryDays(p.id) : null, color: p.color };
      }),
      alertsCount: { sol_sec: count("sol_sec"), capteur_hors_ligne: count("capteur_hors_ligne"), batterie_faible: count("batterie_faible"), stock: seasonAlerts.rows.filter((x) => x.kind.startsWith("stock_")).reduce((a, x) => a + Number(x.n), 0) },
      irrigations: st.events.filter((e) => e.kind === "lancee" && inSeason(e.at)).length,
    };
  });

  app.get("/reports/onion", async (req) => {
    const c = await need(ctx, req, "rapports:lire");
    const st = await orgState(ctx, c.orgId);
    const ins = await r.inspections.list(c.orgId);
    const sampled = ins.reduce((a, i) => a + i.sampled, 0);
    const week = new Date(ctx.now().getTime() - 7 * D).toISOString();
    const over = await db.execute<{ wid: string; days: number }>(sql`
      select w.id as wid, count(distinct date_trunc('day', m.ts))::int as days
      from warehouses w join devices d on d.org_id = w.org_id and d.data->>'warehouseId' = w.id
      join measurements m on m.device_id = d.id and m.metric = 'airTemp'
      where w.org_id = ${c.orgId} and m.ts >= ${week}::timestamptz and m.value > (w.data->'thresholds'->'temp'->>1)::real
      group by 1`);
    const alertRows = await listAlerts(ctx, c.orgId);
    return {
      stockT: Math.round(st.warehouseSnaps.reduce((a, w) => a + w.stockT, 0) * 10) / 10,
      lossesAvoidedT: null,
      inspections: ins.length,
      damagedRate: sampled ? Math.round((ins.reduce((a, i) => a + i.damaged, 0) / sampled) * 1000) / 10 : 0,
      byWarehouse: st.warehouseSnaps.map((w) => ({ id: w.warehouse.id, name: w.warehouse.name, stockT: w.stockT, risk: w.risk, daysOverThreshold: Number(over.rows.find((x) => x.wid === w.warehouse.id)?.days ?? 0), alerts: alertRows.filter((a) => a.source.id === w.warehouse.id).length })),
    };
  });

  /* ——— Recherche ——— */

  app.get("/search", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (req) => {
    const c = await resolveCtx(ctx, req, false);
    const q = norm(String((req.query as { q?: string }).q ?? "").trim()).slice(0, 60);
    if (!q) return [];
    const hits: SearchHit[] = [];
    if (c.orgId) {
      const st = await orgState(ctx, c.orgId);
      const vis = visibleParcelIds(c.membership, st.parcels);
      for (const p of st.parcels.filter((x) => vis.has(x.id))) if (norm(`${p.name} ${p.crop} ${p.variety ?? ""} ${p.code}`).includes(q)) hits.push({ type: "parcelle", id: p.id, title: p.name, subtitle: `${p.crop} · ${fmt.hectares(p.areaHa)}`, to: `/app/parcelles/${p.id}` });
      for (const d of st.rows) if (norm(`${d.id} ${d.label} ${d.model}`).includes(q)) hits.push({ type: "capteur", id: d.id, title: d.id, subtitle: d.label, to: d.kind === "sol" || d.kind === "passerelle" ? `/app/capteurs/${d.id}` : `/app/onion/capteurs/${d.id}` });
      for (const w of st.warehouses) if (norm(`${w.name} ${w.locality} ${w.variety}`).includes(q)) hits.push({ type: "entrepot", id: w.id, title: w.name, subtitle: `${w.product === "oignon" ? "Oignon" : "Pomme de terre"} · ${w.variety}`, to: `/app/onion/entrepots/${w.id}` });
      for (const l of st.lots) if (norm(`${l.id} ${l.variety} ${l.origin}`).includes(q)) hits.push({ type: "lot", id: l.id, title: `Lot ${l.id}`, subtitle: fmt.tonnes(l.quantityT), to: "/app/onion/lots" });
      const members = await db
        .select({ u: users })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(and(eq(memberships.orgId, c.orgId), ne(memberships.status, "desactive")));
      for (const { u } of members) if (norm(`${u.firstName} ${u.lastName} ${u.phone}`).includes(q)) hits.push({ type: "membre", id: u.id, title: `${u.firstName} ${u.lastName}`, subtitle: fmt.phone(u.phone), to: "/app/membres" });
    }
    if (c.user.platformRole !== "aucun" && c.user.twoFactorEnabled) {
      for (const o of await db.select().from(organizations)) if (norm(o.name).includes(q)) hits.push({ type: "client", id: o.id, title: o.name, subtitle: o.locality, to: `/admin/clients/${o.id}` });
      if (c.user.platformRole === "admin") for (const { data: i } of await r.invoices.listAll()) if (norm(`${i.id} ${i.label}`).includes(q)) hits.push({ type: "facture", id: i.id, title: i.id, subtitle: i.label, to: "/admin/facturation" });
    }
    return hits.slice(0, 20);
  });

  /* ——— Contact (site public) ——— */

  app.post("/contact", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (req) => {
    // Le champ piège est accepté côté serveur (au lieu d'une erreur 422 qui le trahirait) puis ignoré.
    const b = parse(contactSchema.extend({ website: z.string().max(500).optional().default("") }), req.body);
    // Champ piège rempli : on répond comme si tout allait bien, sans rien enregistrer.
    if (b.website) return { ok: true };
    await db.insert(contactMessages).values({ name: b.name, organization: b.organization, phone: toE164(b.phone.replace(/[\s.-]/g, "")), profile: b.profile, region: b.region, message: b.message, ip: req.ip });
    req.log.info({ profile: b.profile }, "nouvelle demande de contact");
    return { ok: true };
  });
}
