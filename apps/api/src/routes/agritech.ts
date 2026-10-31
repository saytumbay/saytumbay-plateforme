/**
 * AgriTech : vue d'ensemble, parcelles, capteurs, séries de mesures, irrigation.
 * Chaque route vérifie la permission (`need`) puis ne lit que l'organisation active.
 */
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { deviceRegisterSchema, irrigationRuleSchema, manualIrrigationSchema, METRIC_UNIT, parcelSchema, scheduleSchema, type Device, type IrrigationEvent, type Metric } from "@saytumbay/shared";
import type { AppContext } from "../context";
import { measurements, organizations, users } from "../db/schema";
import { conflict, HttpError, notFound, parse } from "../lib/errors";
import { audit, need } from "../plugins/auth";
import { listAlerts } from "../services/alerts";
import { memberScope, orgState, visibleParcelIds } from "../services/state";
import { weatherFor } from "../services/weather";

const MIN = 60_000;
const D = 24 * 60 * MIN;
const PARCEL_COLORS = ["#2a78d6", "#d55181", "#7a5c00", "#1597b3", "#8e2c55", "#0f6b45"];
const rid = (p: string) => `${p}-${randomUUID().slice(0, 8)}`;

export const monthKeys = (now: Date, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const x = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
  });

const round1 = (v: number) => Math.round(v * 10) / 10;
export const litersToM3 = (events: IrrigationEvent[], filter: (e: IrrigationEvent) => boolean) => round1(events.filter((e) => e.kind === "terminee" && filter(e)).reduce((a, e) => a + (e.liters ?? 0), 0) / 1000);

/** Clôt les irrigations arrivées à leur durée prévue (vanne refermée, événement « terminée »). */
export async function settleRuns(ctx: AppContext, orgId: string) {
  const now = ctx.now().getTime();
  const runs = await ctx.repos.runs.list(orgId);
  for (const r of runs) {
    if (r.stoppedAt) continue;
    const end = new Date(r.startedAt).getTime() + r.durationMin * MIN;
    if (now < end) continue;
    await ctx.repos.runs.update(orgId, r.id, { stoppedAt: new Date(end).toISOString() });
    const valve = (await ctx.repos.valves.list(orgId)).find((v) => v.parcelId === r.parcelId);
    if (valve) await ctx.repos.valves.update(orgId, valve.id, { open: false });
    const ev: IrrigationEvent = { id: rid("ie"), parcelId: r.parcelId, kind: "terminee", trigger: "manuelle", at: new Date(end).toISOString(), durationMin: r.durationMin, liters: Math.round(r.durationMin * 5.6), by: r.by, note: "Durée prévue atteinte" };
    await ctx.repos.events.insert(orgId, ev.id, ev, r.parcelId);
  }
  const valves = await ctx.repos.valves.list(orgId);
  for (const p of await ctx.repos.pumps.list(orgId)) {
    const running = valves.some((v) => v.open);
    if (p.running !== running) await ctx.repos.pumps.update(orgId, p.id, { running });
  }
}

