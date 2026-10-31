/**
 * Simulateur de mesures pour la démo. Chaque valeur est une fonction pure de (capteur, métrique,
 * instant) : pas de stockage, des courbes réalistes (cycles jour/nuit, irrigations, dérive d'un
 * stock qui s'abîme) et des valeurs qui continuent d'évoluer en direct après l'ancrage.
 * Les valeurs à l'ancrage reprennent celles des maquettes (parcelle B à 18 %, Mboro à 86 %…).
 */
import type { Metric, Series } from "../domain/types";

const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Bruit lisse déterministe (somme de sinusoïdes de phases propres au capteur). */
function smooth(key: string, tMs: number, amp: number): number {
  const p1 = hash(key + "a") * Math.PI * 2;
  const p2 = hash(key + "b") * Math.PI * 2;
  const p3 = hash(key + "c") * Math.PI * 2;
  const x = tMs / H;
  return amp * (0.55 * Math.sin(x / 5.3 + p1) + 0.3 * Math.sin(x / 1.7 + p2) + 0.15 * Math.sin(x / 0.6 + p3));
}

/** Petite variation par pas de 15 min (aspect « mesure réelle »). */
function jitter(key: string, tMs: number, amp: number): number {
  const step = Math.floor(tMs / (15 * MIN));
  return (hash(key + step) - 0.5) * 2 * amp;
}

/** Heure locale de Dakar (UTC+0) en heures décimales. */
const hourOf = (tMs: number) => ((tMs % D) + D) % D / H;
const diurnal = (tMs: number, peakHour: number) => Math.sin(((hourOf(tMs) - peakHour + 6) / 24) * Math.PI * 2);

/* ——— Sol ——— */

interface SoilProfile {
  target: number;
  /** Arrosages : heure, période en jours, décalage. */
  irr: { hour: number; everyDays: number } | null;
  /** Le dernier arrosage réussi remonte à N jours (scénario parcelle B). */
  lastIrrDaysAgo?: number;
  peakGain: number;
  tau: number; // heures
  drying: number; // points par jour au-delà du dernier arrosage
  offlineAtRel?: number; // ms relatifs à l'ancrage
  ph: number;
  ec: number;
  npk: [number, number, number];
}

const SOIL: Record<string, SoilProfile> = {
  "AS-0003": { target: 34, irr: { hour: 6, everyDays: 1 }, peakGain: 9, tau: 20, drying: 0, ph: 6.4, ec: 0.9, npk: [42, 18, 120] },
  "AS-0004": { target: 33, irr: { hour: 6, everyDays: 1 }, peakGain: 8, tau: 22, drying: 0, ph: 6.5, ec: 0.85, npk: [40, 17, 115] },
  "AS-0005": { target: 18, irr: { hour: 6, everyDays: 1 }, lastIrrDaysAgo: 3, peakGain: 12, tau: 26, drying: 2.6, ph: 6.9, ec: 1.3, npk: [28, 9, 95] },
  "AS-0006": { target: 36, irr: { hour: 5.8, everyDays: 1 }, peakGain: 9, tau: 18, drying: 0, ph: 6.2, ec: 0.7, npk: [36, 15, 105] },
  "AS-0007": { target: 48, irr: { hour: 18, everyDays: 2 }, peakGain: 10, tau: 30, drying: 0, ph: 7.1, ec: 1.6, npk: [55, 24, 140] },
  "AS-0008": { target: 47, irr: { hour: 18, everyDays: 2 }, peakGain: 10, tau: 30, drying: 0, ph: 7.0, ec: 1.5, npk: [52, 22, 136] },
  "AS-0009": { target: 31, irr: { hour: 7, everyDays: 3 }, peakGain: 11, tau: 34, drying: 0, ph: 6.6, ec: 1.1, npk: [33, 14, 110] },
  "AS-0010": { target: 30, irr: { hour: 7, everyDays: 3 }, peakGain: 11, tau: 34, drying: 0, ph: 6.7, ec: 1.0, npk: [31, 13, 108] },
  "AS-0011": { target: 29, irr: { hour: 6, everyDays: 1 }, peakGain: 9, tau: 20, drying: 0, offlineAtRel: -3 * H, ph: 6.3, ec: 0.8, npk: [35, 15, 100] },
};

