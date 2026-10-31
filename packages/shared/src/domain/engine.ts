/**
 * Calculs métier communs à l'API et au mode démo : instantanés des parcelles et des entrepôts,
 * candidats d'alerte. Les mesures viennent d'un fournisseur de valeurs (`ValueOf`) :
 * dernières mesures en base pour l'API, simulateur pour la démo. Même entrée, même résultat.
 */
import type { Device, Lot, Metric, Parcel, ParcelSnapshot, Valve, Warehouse, WarehouseSnapshot, ZoneSnapshot } from "./types";
import { deviceAlerts, lowerFirst, moistureState, parcelAlerts, storageReasons, storageRisk, storageRiskScore, warehouseAlerts, type AlertCandidate } from "./rules";

export type ValueOf = (deviceId: string, metric: Metric) => number | null;

const avg = (xs: Array<number | null>) => {
  const v = xs.filter((x): x is number => x != null && Number.isFinite(x));
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
};

export interface ParcelEngineInput {
  parcels: Parcel[];
  devices: Pick<Device, "id" | "status" | "parcelId">[];
  valves: Valve[];
}

/** Instantané des parcelles. Un capteur hors ligne n'entre pas dans la moyenne. */
export function computeParcelSnapshots(input: ParcelEngineInput, valueOf: ValueOf, opts: { waterMonthM3?: (parcelId: string) => number; lastMeasureAt?: (parcelId: string) => string | null } = {}): ParcelSnapshot[] {
  const valves = new Map(input.valves.map((v) => [v.id, v]));
  const offline = new Set(input.devices.filter((d) => d.status === "hors_ligne").map((d) => d.id));
  return input.parcels.map((p) => {
    const live = p.sensorIds.filter((id) => !offline.has(id));
    const moisture = avg(live.map((id) => valueOf(id, "soilMoisture")));
    return {
      parcel: p,
      moisture,
      soilTemp: avg(live.map((id) => valueOf(id, "soilTemp"))),
      state: moistureState(moisture, p.moisture),
      lastMeasureAt: moisture == null ? null : (opts.lastMeasureAt?.(p.id) ?? null),
      irrigating: p.valveId ? (valves.get(p.valveId)?.open ?? false) : false,
      waterMonthM3: opts.waterMonthM3?.(p.id) ?? 0,
    };
  });
}

export interface WarehouseEngineInput {
  warehouses: Warehouse[];
  devices: Pick<Device, "id" | "status" | "warehouseId" | "zoneId">[];
  lots: Pick<Lot, "warehouseId" | "status" | "quantityT">[];
}

/** Instantané des entrepôts : la zone la plus à risque donne l'état ; l'ambiance donne les moyennes. */
export function computeWarehouseSnapshots(input: WarehouseEngineInput, valueOf: ValueOf, opts: { lastMeasureAt?: (warehouseId: string) => string | null } = {}): WarehouseSnapshot[] {
  return input.warehouses.map((w) => {
    const probes = input.devices.filter((d) => d.warehouseId === w.id);
    const read = (id: string | undefined | null, m: Metric) => (id && probes.find((p) => p.id === id)?.status !== "hors_ligne" ? valueOf(id, m) : null);
    const zones: ZoneSnapshot[] = w.zones.map((z) => {
      const dev = probes.find((d) => d.zoneId === z.id) ?? null;
      const m = { temp: read(dev?.id, "airTemp"), humidity: read(dev?.id, "airHumidity"), co2: read(dev?.id, "co2"), gas: read(dev?.id, "gas") };
      const score = storageRiskScore(m, w.thresholds);
      return { zoneId: z.id, ...m, risk: storageRisk(score), riskScore: score ?? 0, deviceId: dev?.id ?? null };
    });
    const ambient = probes.find((d) => !d.zoneId);
    const amb = ambient ? { temp: read(ambient.id, "airTemp"), humidity: read(ambient.id, "airHumidity"), co2: read(ambient.id, "co2"), gas: read(ambient.id, "gas") } : null;
    const glob = {
      temp: amb?.temp ?? avg(zones.map((z) => z.temp)),
      humidity: amb?.humidity ?? avg(zones.map((z) => z.humidity)),
      co2: amb?.co2 ?? avg(zones.map((z) => z.co2)),
      gas: amb?.gas ?? avg(zones.map((z) => z.gas)),
    };
    const worst = zones.length ? zones.reduce((a, z) => (z.riskScore > a.riskScore ? z : a), zones[0]!) : null;
    const stockT = Math.round(input.lots.filter((l) => l.warehouseId === w.id && l.status !== "vendu").reduce((a, l) => a + l.quantityT, 0) * 10) / 10;
    const reasons = worst ? storageReasons({ temp: worst.temp, humidity: worst.humidity, co2: worst.co2, gas: worst.gas }, w.thresholds) : [];
    return {
      warehouse: w,
      ...glob,
      risk: worst?.risk ?? "bon",
      riskScore: worst?.riskScore ?? 0,
      zones,
      stockT,
      reasons: reasons.map((r) => (zones.length > 1 && worst ? `${w.zones.find((z) => z.id === worst.zoneId)?.label ?? worst.zoneId} : ${lowerFirst(r)}` : r)),
      lastMeasureAt: opts.lastMeasureAt?.(w.id) ?? null,
    };
  });
}

