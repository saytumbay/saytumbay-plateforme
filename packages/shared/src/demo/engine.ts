/**
 * Calculs « temps réel » de la démo : instantanés des parcelles et des entrepôts, état des
 * capteurs et alertes ouvertes, à partir du jeu de données et du simulateur de mesures.
 */
import type { Alert, Device, ParcelSnapshot, WarehouseSnapshot, WeatherNow } from "../domain/types";
import { ADVICE, deviceStatus } from "../domain/rules";
import { alertKey, computeAlertCandidates, computeParcelSnapshots, computeWarehouseSnapshots } from "../domain/engine";
import type { DemoSeed } from "./seed";
import { setBatteryTargets, valueAt, WATER_BY_MONTH } from "./series";

const MIN = 60_000;

export function initSimulation(seed: DemoSeed) {
  setBatteryTargets(Object.fromEntries(seed.devices.map((d) => [d.id, d.battery])));
}

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
  const tick = new Date(Math.floor(nowMs / (10 * MIN)) * 10 * MIN).toISOString();
  return computeParcelSnapshots({ parcels: seed.parcels, devices: liveDevices(seed, nowMs), valves: seed.valves }, (id, m) => valueAt(id, m, nowMs, anchor), {
    waterMonthM3: (id) => WATER_BY_MONTH[id]?.at(-1) ?? 0,
    lastMeasureAt: () => tick,
  });
}

export function warehouseSnapshots(seed: DemoSeed, nowMs: number): WarehouseSnapshot[] {
  const anchor = seed.now.getTime();
  const tick = new Date(Math.floor(nowMs / (10 * MIN)) * 10 * MIN).toISOString();
  return computeWarehouseSnapshots({ warehouses: seed.warehouses, devices: liveDevices(seed, nowMs), lots: seed.lots }, (id, m) => valueAt(id, m, nowMs, anchor), { lastMeasureAt: () => tick });
}

/** Identifiant stable d'une alerte : même cause → même alerte (pas de doublons). */
export const alertId = alertKey;

/** Alertes ouvertes calculées à l'instant `nowMs`, plus l'historique résolu. */
export function liveAlerts(seed: DemoSeed, nowMs: number, overrides: Record<string, Partial<Alert>> = {}): Alert[] {
  const orgId = seed.organizations[0]!.id;
  const cands = computeAlertCandidates(
    {
      parcels: parcelSnapshots(seed, nowMs),
      devices: liveDevices(seed, nowMs).filter((d) => d.orgId === orgId),
      warehouses: warehouseSnapshots(seed, nowMs),
      parcelCode: (id) => seed.parcels.find((p) => p.id === id)?.code,
      warehouseName: (id) => seed.warehouses.find((w) => w.id === id)?.name,
    },
    new Date(nowMs),
  );
  const sevRank = { critique: 3, attention: 2, info: 1 } as const;
  const resp = seed.users.find((u) => u.id === "u-awa");
  const open: Alert[] = cands.map((c, i) => {
    const id = alertKey(c);
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
      notifications: c.severity === "info" || !resp ? [] : [{ channel: "sms", to: resp.phone, at: createdAt, delivered: true }],
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