export function agritechRoutes(app: FastifyInstance, ctx: AppContext) {
  const r = ctx.repos;

  app.get("/overview", async (req) => {
    const c = await need(ctx, req, "parcelles:lire");
    await settleRuns(ctx, c.orgId);
    const st = await orgState(ctx, c.orgId);
    const now = ctx.now();
    const [org] = await ctx.db.select().from(organizations).where(eq(organizations.id, c.orgId)).limit(1);
    const vis = visibleParcelIds(c.membership, st.parcels);
    const keys = monthKeys(now, 6);
    const months = keys.map((month) => {
      const byParcel: Record<string, number> = {};
      for (const p of st.parcels) byParcel[p.code] = litersToM3(st.events, (e) => e.parcelId === p.id && e.at.startsWith(month));
      return { month, total: round1(Object.values(byParcel).reduce((a, b) => a + b, 0)), byParcel };
    });
    const [pumps, tasks, alerts] = await Promise.all([r.pumps.list(c.orgId), r.tasks.list(c.orgId), listAlerts(ctx, c.orgId)]);
    const site = st.sites[0];
    const sensors = st.rows.filter((d) => d.kind !== "passerelle");
    return {
      orgName: org?.name ?? "",
      siteLabel: site?.locality ?? org?.locality ?? "",
      generatedAt: now.toISOString(),
      parcels: st.parcelSnaps.filter((p) => vis.has(p.parcel.id)),
      alerts: alerts.filter((a) => a.status !== "resolue" && memberScope(c.membership, st).alertVisible(a)),
      tasks,
      weather: await weatherFor(ctx, site?.center ?? [14.69, -17.44], site?.locality ?? org?.locality ?? "Dakar"),
      devices: { total: sensors.length, online: sensors.filter((d) => d.status !== "hors_ligne").length, offline: st.rows.filter((d) => d.status === "hors_ligne").map((d) => d.id), lowBattery: st.rows.filter((d) => d.status === "batterie_faible").map((d) => d.id) },
      water: { monthM3: months.at(-1)?.total ?? 0, savedPct: null, savedM3: null, months },
      equipment: { pump: pumps[0] ?? { id: "-", orgId: c.orgId, name: "Aucune pompe", flowM3h: 0, running: false }, valves: st.valves },
      storage: st.warehouseSnaps.map((w) => {
        const lots = st.lots.filter((l) => l.warehouseId === w.warehouse.id && l.status !== "vendu");
        const oldest = lots.length ? Math.max(...lots.map((l) => Math.round((now.getTime() - new Date(l.enteredAt).getTime()) / D))) : null;
        return { id: w.warehouse.id, name: w.warehouse.name, product: w.warehouse.product, variety: w.warehouse.variety, risk: w.risk, riskScore: w.riskScore, stockT: w.stockT, temp: w.temp, humidity: w.humidity, days: oldest };
      }),
      areaHa: round1(st.parcels.reduce((a, p) => a + p.areaHa, 0)),
      areaTrendHa: 0,
    };
  });

  app.get("/weather", async (req) => {
    const c = await need(ctx, req, "parcelles:lire");
    const site = (await r.sites.list(c.orgId))[0];
    return weatherFor(ctx, site?.center ?? [14.69, -17.44], site?.locality ?? "Dakar");
  });

  /* ——— Parcelles ——— */

  app.get("/parcels", async (req) => {
    const c = await need(ctx, req, "parcelles:lire");
    await settleRuns(ctx, c.orgId);
    const st = await orgState(ctx, c.orgId);
    const vis = visibleParcelIds(c.membership, st.parcels);
    return st.parcelSnaps.filter((p) => vis.has(p.parcel.id));
  });

  app.get("/parcels/:id", async (req) => {
    const c = await need(ctx, req, "parcelles:lire");
    const id = (req.params as { id: string }).id;
    await settleRuns(ctx, c.orgId);
    const st = await orgState(ctx, c.orgId);
    if (!visibleParcelIds(c.membership, st.parcels).has(id)) throw notFound("Cette parcelle n’existe pas ou n’est pas dans votre périmètre.");
    const snap = st.parcelSnaps.find((x) => x.parcel.id === id)!;
    const p = snap.parcel;
    const devices = st.rows.filter((d) => d.parcelId === id);
    const first = devices.find((d) => d.status !== "hors_ligne")?.id ?? p.sensorIds[0] ?? "";
    const v = (m: Metric) => st.valueOf(first, m);
    const [resp] = await ctx.db.select().from(users).where(eq(users.id, p.responsibleId)).limit(1);
    const alerts = (await listAlerts(ctx, c.orgId)).filter((a) => a.source.id === id || devices.some((d) => d.id === a.source.id));
    return {
      snapshot: snap,
      devices,
      rule: (await r.rules.get(c.orgId, id)) ?? null,
      schedules: await r.schedules.list(c.orgId, id),
      events: st.events
        .filter((e) => e.parcelId === id)
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 12),
      alerts,
      responsible: resp ? { id: resp.id, firstName: resp.firstName, lastName: resp.lastName, phone: resp.phone } : null,
      waterByMonth: monthKeys(ctx.now(), 6).map((month) => ({ month, m3: litersToM3(st.events, (e) => e.parcelId === id && e.at.startsWith(month)) })),
      soil: { ph: v("ph"), ec: v("ec"), n: v("n"), p: v("p"), k: v("k"), temp: v("soilTemp") },
    };
  });

  app.post("/parcels", async (req) => {
    const c = await need(ctx, req, "parcelles:modifier");
    const b = parse(parcelSchema, req.body);
    const parcels = await r.parcels.list(c.orgId);
    if (parcels.some((p) => p.code.toLowerCase() === b.code.toLowerCase())) throw conflict("doublon", `Une parcelle porte déjà le code ${b.code}.`, { code: "Code déjà utilisé" });
    const members = await ctx.db.execute<{ user_id: string }>(sql`select user_id from memberships where org_id = ${c.orgId} and user_id = ${b.responsibleId} and status <> 'desactive'`);
    if (!members.rows.length) throw new HttpError(422, "validation", "Responsable inconnu.", { fields: { responsibleId: "Choisissez un membre de l’organisation" } });
    const site = (await r.sites.list(c.orgId))[0];
    if (!site) throw new HttpError(409, "sans_site", "Créez d’abord un site pour cette organisation.");
    const n = parcels.length;
    const [la, lo] = [site.center[0] - 0.0016 - (n % 3) * 0.0004, site.center[1] + 0.0012 * ((n % 4) - 1.5)];
    const d = 0.00028;
    const id = `p-${b.code.toLowerCase().replace(/[^a-z0-9]/g, "")}-${randomUUID().slice(0, 4)}`;
    const parcel = {
      id,
      orgId: c.orgId,
      siteId: site.id,
      code: b.code.toUpperCase(),
      name: b.name,
      crop: b.crop,
      variety: b.variety,
      areaHa: b.areaHa,
      soil: b.soil,
      plantedAt: b.plantedAt,
      harvestAt: b.harvestAt,
      responsibleId: b.responsibleId,
      sensorIds: [],
      valveId: null,
      polygon: b.polygon ?? ([[la + d, lo - d * 1.4], [la + d, lo + d * 1.4], [la - d, lo + d * 1.4], [la - d, lo - d * 1.4]] as Array<[number, number]>),
      moisture: b.moisture,
      color: PARCEL_COLORS[n % PARCEL_COLORS.length]!,
    };
    await r.parcels.insert(c.orgId, id, parcel);
    await r.rules.insert(c.orgId, id, { parcelId: id, mode: "manuel", startBelow: b.moisture.dry, stopAbove: b.moisture.wet, maxDurationMin: 30, skipIfRainMm: 5 }, id);
    await audit(ctx, req, "parcelle créée", b.name, "succes", c.orgId);
    return (await orgState(ctx, c.orgId)).parcelSnaps.find((x) => x.parcel.id === id);
  });

  app.patch("/parcels/:id", async (req) => {
    const c = await need(ctx, req, "parcelles:modifier");
    const id = (req.params as { id: string }).id;
    const p = await r.parcels.get(c.orgId, id);
    if (!p) throw notFound("Parcelle introuvable.");
    const b = parse(parcelSchema.partial(), req.body);
    await r.parcels.update(c.orgId, id, b);
    if (b.moisture) {
      const rule = await r.rules.get(c.orgId, id);
      if (rule) await r.rules.update(c.orgId, id, { startBelow: b.moisture.dry, stopAbove: b.moisture.wet });
      await audit(ctx, req, "seuils d’humidité modifiés", `${p.name} · ${b.moisture.dry}–${b.moisture.wet} %`, "succes", c.orgId);
    } else await audit(ctx, req, "parcelle modifiée", p.name, "succes", c.orgId);
    return (await orgState(ctx, c.orgId)).parcelSnaps.find((x) => x.parcel.id === id);
  });

  /* ——— Capteurs ——— */

  app.get("/devices", async (req) => {
    const c = await need(ctx, req, "capteurs:lire");
    const st = await orgState(ctx, c.orgId);
    const scope = memberScope(c.membership, st);
    return st.rows.filter((d) => scope.deviceVisible(d.id));
  });

  app.get("/devices/:id", async (req) => {
    const c = await need(ctx, req, "capteurs:lire");
    const id = (req.params as { id: string }).id;
    const st = await orgState(ctx, c.orgId);
    const d = st.rows.find((x) => x.id === id);
    if (!d || !memberScope(c.membership, st).deviceVisible(id)) throw notFound("Capteur introuvable dans votre organisation.");
    const metrics: Metric[] = d.kind === "sol" ? ["soilMoisture", "soilTemp", "ph", "ec", "n", "p", "k", "battery"] : d.kind === "passerelle" ? [] : ["airTemp", "airHumidity", "co2", "gas", "battery"];
    const fw = (await r.firmware.list("platform")).find((f) => f.version === d.firmware);
    return {
      device: d,
      metrics,
      alerts: (await listAlerts(ctx, c.orgId)).filter((a) => a.source.id === d.id || (d.parcelId && a.source.id === d.parcelId) || (d.warehouseId && a.source.id === d.warehouseId)),
      history: [...(d.status === "hors_ligne" && d.lastSeenAt ? [{ at: d.lastSeenAt, label: "Dernière mesure reçue" }] : []), ...(fw ? [{ at: fw.releasedAt, label: `Micrologiciel ${fw.version} disponible` }] : []), { at: d.installedAt, label: `Installé (${d.model})` }],
    };
  });

  app.post("/devices", async (req) => {
    const c = await need(ctx, req, "capteurs:gerer");
    const b = parse(deviceRegisterSchema, req.body);
    if (await r.devices.find(b.id)) throw conflict("doublon", `Le capteur ${b.id} est déjà enregistré.`, { id: "Identifiant déjà enregistré" });
    if (b.parcelId && !(await r.parcels.get(c.orgId, b.parcelId))) throw new HttpError(422, "validation", "Parcelle inconnue.", { fields: { parcelId: "Parcelle inconnue" } });
    if (b.warehouseId && !(await r.warehouses.get(c.orgId, b.warehouseId))) throw new HttpError(422, "validation", "Entrepôt inconnu.", { fields: { warehouseId: "Entrepôt inconnu" } });
    const kind: Device["kind"] = b.id.startsWith("AS") ? "sol" : b.id.startsWith("OS") ? "stockage" : "passerelle";
    const dev: Device = { id: b.id, orgId: c.orgId, kind, model: kind === "sol" ? "Dragino LSE01" : kind === "stockage" ? "Dragino LHT65N + sonde" : "Dragino LPS8N", parcelId: b.parcelId ?? null, warehouseId: b.warehouseId ?? null, zoneId: b.zoneId ?? null, siteId: null, battery: null, signal: 0, rssi: null, firmware: "—", status: "hors_ligne", lastSeenAt: null, installedAt: ctx.now().toISOString(), simulated: false };
    await r.devices.insert(c.orgId, dev.id, dev);
    if (b.parcelId) {
      const p = (await r.parcels.get(c.orgId, b.parcelId))!;
      await r.parcels.update(c.orgId, p.id, { sensorIds: [...p.sensorIds, dev.id] });
    }
    await audit(ctx, req, "capteur ajouté", b.id, "succes", c.orgId);
    return (await orgState(ctx, c.orgId)).rows.find((x) => x.id === b.id);
  });

  app.post("/devices/:id/replace", async (req) => {
    const c = await need(ctx, req, "capteurs:gerer");
    const oldId = (req.params as { id: string }).id;
    const old = await r.devices.get(c.orgId, oldId);
    if (!old) throw notFound("Capteur introuvable.");
    const newId = parse(z.object({ newId: deviceRegisterSchema.shape.id }), req.body).newId;
    if (await r.devices.find(newId)) throw conflict("doublon", `Le capteur ${newId} est déjà enregistré.`, { newId: "Identifiant déjà enregistré" });
    const fresh = { ...old, id: newId, battery: null, signal: 0 as const, rssi: null, status: "hors_ligne" as const, lastSeenAt: null, installedAt: ctx.now().toISOString(), firmware: "—", replaces: old.id, devEui: null };
    await r.devices.remove(c.orgId, old.id);
    await r.devices.insert(c.orgId, newId, fresh);
    for (const p of await r.parcels.list(c.orgId)) if (p.sensorIds.includes(old.id)) await r.parcels.update(c.orgId, p.id, { sensorIds: p.sensorIds.map((x) => (x === old.id ? newId : x)) });
    // L'historique de l'ancien capteur est rattaché au nouveau : les courbes restent continues.
    await ctx.db.update(measurements).set({ deviceId: newId }).where(eq(measurements.deviceId, old.id));
    await audit(ctx, req, "capteur remplacé", `${old.id} → ${newId}`, "succes", c.orgId);
    return (await orgState(ctx, c.orgId)).rows.find((x) => x.id === newId);
  });

  app.get("/series", async (req) => {
    const c = await need(ctx, req, "capteurs:lire");
    const q = parse(z.object({ device: z.string().min(1).max(40), metric: z.string(), from: z.coerce.number().optional(), to: z.coerce.number().optional() }), req.query);
    if (!(q.metric in METRIC_UNIT)) throw new HttpError(422, "validation", "Mesure inconnue.");
    const dev = await r.devices.get(c.orgId, q.device);
    if (!dev) throw notFound("Capteur introuvable.");
    if (c.membership && c.membership.parcels !== "all" && dev.parcelId && !c.membership.parcels.includes(dev.parcelId)) throw notFound("Capteur introuvable.");
    const now = ctx.now().getTime();
    const to = Math.min(q.to ?? now, now);
    const from = Math.max(q.from ?? to - 7 * D, to - 120 * D);
    // Au plus ~600 points : moyenne par tranche (date_bin) quand la période est longue.
    const bucketMin = Math.max(15, Math.ceil((to - from) / MIN / 600 / 15) * 15);
    const res = await ctx.db.execute<{ t: string | Date; v: number }>(
      sql`select date_bin(${`${bucketMin} minutes`}::interval, ts, timestamptz '2000-01-01') as t, avg(value) as v
          from measurements where device_id = ${q.device} and metric = ${q.metric}
          and ts >= ${new Date(from).toISOString()}::timestamptz and ts <= ${new Date(to).toISOString()}::timestamptz
          group by 1 order by 1`,
    );
    const step = bucketMin * MIN;
    const byT = new Map(res.rows.map((x) => [new Date(x.t).getTime(), Math.round(Number(x.v) * 10) / 10]));
    const points: Array<[number, number | null]> = [];
    for (let t = Math.ceil(from / step) * step; t <= to; t += step) points.push([t, byT.get(t) ?? null]);
    return { deviceId: q.device, metric: q.metric as Metric, unit: METRIC_UNIT[q.metric as Metric], points };
  });

  /* ——— Irrigation ——— */

  app.get("/irrigation", async (req) => {
    const c = await need(ctx, req, "irrigation:lire");
    await settleRuns(ctx, c.orgId);
    const st = await orgState(ctx, c.orgId);
    const vis = visibleParcelIds(c.membership, st.parcels);
    const [pumps, rules, schedules] = await Promise.all([r.pumps.list(c.orgId), r.rules.list(c.orgId), r.schedules.list(c.orgId)]);
    return {
      pump: pumps[0] ?? { id: "-", orgId: c.orgId, name: "Aucune pompe", flowM3h: 0, running: false },
      valves: st.valves,
      rules: rules.filter((x) => vis.has(x.parcelId)),
      schedules: schedules.filter((x) => vis.has(x.parcelId)),
      events: st.events
        .filter((e) => vis.has(e.parcelId))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 40),
      parcels: st.parcelSnaps.filter((p) => vis.has(p.parcel.id)),
    };
  });

  app.put("/irrigation/rules/:parcelId", async (req, reply) => {
    const c = await need(ctx, req, "irrigation:regles");
    const parcelId = (req.params as { parcelId: string }).parcelId;
    const b = parse(irrigationRuleSchema, req.body);
    if (b.stopAbove - b.startBelow < 5) throw new HttpError(422, "validation", "L’arrêt doit être au moins 5 points au-dessus du démarrage.", { fields: { stopAbove: "Au moins 5 points au-dessus du démarrage" } });
    const [p, rule] = await Promise.all([r.parcels.get(c.orgId, parcelId), r.rules.get(c.orgId, parcelId)]);
    if (!p) throw notFound("Parcelle introuvable.");
    const before = rule ? `${rule.mode}, ${rule.startBelow} %` : "aucune";
    if (rule) await r.rules.replace(c.orgId, parcelId, { ...b, parcelId }, parcelId);
    else await r.rules.insert(c.orgId, parcelId, { ...b, parcelId }, parcelId);
    const ev: IrrigationEvent = { id: rid("ie"), parcelId, kind: "regle_modifiee", trigger: "manuelle", at: ctx.now().toISOString(), durationMin: null, liters: null, by: c.user.id, note: `${before} → ${b.mode}, ${b.startBelow} %` };
    await r.events.insert(c.orgId, ev.id, ev, parcelId);
    await audit(ctx, req, "règle d’irrigation modifiée", `${p.name} · ${ev.note}`, "succes", c.orgId);
    return reply.status(204).send();
  });

  app.post("/irrigation/schedules", async (req, reply) => {
    const c = await need(ctx, req, "irrigation:regles");
    const b = parse(scheduleSchema, req.body);
    if (!(await r.parcels.get(c.orgId, b.parcelId))) throw new HttpError(422, "validation", "Parcelle inconnue.", { fields: { parcelId: "Parcelle inconnue" } });
    const id = rid("sch");
    await r.schedules.insert(c.orgId, id, { id, ...b }, b.parcelId);
    await audit(ctx, req, "programmation ajoutée", `${b.parcelId} · ${b.time}`, "succes", c.orgId);
    return reply.status(204).send();
  });

  app.patch("/irrigation/schedules/:id", async (req, reply) => {
    const c = await need(ctx, req, "irrigation:regles");
    const id = (req.params as { id: string }).id;
    const b = parse(scheduleSchema.partial().omit({ parcelId: true }), req.body);
    if (!(await r.schedules.update(c.orgId, id, b))) throw notFound("Programmation introuvable.");
    return reply.status(204).send();
  });

  app.delete("/irrigation/schedules/:id", async (req, reply) => {
    const c = await need(ctx, req, "irrigation:regles");
    const id = (req.params as { id: string }).id;
    if (!(await r.schedules.remove(c.orgId, id))) throw notFound("Programmation introuvable.");
    await audit(ctx, req, "programmation supprimée", id, "succes", c.orgId);
    return reply.status(204).send();
  });

  app.post("/irrigation/parcels/:id/start", async (req, reply) => {
    const c = await need(ctx, req, "irrigation:commander");
    const id = (req.params as { id: string }).id;
    const b = parse(manualIrrigationSchema, req.body);
    const parcels = await r.parcels.list(c.orgId);
    if (!visibleParcelIds(c.membership, parcels).has(id)) throw notFound("Parcelle introuvable.");
    const valve = (await r.valves.list(c.orgId)).find((v) => v.parcelId === id);
    if (!valve) throw conflict("sans_vanne", "Cette parcelle n’a pas de vanne pilotable.");
    await settleRuns(ctx, c.orgId);
    if ((await r.valves.get(c.orgId, valve.id))?.open) throw conflict("deja_en_cours", "Une irrigation est déjà en cours sur cette parcelle.");
    const now = ctx.now().toISOString();
    await r.valves.update(c.orgId, valve.id, { open: true });
    for (const p of await r.pumps.list(c.orgId)) await r.pumps.update(c.orgId, p.id, { running: true });
    const runId = rid("run");
    await r.runs.insert(c.orgId, runId, { id: runId, parcelId: id, startedAt: now, durationMin: b.durationMin, stoppedAt: null, by: c.user.id }, id);
    const ev: IrrigationEvent = { id: rid("ie"), parcelId: id, kind: "lancee", trigger: "manuelle", at: now, durationMin: b.durationMin, liters: null, by: c.user.id, note: "Commande depuis la plateforme" };
    await r.events.insert(c.orgId, ev.id, ev, id);
    await audit(ctx, req, "irrigation lancée", `${id} · ${b.durationMin} min`, "succes", c.orgId);
    return reply.status(204).send();
  });

  app.post("/irrigation/parcels/:id/stop", async (req, reply) => {
    const c = await need(ctx, req, "irrigation:commander");
    const id = (req.params as { id: string }).id;
    const run = (await r.runs.list(c.orgId, id)).find((x) => !x.stoppedAt);
    const valve = (await r.valves.list(c.orgId)).find((v) => v.parcelId === id);
    if (!run || !valve) throw conflict("pas_en_cours", "Aucune irrigation en cours sur cette parcelle.");
    const now = ctx.now();
    await r.runs.update(c.orgId, run.id, { stoppedAt: now.toISOString() });
    await r.valves.update(c.orgId, valve.id, { open: false });
    await settleRuns(ctx, c.orgId);
    const min = Math.max(1, Math.round((now.getTime() - new Date(run.startedAt).getTime()) / MIN));
    const ev: IrrigationEvent = { id: rid("ie"), parcelId: id, kind: "terminee", trigger: "manuelle", at: now.toISOString(), durationMin: min, liters: Math.round(min * 5.6), by: c.user.id, note: "Arrêt manuel" };
    await r.events.insert(c.orgId, ev.id, ev, id);
    await audit(ctx, req, "irrigation arrêtée", id, "succes", c.orgId);
    return reply.status(204).send();
  });
}

/** Mesures brutes d'un capteur sur une période (export, rapports). */
export async function rawMeasurements(ctx: AppContext, deviceIds: string[], metric: Metric, from: Date, to: Date) {
  if (!deviceIds.length) return [];
  return ctx.db
    .select()
    .from(measurements)
    .where(and(sql`${measurements.deviceId} in (${sql.join(deviceIds.map((d) => sql`${d}`), sql`, `)})`, eq(measurements.metric, metric), gte(measurements.ts, from), lte(measurements.ts, to)));
}