function lastIrrigation(p: SoilProfile, tMs: number, anchor: number): number | null {
  if (!p.irr) return null;
  const { hour, everyDays } = p.irr;
  const dayStart = Math.floor(tMs / D) * D;
  let cand = dayStart + hour * H;
  if (cand > tMs) cand -= D;
  // aligne sur la période (jours pairs relatifs à l'ancrage)
  const anchorDay = Math.floor(anchor / D);
  while (((Math.floor(cand / D) - anchorDay) % everyDays + everyDays) % everyDays !== 0) cand -= D;
  if (p.lastIrrDaysAgo != null) {
    const limit = Math.floor(anchor / D) * D - p.lastIrrDaysAgo * D + hour * H;
    if (cand > limit) cand = limit;
  }
  return cand;
}

function soilMoistureRaw(id: string, p: SoilProfile, tMs: number, anchor: number): number {
  const li = lastIrrigation(p, tMs, anchor);
  const dtH = li == null ? 72 : (tMs - li) / H;
  const decay = p.peakGain * Math.exp(-dtH / p.tau);
  const dry = p.drying * Math.max(0, dtH / 24 - 1);
  return decay - dry - 1.2 * diurnal(tMs, 14) + smooth(id, tMs, 0.9);
}

/** Correction appliquée à l'humidité du sol (ex. irrigation lancée pendant la démo). */
let soilAdjust: ((deviceId: string, tMs: number) => number) | null = null;
export function setSoilAdjust(fn: ((deviceId: string, tMs: number) => number) | null) {
  soilAdjust = fn;
}
/** Alias de séries : un capteur remplacé reprend l'historique de l'ancien. */
const ALIASES: Record<string, string> = {};
export function setSeriesAlias(newId: string, oldId: string) {
  ALIASES[newId] = ALIASES[oldId] ?? oldId;
}

export function soilValue(id0: string, metric: Metric, tMs: number, anchor: number): number | null {
  const id = ALIASES[id0] ?? id0;
  const p = SOIL[id];
  if (!p) return null;
  if (p.offlineAtRel != null && tMs > anchor + p.offlineAtRel) return null;
  switch (metric) {
    case "soilMoisture": {
      const v = p.target + soilMoistureRaw(id, p, tMs, anchor) - soilMoistureRaw(id, p, anchor, anchor) + (soilAdjust?.(id0, tMs) ?? 0);
      return round1(Math.max(4, Math.min(62, v + jitter(id, tMs, 0.25))));
    }
    case "soilTemp":
      return round1(25.5 + 5.5 * diurnal(tMs, 15) + smooth(id + "t", tMs, 0.7));
    case "ph":
      return round1(p.ph + smooth(id + "ph", tMs, 0.08));
    case "ec":
      return Math.round((p.ec + smooth(id + "ec", tMs, 0.05)) * 100) / 100;
    case "n":
      return Math.round(p.npk[0] + smooth(id + "n", tMs, 2));
    case "p":
      return Math.round(p.npk[1] + smooth(id + "p", tMs, 1));
    case "k":
      return Math.round(p.npk[2] + smooth(id + "k", tMs, 4));
    case "battery":
      return batteryValue(id, tMs, anchor);
    default:
      return null;
  }
}

/* ——— Stockage ——— */

interface StoreProfile {
  /** Valeurs à l'ancrage. */
  temp: number;
  humidity: number;
  co2: number;
  gas: number;
  /** Valeurs 7 jours avant (la dérive est progressive). */
  from: { temp: number; humidity: number; co2: number; gas: number };
  /** La dérive démarre N jours avant l'ancrage. */
  rampDays: number;
  tempAmp: number;
  offlineAtRel?: number;
}

