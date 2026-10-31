/**
 * Calculs « temps réel » de la démo : instantanés des parcelles et des entrepôts, état des
 * capteurs et alertes ouvertes, à partir du jeu de données et du simulateur de mesures.
 */
import type { Alert, Device, ParcelSnapshot, WarehouseSnapshot, WeatherNow, ZoneSnapshot } from "../domain/types";
import {
  ADVICE,
  lowerFirst,
  deviceAlerts,
  deviceStatus,
  moistureState,
  parcelAlerts,
  storageReasons,
  storageRisk,
  storageRiskScore,
  warehouseAlerts,
  type AlertCandidate,
} from "../domain/rules";
import type { DemoSeed } from "./seed";
import { setBatteryTargets, valueAt, WATER_BY_MONTH } from "./series";

const MIN = 60_000;

export function initSimulation(seed: DemoSeed) {
  setBatteryTargets(Object.fromEntries(seed.devices.map((d) => [d.id, d.battery])));
}

const avg = (xs: Array<number | null>) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
};

/** Capteurs : dernière émission toutes les 10 min (en ligne), batterie et statut recalculés. */
export function liveDevices(seed: DemoSeed, nowMs: number): Device[] {
  const anchor = seed.now.getTime();
  const now = new Date(nowMs);
  return seed.devices.map((d) => {
    let lastSeenAt = d.lastSeenAt;
    if (d.status !== "hors_ligne" && d.lastSeenAt) {
      const period = d.kind === "passerelle" ? MIN : 10 * MIN;
      const offset = Math.floor((d.id.charCodeAt(d.id.length - 1) % 10) * 0.6 * MIN);
      lastSeenAt = new Date(Math.floor((nowMs - offset) / period) * period + offset).toISOString();
    }
    const battery = d.battery == null ? null : (valueAt(d.id, "battery", nowMs, anchor) ?? d.battery);
    const next = { ...d, lastSeenAt, battery };
    return { ...next, status: deviceStatus(next, now) };
  });
}

export function parcelSnapshots(seed: DemoSeed, nowMs: number): ParcelSnapshot[] {
  const anchor = seed.now.getTime();
  const valves = new Map(seed.valves.map((v) => [v.id, v]));
  return seed.parcels.map((p, i) => {
    const vals = p.sensorIds.map((id) => valueAt(id, "soilMoisture", nowMs, anchor));
    const temps = p.sensorIds.map((id) => valueAt(id, "soilTemp", nowMs, anchor));
    const moisture = avg(vals);
    const water = WATER_BY_MONTH[p.id] ?? [];
    return {
      parcel: p,
      moisture,
      soilTemp: avg(temps),
      state: moistureState(moisture, p.moisture),
      lastMeasureAt: moisture == null ? null : new Date(Math.floor(nowMs / (10 * MIN)) * 10 * MIN).toISOString(),
      irrigating: p.valveId ? (valves.get(p.valveId)?.open ?? false) : false,
      waterMonthM3: water[water.length - 1] ?? 0,
      _i: i,
    } as ParcelSnapshot;
  });
}

export function warehouseSnapshots(seed: DemoSeed, nowMs: number): WarehouseSnapshot[] {
  const anchor = seed.now.getTime();
  return seed.warehouses.map((w) => {
    const probes = seed.devices.filter((d) => d.warehouseId === w.id);
    const zones: ZoneSnapshot[] = w.zones.map((z) => {
      const dev = probes.find((d) => d.zoneId === z.id) ?? null;
      const m = {
        temp: dev ? valueAt(dev.id, "airTemp", nowMs, anchor) : null,
        humidity: dev ? valueAt(dev.id, "airHumidity", nowMs, anchor) : null,
        co2: dev ? valueAt(dev.id, "co2", nowMs, anchor) : null,
        gas: dev ? valueAt(dev.id, "gas", nowMs, anchor) : null,
      };
      const score = storageRiskScore(m, w.thresholds);
      return { zoneId: z.id, ...m, risk: storageRisk(score), riskScore: score ?? 0, deviceId: dev?.id ?? null };
    });
    const ambient = probes.find((d) => !d.zoneId);
    const amb = ambient
      ? {
          temp: valueAt(ambient.id, "airTemp", nowMs, anchor),
          humidity: valueAt(ambient.id, "airHumidity", nowMs, anchor),
          co2: valueAt(ambient.id, "co2", nowMs, anchor),
          gas: valueAt(ambient.id, "gas", nowMs, anchor),
        }
      : null;
    const glob = {
      temp: amb?.temp ?? avg(zones.map((z) => z.temp)),
      humidity: amb?.humidity ?? avg(zones.map((z) => z.humidity)),
      co2: amb?.co2 ?? avg(zones.map((z) => z.co2)),
      gas: amb?.gas ?? avg(zones.map((z) => z.gas)),
    };
    const worst = zones.reduce((a, z) => (z.riskScore > a.riskScore ? z : a), zones[0]!);
    const stockT = seed.lots.filter((l) => l.warehouseId === w.id && l.status !== "vendu").reduce((a, l) => a + l.quantityT, 0);
    const reasons = storageReasons({ temp: worst.temp, humidity: worst.humidity, co2: worst.co2, gas: worst.gas }, w.thresholds);
    return {
      warehouse: w,
      ...glob,
      risk: worst.risk,
      riskScore: worst.riskScore,
      zones,
      stockT,
      reasons: reasons.map((r) => (zones.length > 1 ? `${w.zones.find((z) => z.id === worst.zoneId)?.label ?? worst.zoneId} : ${lowerFirst(r)}` : r)),
      lastMeasureAt: new Date(Math.floor(nowMs / (10 * MIN)) * 10 * MIN).toISOString(),
    };
  });
}

