/**
 * Graphiques SaytuMbay. Règles appliquées : un seul axe vertical, traits fins (2 px), grille discrète,
 * infobulle au survol, couleurs d'identité validées (daltonisme) et jamais utilisées pour un état,
 * légende dès deux séries, plage visée affichée en bande, valeurs manquantes laissées en trou.
 */
import { useId, useMemo, type ReactNode } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { fmt } from "@saytumbay/shared";
import { cn } from "@/lib/cn";

export const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

const axisTick = { fill: "var(--ink-3)", fontSize: 12, fontFamily: "var(--font-sans)" };
const DAY = 86400000;

export interface TS {
  key: string;
  name: string;
  color?: string;
  points: Array<[number, number | null]>;
}

function fmtTick(span: number) {
  return (t: number) => (span <= 2 * DAY ? fmt.hm(t) : fmt.dayMonth(t));
}

function ChartTooltip({ active, payload, label, unit, digits, names }: { active?: boolean; payload?: Array<{ dataKey: string; value: number | null; color: string }>; label?: number; unit: string; digits: 0 | 1; names: Record<string, string> }) {
  if (!active || !payload?.length || label == null) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-2">
      <p className="mb-1 text-[12px] text-ink-3">{new Date(label).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dakar" })}</p>
      {payload
        .filter((p) => !String(p.dataKey).startsWith("_"))
        .map((p) => (
          <p key={p.dataKey} className="flex items-center gap-2 text-[13px]">
            <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} aria-hidden />
            {payload.length > 1 && <span className="text-ink-2">{names[p.dataKey]}</span>}
            <span className="ml-auto font-display font-semibold tabular text-ink">{p.value == null ? "Indisponible" : `${fmt.num(p.value, digits)}${unit ? " " + unit : ""}`}</span>
          </p>
        ))}
    </div>
  );
}

