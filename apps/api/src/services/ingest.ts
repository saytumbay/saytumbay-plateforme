/**
 * Ingestion des mesures.
 *
 * Deux formats reçus par MQTT :
 * - SaytuMbay : sujet `saytumbay/{org}/{capteur}/data`, charge JSON validée par `telemetrySchema`.
 *   L'organisation du sujet doit être celle du capteur (un client ne peut pas écrire chez un autre).
 * - ChirpStack v4 : sujet `application/{app}/device/{devEUI}/event/up`, objet décodé par le codec
 *   du profil (Dragino LSE01 : water_SOIL, temp_SOIL, conduct_SOIL, Bat). Le DevEUI est rattaché au capteur.
 */
import { telemetrySchema, type Metric, type Telemetry } from "@saytumbay/shared";
import type { AppContext } from "../context";
import { measurements } from "../db/schema";

const METRICS: Metric[] = ["soilMoisture", "soilTemp", "ec", "ph", "n", "p", "k", "airTemp", "airHumidity", "co2", "gas", "battery"];
const signalOf = (rssi: number | undefined): 0 | 1 | 2 | 3 | 4 => (rssi == null ? 0 : rssi > -90 ? 4 : rssi > -100 ? 3 : rssi > -110 ? 2 : rssi > -120 ? 1 : 0);

export type IngestResult = "ok" | "inconnu" | "refuse" | "invalide";

export async function ingest(ctx: AppContext, deviceId: string, raw: unknown, opts: { orgFromTopic?: string; onIngested?: (orgId: string) => void } = {}): Promise<IngestResult> {
  const found = await ctx.repos.devices.find(deviceId);
  if (!found) return "inconnu";
  if (opts.orgFromTopic && opts.orgFromTopic !== found.orgId) {
    ctx.log.warn({ deviceId, topicOrg: opts.orgFromTopic }, "mesure refusée : organisation du sujet différente de celle du capteur");
    return "refuse";
  }
  const r = telemetrySchema.safeParse(raw);
  if (!r.success) return "invalide";
  const t: Telemetry = r.data;
  const now = ctx.now().getTime();
  // Horodatage du capteur accepté s'il est plausible (≤ 7 jours, pas dans le futur), sinon heure de réception.
  const tsMs = t.ts == null ? now : t.ts < 1e12 ? t.ts * 1000 : t.ts;
  const at = new Date(tsMs > now + 5 * 60_000 || tsMs < now - 7 * 24 * 3600_000 ? now : tsMs);
  const rows = METRICS.filter((m) => typeof t[m as keyof Telemetry] === "number").map((m) => ({ deviceId, metric: m, ts: at, value: t[m as keyof Telemetry] as number }));
  if (rows.length) await ctx.db.insert(measurements).values(rows).onConflictDoNothing();
  const d = found.data;
  await ctx.repos.devices.update(found.orgId, deviceId, {
    lastSeenAt: new Date(Math.max(at.getTime(), d.lastSeenAt ? new Date(d.lastSeenAt).getTime() : 0)).toISOString(),
    ...(t.battery != null ? { battery: Math.round(t.battery) } : {}),
    ...(t.rssi != null ? { rssi: Math.round(t.rssi), signal: signalOf(t.rssi) } : {}),
    ...(t.fw ? { firmware: t.fw } : {}),
    ...(d.status === "hors_ligne" ? { status: "en_ligne" as const } : {}),
  });
  opts.onIngested?.(found.orgId);
  return "ok";
}

/** Convertit une remontée ChirpStack v4 en télémétrie SaytuMbay. */
export function fromChirpstack(msg: unknown): { devEui: string; telemetry: Telemetry } | null {
  if (!msg || typeof msg !== "object") return null;
  const m = msg as { time?: string; deviceInfo?: { devEui?: string }; object?: Record<string, unknown>; rxInfo?: Array<{ rssi?: number }> };
  const devEui = m.deviceInfo?.devEui?.toLowerCase();
  if (!devEui || !/^[0-9a-f]{16}$/.test(devEui)) return null;
  const o = m.object ?? {};
  const num = (...keys: string[]) => {
    for (const k of keys) {
      const v = Number(o[k]);
      if (o[k] != null && Number.isFinite(v)) return v;
    }
    return undefined;
  };
  const bat = num("Bat", "BatV", "battery");
  const telemetry: Telemetry = {
    ts: m.time ? Date.parse(m.time) : undefined,
    soilMoisture: num("water_SOIL", "soilMoisture"),
    soilTemp: num("temp_SOIL", "soilTemp"),
    // LSE01 : conductivité en µS/cm ; 1 dS/m = 1000 µS/cm.
    ec: num("conduct_SOIL") != null ? num("conduct_SOIL")! / 1000 : num("ec"),
    airTemp: num("TempC_SHT", "airTemp"),
    airHumidity: num("Hum_SHT", "airHumidity"),
    co2: num("co2", "CO2"),
    // Pile lithium 3,6 V : 3,0 V ≈ vide, 3,6 V ≈ pleine (approximation linéaire).
    battery: bat == null ? undefined : bat > 10 ? bat : Math.max(0, Math.min(100, Math.round(((bat - 3.0) / 0.6) * 100))),
    rssi: m.rxInfo?.[0]?.rssi,
  };
  for (const k of Object.keys(telemetry) as Array<keyof Telemetry>) if (telemetry[k] === undefined) delete telemetry[k];
  return { devEui, telemetry };
}