/** Identifiant stable d'une alerte : même cause → même alerte (pas de doublons). */
export const alertId = (c: Pick<AlertCandidate, "kind" | "source">) => `al-${c.kind}-${c.source.id}`.replace(/[^a-zA-Z0-9-]/g, "-");

/** Alertes ouvertes calculées à l'instant `nowMs`, plus l'historique résolu. */
export function liveAlerts(seed: DemoSeed, nowMs: number, overrides: Record<string, Partial<Alert>> = {}): Alert[] {
  const now = new Date(nowMs);
  const cands: AlertCandidate[] = [];
  const parcels = parcelSnapshots(seed, nowMs);
  for (const s of parcels) cands.push(...parcelAlerts(s.parcel, s.moisture));
  const devices = liveDevices(seed, nowMs);
  for (const d of devices) {
    const where = d.parcelId
      ? `parcelle ${seed.parcels.find((p) => p.id === d.parcelId)?.code ?? ""}`
      : d.warehouseId
        ? (seed.warehouses.find((w) => w.id === d.warehouseId)?.name ?? "")
        : "passerelle";
    if (d.orgId === seed.organizations[0]!.id) cands.push(...deviceAlerts(d, now, where));
  }
  const sevRank = { critique: 3, attention: 2, info: 1 } as const;
  const riskRank = { bon: 0, surveiller: 1, risque: 2, pourriture: 3 } as const;
  for (const w of warehouseSnapshots(seed, nowMs)) {
    // Une seule alerte par entrepôt : la zone la plus à risque donne le titre, les autres le détail.
    const zones = [...w.zones].filter((z) => riskRank[z.risk] >= 1).sort((a, b) => b.riskScore - a.riskScore);
    const top = zones[0];
    if (!top) continue;
    const labelOf = (id: string) => (w.warehouse.zones.find((x) => x.id === id)?.label ?? id).toLowerCase();
    const zc = warehouseAlerts(w.warehouse, top).sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);
    const main = zc[0];
    if (!main) continue;
    const others = zones.slice(1).map((z) => `${labelOf(z.zoneId)} (${z.risk === "risque" ? "risque" : "à surveiller"})`);
    const lbl = labelOf(top.zoneId);
    cands.push({
      ...main,
      severity: top.risk === "pourriture" || top.risk === "risque" ? "critique" : "attention",
      title: main.title.replace(`zone ${top.zoneId}`, lbl).replace(/^La /, "La "),
      detail: [main.detail, ...zc.slice(1).map((x) => x.title.replace(/\s\(.*\)$/, "").replace(`zone ${top.zoneId}`, lbl) + "."), others.length ? `Autres zones : ${others.join(", ")}.` : ""]
        .filter(Boolean)
        .join(" "),
      source: { type: "entrepot", id: w.warehouse.id, label: `${w.warehouse.name} · ${lbl}` },
    });
  }
  const merged = cands;
  const orgId = seed.organizations[0]!.id;
  const resp = seed.users.find((u) => u.id === "u-awa");
  const open: Alert[] = merged.map((c, i) => {
    const id = alertId(c);
    const createdAt = new Date(nowMs - (12 + ((i * 37) % 300)) * MIN).toISOString();
    const base: Alert = {
      id,
      orgId,
      module: c.module,
      kind: c.kind,
      severity: c.severity,
      title: c.title,
      detail: c.detail,
      advice: ADVICE[c.kind],
      source: c.source,
      status: "ouverte",
      createdAt,
      acknowledgedBy: null,
      acknowledgedAt: null,
      resolvedAt: null,
      notifications:
        c.severity === "info" || !resp ? [] : [{ channel: "sms", to: resp.phone, at: createdAt, delivered: true }],
    };
    return { ...base, ...overrides[id] };
  });
  const sev = (a: Alert) => sevRank[a.severity];
  return [...open.sort((a, b) => sev(b) - sev(a) || b.createdAt.localeCompare(a.createdAt)), ...seed.alertsHistory];
}

export function demoWeather(nowMs: number): WeatherNow {
  const h = new Date(nowMs).getUTCHours() + new Date(nowMs).getUTCMinutes() / 60;
  const t = 27 + 5 * Math.sin(((h - 9) / 24) * Math.PI * 2);
  return {
    locality: "Mboro",
    temp: Math.round(t),
    feelsLike: Math.round(t + 2),
    min: 23,
    max: 33,
    windKmh: 14,
    windDir: "N-E",
    rainTomorrowMm: 0,
    et0Mm: 6.1,
    condition: "ensoleille",
    simulated: true,
  };
}