const S = (temp: number, humidity: number, co2: number, gas: number, from: StoreProfile["from"], rampDays = 7, tempAmp = 0.6, offlineAtRel?: number): StoreProfile => ({ temp, humidity, co2, gas, from, rampDays, tempAmp, offlineAtRel });

const STORE: Record<string, StoreProfile> = {
  // Mboro : l'humidité monte depuis une semaine, foyer de pourriture en rangée 2
  "OS-100": S(29.4, 86, 1850, 46, { temp: 28.6, humidity: 74, co2: 1180, gas: 14 }, 7, 1.4),
  "OS-101": S(28.6, 78, 1300, 22, { temp: 28.1, humidity: 72, co2: 1100, gas: 10 }),
  "OS-102": S(30.8, 92, 2950, 68, { temp: 28.4, humidity: 75, co2: 1240, gas: 16 }),
  "OS-103": S(29.6, 84, 1700, 38, { temp: 28.3, humidity: 73, co2: 1180, gas: 12 }),
  "OS-104": S(28.9, 80, 1450, 26, { temp: 28.2, humidity: 72, co2: 1150, gas: 11 }),
  // Potou : la rangée 3 chauffe depuis deux jours (scénario du film)
  "OS-200": S(27.5, 69, 1060, 14, { temp: 27.0, humidity: 68, co2: 1000, gas: 12 }, 7, 1.6),
  "OS-201": S(26.4, 68, 980, 12, { temp: 26.1, humidity: 67, co2: 960, gas: 11 }),
  "OS-202": S(27.2, 70, 1050, 15, { temp: 26.6, humidity: 69, co2: 990, gas: 12 }),
  "OS-203": S(31.0, 78, 1420, 31, { temp: 26.2, humidity: 66, co2: 1000, gas: 12 }, 2.2),
  "OS-204": S(26.8, 69, 1010, 14, { temp: 26.4, humidity: 68, co2: 990, gas: 12 }),
  // Ngomène : pommes de terre en ventilation forcée, conditions stables
  "OS-300": S(11.0, 91, 1380, 8, { temp: 11.2, humidity: 90, co2: 1350, gas: 8 }, 7, 0.4, -51 * H),
  "OS-301": S(11.2, 90, 1400, 8, { temp: 11.3, humidity: 90, co2: 1390, gas: 8 }, 7, 0.3),
  "OS-302": S(11.6, 91, 1450, 9, { temp: 11.5, humidity: 91, co2: 1430, gas: 9 }, 7, 0.3),
  "OS-303": S(11.9, 90, 1500, 9, { temp: 11.7, humidity: 90, co2: 1470, gas: 9 }, 7, 0.3),
};

/** Rampe douce : 0 avant le début de la dérive, 1 à l'ancrage, prolongée légèrement après. */
function ramp(tMs: number, anchor: number, days: number): number {
  const x = (tMs - (anchor - days * D)) / (days * D);
  if (x <= 0) return 0;
  if (x <= 1) return x * x * (3 - 2 * x);
  return 1 + Math.min(0.25, (x - 1) * 0.5); // après l'ancrage : la tendance continue doucement
}

export function storeValue(id0: string, metric: Metric, tMs: number, anchor: number): number | null {
  const id = ALIASES[id0] ?? id0;
  const p = STORE[id];
  if (!p) return null;
  if (p.offlineAtRel != null && tMs > anchor + p.offlineAtRel) return null;
  const r = ramp(tMs, anchor, p.rampDays);
  const lerp = (a: number, b: number) => a + (b - a) * r;
  switch (metric) {
    case "airTemp": {
      const base = lerp(p.from.temp, p.temp);
      const d = p.tempAmp * (diurnal(tMs, 15) - diurnal(anchor, 15));
      return round1(base + d + smooth(id + "t", tMs, 0.2) - smooth(id + "t", anchor, 0.2) + jitter(id + "t", tMs, 0.05));
    }
    case "airHumidity": {
      const base = lerp(p.from.humidity, p.humidity);
      const d = -1.8 * (diurnal(tMs, 15) - diurnal(anchor, 15));
      return round1(Math.min(99, base + d + smooth(id + "h", tMs, 0.6) - smooth(id + "h", anchor, 0.6)));
    }
    case "co2": {
      const base = lerp(p.from.co2, p.co2);
      return Math.round(base + smooth(id + "c", tMs, 25) - smooth(id + "c", anchor, 25) + jitter(id + "c", tMs, 6));
    }
    case "gas": {
      const base = lerp(p.from.gas, p.gas);
      return Math.round(Math.max(0, base + smooth(id + "g", tMs, 1.5) - smooth(id + "g", anchor, 1.5)));
    }
    case "battery":
      return batteryValue(id, tMs, anchor);
    default:
      return null;
  }
}

