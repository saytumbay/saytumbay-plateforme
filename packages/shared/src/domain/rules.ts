/**
 * Règles métier partagées : état hydrique d'une parcelle, risque de conservation d'un stock,
 * état d'un capteur et génération des alertes. Les mêmes fonctions servent à l'API (moteur
 * d'alertes) et au mode démo, pour que l'interface et le serveur disent toujours la même chose.
 */
import type {
  Alert,
  AlertKind,
  Device,
  DeviceStatus,
  MoistureState,
  Parcel,
  Severity,
  StorageRisk,
  StorageThresholds,
  Warehouse,
} from "./types";

export const OFFLINE_AFTER_MIN = 90;
export const LOW_BATTERY = 20;

export function moistureState(value: number | null | undefined, range: { dry: number; wet: number }): MoistureState {
  if (value == null || Number.isNaN(value)) return "indisponible";
  if (value < range.dry) return "sec";
  if (value > range.wet) return "humide";
  return "optimal";
}

export function deviceStatus(d: Pick<Device, "battery" | "lastSeenAt" | "status">, now: Date): DeviceStatus {
  if (d.status === "maintenance") return "maintenance";
  if (!d.lastSeenAt) return "hors_ligne";
  const ageMin = (now.getTime() - new Date(d.lastSeenAt).getTime()) / 60000;
  if (ageMin > OFFLINE_AFTER_MIN) return "hors_ligne";
  if (d.battery != null && d.battery < LOW_BATTERY) return "batterie_faible";
  return "en_ligne";
}

/**
 * Score de risque de conservation (0–100) à partir des conditions mesurées.
 * Chaque dépassement de seuil ajoute une part pondérée ; le CO₂ et le gaz de pourriture
 * pèsent plus lourd car ils trahissent une respiration anormale ou un début de pourriture.
 */