/** Identifiant stable d'une alerte : même cause, même alerte (pas de doublon). */
export const alertKey = (c: Pick<AlertCandidate, "kind" | "source">) => `al-${c.kind}-${c.source.id}`.replace(/[^a-zA-Z0-9-]/g, "-");

const SEV = { critique: 3, attention: 2, info: 1 } as const;
const RISK = { bon: 0, surveiller: 1, risque: 2, pourriture: 3 } as const;

/**
 * Candidats d'alerte d'une organisation à l'instant `now` : parcelles, capteurs, et une seule alerte
 * par entrepôt (la zone la plus à risque donne le titre, les autres le détail).
 */
export function computeAlertCandidates(input: { parcels: ParcelSnapshot[]; devices: Device[]; warehouses: WarehouseSnapshot[]; parcelCode: (id: string) => string | undefined; warehouseName: (id: string) => string | undefined }, now: Date): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  for (const s of input.parcels) out.push(...parcelAlerts(s.parcel, s.moisture));
  for (const d of input.devices) {
    const where = d.parcelId ? `parcelle ${input.parcelCode(d.parcelId) ?? ""}` : d.warehouseId ? (input.warehouseName(d.warehouseId) ?? "") : "passerelle";
    out.push(...deviceAlerts(d, now, where));
  }
  for (const w of input.warehouses) {
    const zones = [...w.zones].filter((z) => RISK[z.risk] >= 1).sort((a, b) => b.riskScore - a.riskScore);
    const top = zones[0];
    if (!top) continue;
    const labelOf = (id: string) => (w.warehouse.zones.find((x) => x.id === id)?.label ?? id).toLowerCase();
    const zc = warehouseAlerts(w.warehouse, top).sort((a, b) => SEV[b.severity] - SEV[a.severity]);
    const main = zc[0];
    if (!main) continue;
    const others = zones.slice(1).map((z) => `${labelOf(z.zoneId)} (${z.risk === "risque" || z.risk === "pourriture" ? "risque" : "à surveiller"})`);
    const lbl = labelOf(top.zoneId);
    out.push({
      ...main,
      severity: top.risk === "pourriture" || top.risk === "risque" ? "critique" : "attention",
      title: main.title.replace(`zone ${top.zoneId}`, lbl),
      detail: [main.detail, ...zc.slice(1).map((x) => x.title.replace(/\s\(.*\)$/, "").replace(`zone ${top.zoneId}`, lbl) + "."), others.length ? `Autres zones : ${others.join(", ")}.` : ""].filter(Boolean).join(" "),
      source: { type: "entrepot", id: w.warehouse.id, label: `${w.warehouse.name} · ${lbl}` },
    });
  }
  return out;
}
