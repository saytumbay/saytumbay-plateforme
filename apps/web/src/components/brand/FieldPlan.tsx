/**
 * Plan dessiné de l'exploitation de démonstration (Mboro, Niayes) : six parcelles, leurs sillons et l'état
 * de l'humidité du sol. Même géométrie que la carte de l'espace client (voir packages/shared/src/demo/seed.ts),
 * en mètres locaux, sans dépendre du module de démonstration.
 */
import { useId, useMemo } from "react";
import { cn } from "@/lib/cn";

export type PlanState = "sec" | "optimal" | "humide" | "indisponible";
export interface PlanParcel {
  code: string;
  crop: string;
  value: number | null;
  state: PlanState;
}

const TH = (-14 * Math.PI) / 180;
const rot = ([x, y]: [number, number]): [number, number] => [x * Math.cos(TH) - y * Math.sin(TH), -(x * Math.sin(TH) + y * Math.cos(TH))];

function localPlan(): Record<string, { pts: Array<[number, number]>; box: [number, number, number, number] }> {
  const rows = [
    { y0: 8, h: 112, ids: ["A", "B", "C"], w: [72, 46, 58] },
    { y0: -104, h: 96, ids: ["D", "E", "F"], w: [44, 32, 76] },
  ];
  const out: Record<string, { pts: Array<[number, number]>; box: [number, number, number, number] }> = {};
  rows.forEach((r, ri) => {
    let x = -92;
    r.ids.forEach((id, j) => {
      const w = r.w[j]!;
      const x1 = x + w;
      const sk = (j % 2 ? -1 : 1) * 4 + ri * 3;
      const bend = (j + ri) % 2 ? 3 : -3;
      out[id] = {
        pts: [
          [x + sk, r.y0 + r.h],
          [x1 + sk * 0.5, r.y0 + r.h + bend],
          [x1, r.y0 + r.h * 0.5 + bend],
          [x1 - sk * 0.3, r.y0],
          [x, r.y0 - bend * 0.5],
          [x + sk * 0.4, r.y0 + r.h * 0.5],
        ],
        box: [x - 8, r.y0 - 8, x1 + 8, r.y0 + r.h + 8],
      };
      x = x1 + 3;
    });
  });
  return out;
}

const PLAN = localPlan();

const NIGHT: Record<PlanState, string> = { sec: "#f0b642", optimal: "#2bd47d", humide: "#4fd8ef", indisponible: "#8c968f" };
const THEME: Record<PlanState, string> = { sec: "var(--sun)", optimal: "var(--brand)", humide: "var(--water)", indisponible: "var(--offline)" };