/** Courbes temporelles (1 à 3 séries) avec bande de plage visée et lignes de seuil. */
export function TimeSeriesChart({
  series,
  unit,
  band,
  bandLabel = "Plage visée",
  thresholds = [],
  height = 260,
  yDomain,
  digits = 0,
  area = false,
  ariaLabel,
}: {
  series: TS[];
  unit: string;
  band?: [number, number];
  bandLabel?: string;
  thresholds?: Array<{ y: number; label: string }>;
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
  digits?: 0 | 1;
  area?: boolean;
  ariaLabel: string;
}) {
  const gid = useId().replace(/:/g, "");
  const data = useMemo(() => {
    const map = new Map<number, Record<string, number | null>>();
    for (const s of series) for (const [t, v] of s.points) map.set(t, { ...(map.get(t) ?? { t }), [s.key]: v });
    return [...map.values()].sort((a, b) => (a.t as number) - (b.t as number));
  }, [series]);
  const t0 = data.length ? (data[0]!.t as number) : 0;
  const t1 = data.length ? (data[data.length - 1]!.t as number) : DAY;
  const span = t1 - t0;
  const ticks = useMemo(() => {
    if (!data.length) return undefined;
    const step = span <= 2 * DAY ? 6 * 3600000 : span <= 10 * DAY ? DAY : span <= 40 * DAY ? 5 * DAY : 15 * DAY;
    const out: number[] = [];
    for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) out.push(t);
    return out;
  }, [t0, t1, span, data.length]);
  const names = Object.fromEntries(series.map((s) => [s.key, s.name]));
  const colors = series.map((s, i) => s.color ?? SERIES[i] ?? SERIES[0]!);
  return (
    <figure className="w-full" aria-label={ariaLabel} role="img">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <defs>
              {colors.map((c, i) => (
                <linearGradient key={i} id={`${gid}-g${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            {band && <ReferenceArea y1={band[0]} y2={band[1]} fill="var(--brand)" fillOpacity={0.09} stroke="none" ifOverflow="extendDomain" label={{ value: bandLabel, position: "insideTopLeft", fill: "var(--ink-3)", fontSize: 11 }} />}
            {thresholds.map((th) => (
              <ReferenceLine key={th.label} y={th.y} stroke="var(--ink-3)" strokeDasharray="4 4" strokeWidth={1} ifOverflow="extendDomain" label={{ value: th.label, position: "insideTopRight", fill: "var(--ink-3)", fontSize: 11 }} />
            ))}
            <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} ticks={ticks} tickFormatter={fmtTick(span)} tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} domain={yDomain ?? ["auto", "auto"]} tickFormatter={(v: number) => `${fmt.num(v)}${unit === "%" ? " %" : ""}`} />
            <Tooltip content={<ChartTooltip unit={unit} digits={digits} names={names} />} cursor={{ stroke: "var(--ink-3)", strokeWidth: 1, strokeDasharray: "3 3" }} />
            {series.map((s, i) =>
              area && series.length === 1 ? (
                <Area key={s.key} type="monotone" dataKey={s.key} stroke={colors[i]} strokeWidth={2} fill={`url(#${gid}-g${i})`} connectNulls={false} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
              ) : (
                <Line key={s.key} type="monotone" dataKey={s.key} stroke={colors[i]} strokeWidth={2} dot={false} connectNulls={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 && (
        <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-2">
          {series.map((s, i) => (
            <span key={s.key} className="inline-flex items-center gap-2">
              <span className="h-0.5 w-4 rounded-full" style={{ background: colors[i] }} aria-hidden />
              {s.name}
            </span>
          ))}
          {band && (
            <span className="inline-flex items-center gap-2">
              <span className="h-3 w-4 rounded-sm bg-brand/15" aria-hidden />
              {bandLabel}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/** Barres mensuelles (une seule teinte). L'option `stack` ajoute une seconde part (ex. eau économisée). */
export function MonthBars({ data, unit, height = 220, highlightLast = true, color = "var(--water)", stack, ariaLabel }: { data: Array<{ month: string; value: number; extra?: number }>; unit: string; height?: number; highlightLast?: boolean; color?: string; stack?: { label: string; color: string; mainLabel: string }; ariaLabel: string }) {
  const rows = data.map((d) => ({ ...d, label: monthShort(d.month) }));
  return (
    <figure aria-label={ariaLabel} role="img">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 shadow-2 text-[13px]">
                    <p className="mb-1 text-[12px] text-ink-3">{label}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />
                        <span className="text-ink-2">{p.dataKey === "extra" ? stack?.label : (stack?.mainLabel ?? "Valeur")}</span>
                        <span className="ml-auto pl-3 font-display font-semibold tabular">{fmt.num(Number(p.value), 1)}&nbsp;{unit}</span>
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            <Bar dataKey="value" stackId="a" fill={color} radius={stack ? [0, 0, 0, 0] : [4, 4, 0, 0]} isAnimationActive={false} stroke="var(--surface)" strokeWidth={stack ? 2 : 0}>
              {rows.map((_, i) => (
                <Cell key={i} fillOpacity={highlightLast && !stack && i < rows.length - 1 ? 0.55 : 1} />
              ))}
            </Bar>
            {stack && <Bar dataKey="extra" stackId="a" fill={stack.color} radius={[4, 4, 0, 0]} isAnimationActive={false} stroke="var(--surface)" strokeWidth={2} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {stack && (
        <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-2">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: color }} aria-hidden />
            {stack.mainLabel}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: stack.color }} aria-hidden />
            {stack.label}
          </span>
        </figcaption>
      )}
    </figure>
  );
}

/** Courbes mensuelles (axe catégoriel), 2 à 3 séries comparées sur une même échelle. Montants abrégés en « k ». */
export function MonthLines({ data, series, unit, height = 240, ariaLabel }: { data: Array<{ month: string } & Record<string, number | string>>; series: Array<{ key: string; name: string; color?: string; dashed?: boolean }>; unit: string; height?: number; ariaLabel: string }) {
  const rows = data.map((d) => ({ ...d, label: monthShort(d.month) }));
  const colors = series.map((s, i) => s.color ?? SERIES[i] ?? SERIES[0]!);
  const k = (v: number) => (Math.abs(v) >= 1000 ? `${fmt.num(v / 1000)} k` : fmt.num(v));
  return (
    <figure aria-label={ariaLabel} role="img" className="w-full">
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 0, left: -4 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} padding={{ left: 12, right: 12 }} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} tickFormatter={k} />
            <Tooltip
              cursor={{ stroke: "var(--ink-3)", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] shadow-2">
                    <p className="mb-1 text-[12px] text-ink-3">{label}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="flex items-center gap-2">
                        <span className="h-0.5 w-3 rounded-full" style={{ background: p.color }} aria-hidden />
                        <span className="text-ink-2">{series.find((s) => s.key === p.dataKey)?.name}</span>
                        <span className="ml-auto pl-3 font-display font-semibold tabular">
                          {fmt.num(Number(p.value))}&nbsp;{unit}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            {series.map((s, i) => (
              <Line key={s.key} type="linear" dataKey={s.key} stroke={colors[i]} strokeWidth={2} strokeDasharray={s.dashed ? "5 4" : undefined} dot={{ r: 3.5, strokeWidth: 2, stroke: "var(--surface)", fill: colors[i] }} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-2">
        {series.map((s, i) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <svg width="16" height="4" aria-hidden>
              <line x1="0" y1="2" x2="16" y2="2" stroke={colors[i]} strokeWidth="2" strokeDasharray={s.dashed ? "4 3" : undefined} />
            </svg>
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** « d’octobre », « de mai » : nom du mois avec la préposition élidée. */
export function ofMonth(key: string): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  const name = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" });
  return /^[aeiouyéèh]/i.test(name) ? `d’${name}` : `de ${name}`;
}

export function monthLong(key: string): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("fr-FR", { month: "long", timeZone: "UTC" });
}

export function monthShort(key: string): string {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }).replace(".", "");
}

/**
 * Mini-courbe pour les petits multiples : une parcelle, sa plage visée, sa dernière valeur.
 * SVG pur (léger) ; le dernier point porte l'état.
 */
export function Sparkline({ points, band, height = 56, className, label, stateColor = "var(--ink)", domain: domainProp }: { points: Array<[number, number | null]>; band?: [number, number]; height?: number; className?: string; label: string; stateColor?: string; domain?: [number, number] }) {
  const W = 240;
  const H = height;
  const valid = points.filter((p): p is [number, number] => p[1] != null);
  if (!points.length) return null;
  const vals = valid.map((p) => p[1]).concat(band ?? []);
  const lo = vals.length ? Math.min(...vals) : 0;
  const hi = vals.length ? Math.max(...vals) : 60;
  const pad = Math.max(2, (hi - lo) * 0.12);
  const domain: [number, number] = domainProp ?? [lo - pad, hi + pad];
  const t0 = points[0]![0];
  const t1 = points[points.length - 1]![0];
  const x = (t: number) => ((t - t0) / Math.max(1, t1 - t0)) * (W - 8) + 4;
  const y = (v: number) => H - 4 - ((v - domain[0]) / (domain[1] - domain[0])) * (H - 8);
  let d = "";
  let pen = false;
  for (const [t, v] of points) {
    if (v == null) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${x(t).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  }
  const last = valid[valid.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", className)} style={{ height }} role="img" aria-label={label} preserveAspectRatio="none">
      {band && <rect x={0} width={W} y={y(band[1])} height={Math.max(0, y(band[0]) - y(band[1]))} fill="var(--brand)" opacity={0.1} />}
      <path d={d} fill="none" stroke="var(--ink-2)" strokeWidth={1.75} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {last && <circle cx={x(last[0])} cy={y(last[1])} r={4} fill={stateColor} stroke="var(--surface)" strokeWidth={2} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

/** Jauge demi-cercle segmentée (humidité moyenne), lisible même en petit. */
export function Gauge({ value, max = 60, band, label, sub }: { value: number | null; max?: number; band: [number, number]; label: string; sub?: ReactNode }) {
  const N = 36;
  const filled = value == null ? 0 : Math.round((Math.min(value, max) / max) * N);
  const segColor = (i: number) => {
    const v = (i / (N - 1)) * max;
    return v < band[0] ? "var(--sun)" : v <= band[1] ? "var(--brand)" : "var(--water)";
  };
  return (
    <figure className="flex flex-col items-center" role="img" aria-label={`${label} : ${value == null ? "indisponible" : `${Math.round(value)} %`}`}>
      <svg viewBox="0 0 240 132" className="w-full max-w-[260px]">
        {Array.from({ length: N }, (_, i) => {
          const a = Math.PI - (i / (N - 1)) * Math.PI;
          const r1 = 84;
          const r2 = 108;
          return <line key={i} x1={120 + Math.cos(a) * r1} y1={120 - Math.sin(a) * r1} x2={120 + Math.cos(a) * r2} y2={120 - Math.sin(a) * r2} stroke={i < filled ? segColor(i) : "var(--surface-3)"} strokeWidth={4.5} strokeLinecap="round" />;
        })}
        <text x="120" y="108" textAnchor="middle" className="font-display" style={{ fontSize: 36, fontWeight: 600, fill: "var(--ink)" }}>
          {value == null ? "—" : `${Math.round(value)} %`}
        </text>
      </svg>
      {sub && <figcaption className="-mt-1 text-center text-[13px] text-ink-3">{sub}</figcaption>}
    </figure>
  );
}

/** Légende d'états : couleur + libellé (jamais la couleur seule). */
export function StateLegend({ items }: { items: Array<{ color: string; label: string; dashed?: boolean }> }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-2">
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-2">
          <span className={cn("size-3 rounded-sm", it.dashed && "border-2 border-dashed bg-transparent")} style={it.dashed ? { borderColor: it.color } : { background: it.color }} aria-hidden />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
