/**
 * Météo du site via Open-Meteo (sans clé), mise en cache 30 minutes par site.
 * ET0 calculée par Open-Meteo (FAO-56 Penman-Monteith). Hors ligne : estimation saisonnière, marquée `simulated`.
 */
import type { WeatherNow } from "@saytumbay/shared";
import type { AppContext } from "../context";

const cache = new Map<string, { at: number; value: WeatherNow }>();
const DIRS = ["N", "N-E", "E", "S-E", "S", "S-O", "O", "N-O"];

function fallback(locality: string, now: Date): WeatherNow {
  const h = now.getUTCHours() + now.getUTCMinutes() / 60;
  const t = 27 + 5 * Math.sin(((h - 9) / 24) * Math.PI * 2);
  return { locality, temp: Math.round(t), feelsLike: Math.round(t + 2), min: 23, max: 33, windKmh: 14, windDir: "N-E", rainTomorrowMm: 0, et0Mm: 6.1, condition: "ensoleille", simulated: true };
}

export async function weatherFor(ctx: AppContext, center: [number, number], locality: string): Promise<WeatherNow> {
  const key = `${center[0].toFixed(2)},${center[1].toFixed(2)}`;
  const hit = cache.get(key);
  const now = ctx.now();
  if (hit && now.getTime() - hit.at < 30 * 60_000) return hit.value;
  if (ctx.env.WEATHER === "off" || ctx.env.NODE_ENV === "test") return fallback(locality, now);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${center[0]}&longitude=${center[1]}&current=temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration&timezone=Africa%2FDakar&forecast_days=2`;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(String(r.status));
    const j = (await r.json()) as {
      current: { temperature_2m: number; apparent_temperature: number; wind_speed_10m: number; wind_direction_10m: number; weather_code: number };
      daily: { temperature_2m_min: number[]; temperature_2m_max: number[]; precipitation_sum: number[]; et0_fao_evapotranspiration: number[] };
    };
    const code = j.current.weather_code;
    const value: WeatherNow = {
      locality,
      temp: Math.round(j.current.temperature_2m),
      feelsLike: Math.round(j.current.apparent_temperature),
      min: Math.round(j.daily.temperature_2m_min[0] ?? 0),
      max: Math.round(j.daily.temperature_2m_max[0] ?? 0),
      windKmh: Math.round(j.current.wind_speed_10m),
      windDir: DIRS[Math.round(j.current.wind_direction_10m / 45) % 8]!,
      rainTomorrowMm: Math.round((j.daily.precipitation_sum[1] ?? 0) * 10) / 10,
      et0Mm: Math.round((j.daily.et0_fao_evapotranspiration[0] ?? 0) * 10) / 10,
      condition: code >= 51 ? "pluie" : code >= 2 ? "nuageux" : "ensoleille",
      simulated: false,
    };
    cache.set(key, { at: now.getTime(), value });
    return value;
  } catch (e) {
    ctx.log.warn({ err: String(e) }, "météo indisponible, estimation utilisée");
    return fallback(locality, now);
  }
}