export function storageRiskScore(
  m: { temp: number | null; humidity: number | null; co2: number | null; gas: number | null },
  t: StorageThresholds,
): number | null {
  if (m.temp == null && m.humidity == null && m.co2 == null && m.gas == null) return null;
  let score = 0;
  if (m.humidity != null) {
    const over = m.humidity - t.humidity[1];
    const under = t.humidity[0] - m.humidity;
    if (over > 0) score += Math.min(35, over * 2.2);
    else if (over > -3) score += 8;
    if (under > 0) score += Math.min(10, under * 1); // trop sec : perte de poids
  }
  if (m.temp != null) {
    const over = m.temp - t.temp[1];
    const under = t.temp[0] - m.temp;
    if (over > 0) score += Math.min(25, over * 6);
    else if (over > -2) score += 6;
    if (under > 0) score += Math.min(10, under * 3);
  }
  if (m.co2 != null) {
    const ratio = m.co2 / t.co2;
    if (ratio > 1) score += Math.min(30, (ratio - 1) * 45);
    else if (ratio > 0.85) score += 6;
  }
  if (m.gas != null) {
    const ratio = m.gas / t.gas;
    if (ratio > 1) score += Math.min(30, (ratio - 1) * 40);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function storageRisk(score: number | null): StorageRisk {
  if (score == null) return "bon";
  if (score >= 75) return "pourriture";
  if (score >= 45) return "risque";
  if (score >= 20) return "surveiller";
  return "bon";
}

/** Explications en langage simple, dans l'ordre d'importance. */
export function storageReasons(
  m: { temp: number | null; humidity: number | null; co2: number | null; gas: number | null },
  t: StorageThresholds,
): string[] {
  const out: string[] = [];
  const f = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  if (m.humidity != null && m.humidity > t.humidity[1])
    out.push(`Humidité de l’air à ${f(m.humidity)} %, au-dessus de la plage visée (${t.humidity[0]} à ${t.humidity[1]} %).`);
  if (m.co2 != null && m.co2 > t.co2)
    out.push(`CO₂ à ${Math.round(m.co2).toLocaleString("fr-FR")} ppm : des bulbes respirent trop ou commencent à pourrir.`);
  if (m.gas != null && m.gas > t.gas) out.push(`Gaz de pourriture à ${Math.round(m.gas)} / 100, au-dessus du seuil (${t.gas}).`);
  if (m.temp != null && m.temp > t.temp[1])
    out.push(`Température à ${f(m.temp)} °C, au-dessus de la plage visée (${t.temp[0]} à ${t.temp[1]} °C).`);
  if (m.temp != null && m.temp < t.temp[0]) out.push(`Température à ${f(m.temp)} °C, sous la plage visée.`);
  if (m.humidity != null && m.humidity < t.humidity[0])
    out.push(`Air trop sec (${f(m.humidity)} %) : les bulbes perdent du poids.`);
  return out;
}

export const RISK_LABEL: Record<StorageRisk, string> = {
  bon: "Bonne conservation",
  surveiller: "À surveiller",
  risque: "Risque de pourriture",
  pourriture: "Pourriture probable",
};

export const MOISTURE_LABEL: Record<MoistureState, string> = {
  sec: "Sec",
  optimal: "Dans la plage",
  humide: "Humide",
  indisponible: "Indisponible",
};

export const DEVICE_STATUS_LABEL: Record<DeviceStatus, string> = {
  en_ligne: "En ligne",
  batterie_faible: "Batterie faible",
  hors_ligne: "Hors ligne",
  maintenance: "Maintenance",
};

export const SEVERITY_LABEL: Record<Severity, string> = { info: "Info", attention: "À surveiller", critique: "Critique" };

/** Conseil d'action associé à chaque type d'alerte (affiché et repris dans le SMS). */
export const ADVICE: Record<AlertKind, string> = {
  sol_sec: "Lancer une irrigation ou vérifier que la règle automatique est active.",
  sol_humide: "Suspendre l’irrigation et vérifier le drainage de la parcelle.",
  capteur_hors_ligne: "Vérifier l’alimentation et l’antenne du capteur, puis sa portée jusqu’à la passerelle.",
  batterie_faible: "Prévoir le remplacement de la batterie lors du prochain passage.",
  stock_humidite: "Aérer le magasin cette nuit et contrôler les sacs de la zone concernée.",
  stock_temperature: "Ouvrir les aérations aux heures fraîches et éviter d’entasser de nouveaux sacs.",
  stock_co2: "Aérer et ouvrir quelques sacs de la zone pour chercher des bulbes mous.",
  stock_gaz: "Sortir et trier les sacs de la zone en priorité.",
  stock_controle: "Trier la zone et vendre en priorité les lots touchés.",
  irrigation_annulee: "Remettre le capteur en ligne ou arroser manuellement en attendant.",
};

/** SMS court, lisible sur un téléphone à touches (≤ 160 caractères si possible). */
export function smsText(a: Pick<Alert, "title" | "kind">, orgShort: string): string {
  const base = `${orgShort} : ${a.title}. ${ADVICE[a.kind]}`;
  return base.length <= 160 ? base : base.slice(0, 157) + "…";
}

export interface AlertCandidate {
  kind: AlertKind;
  severity: Severity;
  title: string;
  detail: string;
  source: Alert["source"];
  module: Alert["module"];
}

/** Alertes d'une parcelle à partir de sa dernière mesure. */
export function parcelAlerts(p: Parcel, moisture: number | null): AlertCandidate[] {
  const st = moistureState(moisture, p.moisture);
  const src = { type: "parcelle" as const, id: p.id, label: `Parcelle ${p.code}` };
  if (st === "sec" && moisture != null) {
    return [
      {
        kind: "sol_sec",
        severity: moisture < p.moisture.dry - 8 ? "critique" : "attention",
        title: `Parcelle ${p.code} est sèche (${Math.round(moisture)} %)`,
        detail: `Humidité du sol à ${Math.round(moisture)} %, sous le seuil de ${p.moisture.dry} % (${p.crop}).`,
        source: src,
        module: "agritech",
      },
    ];
  }
  if (st === "humide" && moisture != null) {
    return [
      {
        kind: "sol_humide",
        severity: "info",
        title: `Parcelle ${p.code} est trop humide (${Math.round(moisture)} %)`,
        detail: `Humidité du sol à ${Math.round(moisture)} %, au-dessus de ${p.moisture.wet} %.`,
        source: src,
        module: "agritech",
      },
    ];
  }
  return [];
}

export function deviceAlerts(d: Device, now: Date, label: string): AlertCandidate[] {
  const st = deviceStatus(d, now);
  const module = d.kind === "stockage" || d.warehouseId ? "onion" : "agritech";
  if (st === "hors_ligne") {
    return [
      {
        kind: "capteur_hors_ligne",
        severity: "attention",
        title: `${d.id} ne répond plus`,
        detail: `Aucune mesure reçue depuis ${d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Dakar" }) : "l’installation"} (${label}).`,
        source: { type: "capteur", id: d.id, label },
        module,
      },
    ];
  }
  if (st === "batterie_faible") {
    return [
      {
        kind: "batterie_faible",
        severity: "info",
        title: `Batterie faible sur ${d.id} (${d.battery} %)`,
        detail: `Environ deux semaines d’autonomie restante (${label}).`,
        source: { type: "capteur", id: d.id, label },
        module,
      },
    ];
  }
  return [];
}

export function warehouseAlerts(
  w: Warehouse,
  zone: { zoneId: string; temp: number | null; humidity: number | null; co2: number | null; gas: number | null },
): AlertCandidate[] {
  const t = w.thresholds;
  const out: AlertCandidate[] = [];
  const label = `${w.name} · zone ${zone.zoneId}`;
  const src = { type: "zone" as const, id: `${w.id}:${zone.zoneId}`, label };
  const f = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  if (zone.gas != null && zone.gas > t.gas)
    out.push({ kind: "stock_gaz", severity: "critique", title: `Gaz de pourriture en zone ${zone.zoneId} (${w.name})`, detail: `Indice ${Math.round(zone.gas)} / 100, seuil ${t.gas}.`, source: src, module: "onion" });
  if (zone.temp != null && zone.temp > t.temp[1])
    out.push({ kind: "stock_temperature", severity: zone.temp > t.temp[1] + 3 ? "critique" : "attention", title: `La zone ${zone.zoneId} chauffe (${f(zone.temp)} °C, ${w.name})`, detail: `Au-dessus de la plage visée (${t.temp[0]} à ${t.temp[1]} °C).`, source: src, module: "onion" });
  if (zone.humidity != null && zone.humidity > t.humidity[1])
    out.push({ kind: "stock_humidite", severity: zone.humidity > t.humidity[1] + 10 ? "critique" : "attention", title: `Humidité ${f(zone.humidity)} % en zone ${zone.zoneId} (${w.name})`, detail: `Au-dessus de la plage visée (${t.humidity[0]} à ${t.humidity[1]} %).`, source: src, module: "onion" });
  if (zone.co2 != null && zone.co2 > t.co2)
    out.push({ kind: "stock_co2", severity: zone.co2 > t.co2 * 1.5 ? "critique" : "attention", title: `CO₂ élevé en zone ${zone.zoneId} (${w.name})`, detail: `${Math.round(zone.co2).toLocaleString("fr-FR")} ppm, seuil ${t.co2.toLocaleString("fr-FR")} ppm.`, source: src, module: "onion" });
  return out;
}

/** Met la première lettre en minuscule, sauf sigle (CO₂, pH…). */
export function lowerFirst(s: string): string {
  if (/^[A-Z][A-Z0-9₂]/.test(s) || /^pH/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Évapotranspiration de référence (Hargreaves), en mm/jour. Ra en MJ/m²/jour. */
export function et0Hargreaves(tMin: number, tMax: number, ra: number): number {
  const tMean = (tMin + tMax) / 2;
  return 0.0023 * (tMean + 17.8) * Math.sqrt(Math.max(0, tMax - tMin)) * ra * 0.408;
}
