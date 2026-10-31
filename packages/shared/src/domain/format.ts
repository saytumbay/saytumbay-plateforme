/** Formatage français (Sénégal) : nombres, unités, montants FCFA, dates en heure de Dakar. */

export const TZ = "Africa/Dakar";
const NBSP = " ";
const NNBSP = " ";

const nf = (min: number, max: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: min, maximumFractionDigits: max });
const n0 = nf(0, 0);
const n1 = nf(0, 1);
const n1f = nf(1, 1);

/** Espaces fines insécables (fr-FR) remplacées par des insécables normales : rendu homogène partout. */
const clean = (s: string) => s.replace(new RegExp(NNBSP, "g"), NBSP);

export function num(v: number | null | undefined, digits: 0 | 1 = 0, fixed = false): string {
  if (v == null || Number.isNaN(v)) return "—";
  return clean(digits === 0 ? n0.format(v) : fixed ? n1f.format(v) : n1.format(v));
}

export function pct(v: number | null | undefined, digits: 0 | 1 = 0): string {
  return v == null ? "—" : `${num(v, digits)}${NBSP}%`;
}

export function temp(v: number | null | undefined, digits: 0 | 1 = 1): string {
  return v == null ? "—" : `${num(v, digits)}${NBSP}°C`;
}

export function ppm(v: number | null | undefined): string {
  return v == null ? "—" : `${num(v)}${NBSP}ppm`;
}

export function fcfa(v: number | null | undefined, withUnit = true): string {
  if (v == null) return "—";
  return withUnit ? `${num(v)}${NBSP}FCFA` : num(v);
}

export function tonnes(v: number | null | undefined): string {
  if (v == null) return "—";
  return v < 1 ? `${num(v * 1000)}${NBSP}kg` : `${num(v, 1)}${NBSP}t`;
}

export function hectares(v: number): string {
  return `${num(v, 1)}${NBSP}ha`;
}

export function m3(v: number | null | undefined): string {
  return v == null ? "—" : `${num(v, 1)}${NBSP}m³`;
}

const dShort = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ });
const dLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });
const dMonth = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric", timeZone: TZ });
const dDayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: TZ });
const tHM = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });

export const date = (d: string | number | Date) => dShort.format(new Date(d));
export const dateLong = (d: string | number | Date) => dLong.format(new Date(d));
export const monthYear = (d: string | number | Date) => dMonth.format(new Date(d));
export const dayMonth = (d: string | number | Date) => dDayMonth.format(new Date(d));
export const time = (d: string | number | Date) => tHM.format(new Date(d)).replace(":", NBSP + "h" + NBSP).replace(/h\s00$/, "h");
export const hm = (d: string | number | Date) => tHM.format(new Date(d));

/** « il y a 5 min », « hier à 18:00 », « 12/10/2026 ». */
export function ago(d: string | number | Date | null | undefined, now: Date = new Date()): string {
  if (d == null) return "jamais";
  const t = new Date(d).getTime();
  const s = Math.round((now.getTime() - t) / 1000);
  if (s < 45) return "à l’instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m}${NBSP}min`;
  const h = Math.round(m / 60);
  if (h < 24 && sameDay(t, now.getTime())) return `il y a ${h}${NBSP}h`;
  if (isYesterday(t, now.getTime())) return `hier à ${hm(t)}`;
  const days = Math.floor(s / 86400);
  if (days < 7) return `il y a ${Math.max(1, days)}${NBSP}j`;
  return date(t);
}

function dakarDayKey(t: number) {
  return new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
}
function sameDay(a: number, b: number) {
  return dakarDayKey(a) === dakarDayKey(b);
}
function isYesterday(a: number, b: number) {
  return dakarDayKey(a) === dakarDayKey(b - 86400000);
}

export function initials(first: string, last: string): string {
  return `${first.trim()[0] ?? ""}${last.trim()[0] ?? ""}`.toUpperCase();
}

export function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`;
}

/** Numéro sénégalais lisible : +221 77 412 08 33. */
export function phone(p: string): string {
  const d = p.replace(/\D/g, "");
  const local = d.startsWith("221") ? d.slice(3) : d;
  if (local.length !== 9) return p;
  return `+221 ${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${num(n)}${NBSP}${Math.abs(n) >= 2 ? many : one}`;
}
