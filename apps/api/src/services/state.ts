/**
 * Vue « temps réel » d'une organisation : capteurs avec statut recalculé, dernières mesures,
 * instantanés des parcelles et des entrepôts. Calculs délégués au moteur partagé (même résultat que la démo).
 */
import { sql } from "drizzle-orm";
import { computeParcelSnapshots, computeWarehouseSnapshots, deviceStatus, METRIC_UNIT, type Device, type DeviceRow, type Metric, type Parcel, type Warehouse } from "@saytumbay/shared";
import type { AppContext } from "../context";

export type Latest = Map<string, { value: number; ts: Date }>;
const k = (deviceId: string, metric: string) => `${deviceId}|${metric}`;

/** Dernière valeur de chaque mesure, sur 24 h, pour une liste de capteurs. */
export async function latestValues(ctx: AppContext, deviceIds: string[]): Promise<Latest> {
  const out: Latest = new Map();
  if (!deviceIds.length) return out;
  const since = new Date(ctx.now().getTime() - 24 * 3600_000);
  const res = await ctx.db.execute<{ device_id: string; metric: string; value: number; ts: string | Date }>(
    sql`select distinct on (device_id, metric) device_id, metric, value, ts from measurements
        where device_id in (${sql.join(
          deviceIds.map((d) => sql`${d}`),
          sql`, `,
        )}) and ts > ${since.toISOString()}::timestamptz and ts <= ${ctx.now().toISOString()}::timestamptz
        order by device_id, metric, ts desc`,
  );
  for (const r of res.rows) out.set(k(r.device_id, r.metric), { value: Number(r.value), ts: new Date(r.ts) });
  return out;
}

export function primaryMetric(d: Pick<Device, "kind">): Metric | null {
  if (d.kind === "sol") return "soilMoisture";
  if (d.kind === "stockage" || d.kind === "air") return "airHumidity";
  return null;
}

export function deviceLabel(d: Device, parcels: Parcel[], warehouses: Warehouse[], siteName: (id: string | null | undefined) => string | undefined): string {
  if (d.parcelId) return `Parcelle ${parcels.find((p) => p.id === d.parcelId)?.code ?? "?"}`;
  if (d.warehouseId) {
    const w = warehouses.find((x) => x.id === d.warehouseId);
    const z = w?.zones.find((x) => x.id === d.zoneId);
    return `${w?.name ?? "Entrepôt"}${z ? ` · ${z.label.toLowerCase()}` : " · ambiance"}`;
  }
  if (d.kind === "passerelle") return `Passerelle · ${siteName(d.siteId) ?? "site"}`;
  return siteName(d.siteId) ?? "—";
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export async function orgState(ctx: AppContext, orgId: string) {
  const r = ctx.repos;
  const [parcels, rawDevices, valves, warehouses, lots, sites, events] = await Promise.all([r.parcels.list(orgId), r.devices.list(orgId), r.valves.list(orgId), r.warehouses.list(orgId), r.lots.list(orgId), r.sites.list(orgId), r.events.list(orgId)]);
  const now = ctx.now();
  const devices: Device[] = rawDevices.map((d) => ({ ...d, status: d.status === "maintenance" ? "maintenance" : deviceStatus(d, now) }));
  const latest = await latestValues(
    ctx,
    devices.map((d) => d.id),
  );
  const valueOf = (id: string, m: Metric) => latest.get(k(id, m))?.value ?? null;
  const lastAt = (ids: string[], m: Metric) => {
    const ts = ids.map((id) => latest.get(k(id, m))?.ts?.getTime() ?? 0).filter(Boolean);
    return ts.length ? new Date(Math.max(...ts)).toISOString() : null;
  };
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const waterMonth = (parcelId: string) => round1(events.filter((e) => e.parcelId === parcelId && e.kind === "terminee" && e.at >= monthStart).reduce((a, e) => a + (e.liters ?? 0), 0) / 1000);
  const parcelSnaps = computeParcelSnapshots({ parcels, devices, valves }, valueOf, { waterMonthM3: waterMonth, lastMeasureAt: (pid) => lastAt(parcels.find((p) => p.id === pid)?.sensorIds ?? [], "soilMoisture") });
  const warehouseSnaps = computeWarehouseSnapshots({ warehouses, devices, lots }, valueOf, {
    lastMeasureAt: (wid) =>
      lastAt(
        devices.filter((d) => d.warehouseId === wid).map((d) => d.id),
        "airTemp",
      ),
  });
  const siteName = (id: string | null | undefined) => sites.find((s) => s.id === id)?.name;
  const rows: DeviceRow[] = devices.map((d) => {
    const metric = primaryMetric(d);
    return { ...d, label: deviceLabel(d, parcels, warehouses, siteName), lastValue: metric ? { metric, value: d.status === "hors_ligne" ? null : valueOf(d.id, metric), unit: METRIC_UNIT[metric] } : null };
  });
  return { parcels, devices, rows, valves, warehouses, lots, sites, events, latest, valueOf, parcelSnaps, warehouseSnaps };
}

export type OrgState = Awaited<ReturnType<typeof orgState>>;

/** Parcelles visibles : un membre limité à certaines parcelles ne voit que celles-ci. */
export function visibleParcelIds(membership: { parcels: string[] | "all" } | null, parcels: Parcel[]): Set<string> {
  if (!membership || membership.parcels === "all") return new Set(parcels.map((p) => p.id));
  const allowed = new Set(membership.parcels);
  return new Set(parcels.filter((p) => allowed.has(p.id)).map((p) => p.id));
}

/** Filtre d'un membre limité à certaines parcelles : capteurs et alertes des autres parcelles masqués. */
export function memberScope(membership: { parcels: string[] | "all" } | null, st: Pick<OrgState, "parcels" | "devices">) {
  const vis = visibleParcelIds(membership, st.parcels);
  const limited = !!membership && membership.parcels !== "all";
  const hiddenDevices = new Set(limited ? st.devices.filter((d) => d.parcelId && !vis.has(d.parcelId)).map((d) => d.id) : []);
  return {
    vis,
    deviceVisible: (id: string) => !hiddenDevices.has(id),
    alertVisible: (a: { source: { type: string; id: string } }) => !limited || (a.source.type === "parcelle" ? vis.has(a.source.id) : !hiddenDevices.has(a.source.id)),
  };
}