const BATTERY_AT_ANCHOR: Record<string, number> = {};
export function setBatteryTargets(map: Record<string, number | null>) {
  for (const [k, v] of Object.entries(map)) if (v != null) BATTERY_AT_ANCHOR[k] = v;
}
function batteryValue(id: string, tMs: number, anchor: number): number | null {
  const b = BATTERY_AT_ANCHOR[id] ?? BATTERY_AT_ANCHOR[ALIASES[id] ?? ""];
  if (b == null) return null;
  // ≈ 0,15 point par jour
  return Math.max(0, Math.min(100, Math.round(b - ((tMs - anchor) / D) * 0.15)));
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export const METRIC_UNIT: Record<Metric, string> = {
  soilMoisture: "%",
  soilTemp: "°C",
  ec: "dS/m",
  ph: "",
  n: "mg/kg",
  p: "mg/kg",
  k: "mg/kg",
  airTemp: "°C",
  airHumidity: "%",
  co2: "ppm",
  gas: "/100",
  battery: "%",
};

export const METRIC_LABEL: Record<Metric, string> = {
  soilMoisture: "Humidité du sol",
  soilTemp: "Température du sol",
  ec: "Conductivité",
  ph: "pH",
  n: "Azote (N)",
  p: "Phosphore (P)",
  k: "Potassium (K)",
  airTemp: "Température de l’air",
  airHumidity: "Humidité de l’air",
  co2: "CO₂",
  gas: "Gaz de pourriture",
  battery: "Batterie",
};

export function valueAt(deviceId: string, metric: Metric, tMs: number, anchor: number): number | null {
  if (deviceId.startsWith("AS-")) return soilValue(deviceId, metric, tMs, anchor);
  if (deviceId.startsWith("OS-")) return storeValue(deviceId, metric, tMs, anchor);
  return null;
}

/** Série échantillonnée. Le pas est choisi pour ne pas dépasser ~600 points. */
export function series(deviceId: string, metric: Metric, fromMs: number, toMs: number, anchor: number, stepMs?: number): Series {
  const span = Math.max(15 * MIN, toMs - fromMs);
  const step = stepMs ?? Math.max(15 * MIN, Math.ceil(span / 600 / (15 * MIN)) * 15 * MIN);
  const start = Math.ceil(fromMs / step) * step;
  const points: Array<[number, number | null]> = [];
  for (let t = start; t <= toMs; t += step) points.push([t, valueAt(deviceId, metric, t, anchor)]);
  return { deviceId, metric, unit: METRIC_UNIT[metric], points };
}

/** Eau consommée (m³) par mois, de l'ancien au plus récent, pour chaque parcelle. */
export const WATER_BY_MONTH: Record<string, number[]> = {
  "p-a": [1.6, 2.0, 1.1, 0.5, 1.4, 2.1],
  "p-b": [2.4, 3.0, 1.6, 0.8, 2.2, 3.4],
  "p-c": [1.5, 1.8, 1.0, 0.5, 1.3, 1.9],
  "p-d": [1.0, 1.2, 0.7, 0.3, 0.8, 1.2],
  "p-e": [0.9, 1.1, 0.6, 0.3, 0.7, 0.8],
  "p-f": [2.4, 3.0, 1.4, 0.8, 2.2, 2.6],
};