export function FieldPlan({ parcels, palette = "theme", selected, onSelect, className, animate = true, labelStyle = "full", title = "Plan des parcelles et humidité du sol" }: { parcels: PlanParcel[]; palette?: "night" | "theme"; selected?: string | null; onSelect?: (code: string) => void; className?: string; animate?: boolean; labelStyle?: "full" | "letter"; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const colors = palette === "night" ? NIGHT : THEME;
  const ink = palette === "night" ? "#eaf3ee" : "var(--ink)";
  const sub = palette === "night" ? "#a9bdb2" : "var(--ink-3)";
  const geo = useMemo(() => {
    const all = Object.values(PLAN).flatMap((p) => p.pts.map(rot));
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    const pad = 10;
    return { vb: `${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + pad * 2} ${Math.max(...ys) - Math.min(...ys) + pad * 2}` };
  }, []);
  return (
    <svg viewBox={geo.vb} className={cn("block h-auto w-full overflow-visible", className)} role="img" aria-label={title}>
      <defs>
        {parcels.map((p) => {
          const g = PLAN[p.code];
          if (!g) return null;
          return (
            <clipPath key={p.code} id={`${uid}-c-${p.code}`}>
              <polygon points={g.pts.map(rot).map((q) => q.join(",")).join(" ")} />
            </clipPath>
          );
        })}
      </defs>
      {parcels.map((p, i) => {
        const g = PLAN[p.code];
        if (!g) return null;
        const pts = g.pts.map(rot);
        const c = colors[p.state];
        const off = p.state === "indisponible";
        const [x0, y0, x1, y1] = g.box;
        const vertical = i % 2 === 1;
        const furrows: Array<[[number, number], [number, number]]> = [];
        if (vertical) for (let x = x0; x <= x1; x += 5) furrows.push([rot([x, y0]), rot([x, y1])]);
        else for (let y = y0; y <= y1; y += 5) furrows.push([rot([x0, y]), rot([x1, y])]);
        const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length;
        const cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
        const isSel = selected === p.code;
        const Tag = onSelect ? "a" : "g";
        const label = `Parcelle ${p.code}, ${p.crop} : ${p.value == null ? "capteur hors ligne" : `${p.value} % d’humidité`}`;
        return (
          <Tag
            key={p.code}
            {...(onSelect
              ? {
                  href: `#parcelle-${p.code}`,
                  role: "button",
                  "aria-pressed": isSel,
                  "aria-label": label,
                  onClick: (e: React.MouseEvent) => {
                    e.preventDefault();
                    onSelect(p.code);
                  },
                  className: "cursor-pointer outline-none [&:focus-visible>polygon:first-of-type]:stroke-[3]",
                }
              : { "aria-label": label })}
            style={animate ? { animation: `plan-in 700ms var(--ease-out) ${120 + i * 90}ms both` } : undefined}
          >
            <polygon points={pts.map((q) => q.join(",")).join(" ")} fill={c} fillOpacity={off ? 0.06 : isSel ? 0.34 : 0.2} stroke={c} strokeWidth={isSel ? 2.6 : 1.4} strokeDasharray={off ? "4 3" : undefined} strokeLinejoin="round" style={{ transition: "fill-opacity 200ms, stroke-width 200ms" }} />
            <g clipPath={`url(#${uid}-c-${p.code})`} stroke={c} strokeOpacity={off ? 0.18 : 0.32} strokeWidth={0.7}>
              {furrows.map(([a, b], k) => (
                <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
              ))}
            </g>
            {p.state === "sec" && (
              <g aria-hidden>
                <circle cx={cx} cy={cy - 14} r={3.2} fill={c} className="plan-pulse" style={{ transformOrigin: `${cx}px ${cy - 14}px`, transformBox: "view-box" }} />
                <circle cx={cx} cy={cy - 14} r={3.2} fill={c} />
              </g>
            )}
            <text x={cx} y={labelStyle === "full" ? cy + 1 : cy + 4} textAnchor="middle" fontFamily="var(--font-display)" fontWeight={600} fontSize={labelStyle === "full" ? 13 : 15} fill={ink} aria-hidden>
              {p.code}
              {labelStyle === "full" && (
                <>
                  <tspan x={cx} dy={13} fontFamily="var(--font-sans)" fontWeight={500} fontSize={off ? 8 : 9.5} fill={off ? sub : ink}>
                    {off ? "hors" : `${p.value} %`}
                  </tspan>
                  {off && (
                    <tspan x={cx} dy={9} fontFamily="var(--font-sans)" fontWeight={500} fontSize={8} fill={sub}>
                      ligne
                    </tspan>
                  )}
                </>
              )}
            </text>
          </Tag>
        );
      })}
    </svg>
  );
}

/** Histoire de la démo, au moment de l'ancrage : B sèche, D trop humide, E hors ligne. */
export const DEMO_PLAN: PlanParcel[] = [
  { code: "A", crop: "Oignon", value: 34, state: "optimal" },
  { code: "B", crop: "Tomate", value: 18, state: "sec" },
  { code: "C", crop: "Gombo", value: 39, state: "optimal" },
  { code: "D", crop: "Piment", value: 48, state: "humide" },
  { code: "E", crop: "Aubergine", value: null, state: "indisponible" },
  { code: "F", crop: "Chou", value: 36, state: "optimal" },
];
