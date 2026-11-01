/**
 * Héros interactif : une journée à Mboro en dix secondes. L'humidité de la parcelle B baisse, passe sous son
 * seuil, l'alerte part par SMS, l'irrigation la remonte. Le curseur permet de rejouer la journée à la main.
 * Animation lancée une seule fois, à l'apparition ; figée sur 17 h si l'utilisateur réduit les animations.
 * Pour garder le défilement fluide, l'état n'avance que par quarts d'heure (≈ 6 rendus par seconde, pas 60)
 * et l'animation se met en pause quand le héros sort de l'écran.
 */
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { FieldPlan, type PlanParcel, type PlanState } from "@/components/brand/FieldPlan";
import { cn } from "@/lib/cn";

const T0 = 6;
const T1 = 21;
const DRY = 30;
const WET = 45;

function moisture(code: string, t: number): number | null {
  const h = t - T0;
  switch (code) {
    case "A":
      return 36 - h * 0.15;
    case "B":
      if (t < 17) return 36 - h * 1.6;
      return Math.min(38, 18.4 + Math.min(1, (t - 17) / 1.4) * 20);
    case "C":
      return 40.5 - h * 0.12;
    case "D":
      return 49 - h * 0.09;
    case "E":
      return t < 6.17 ? 33 : null;
    case "F":
      return 37.5 - h * 0.13;
    default:
      return null;
  }
}

const CROPS: Record<string, string> = { A: "Oignon", B: "Tomate", C: "Gombo", D: "Piment", E: "Aubergine", F: "Chou" };
const state = (v: number | null): PlanState => (v == null ? "indisponible" : v < DRY ? "sec" : v > WET ? "humide" : "optimal");
const clock = (t: number) => {
  const m = Math.round(t * 4) * 15;
  return `${String(Math.floor(m / 60)).padStart(2, "0")} h ${String(m % 60).padStart(2, "0")}`;
};

const EVENTS: Array<{ at: number; tone: "sun" | "brand" | "offline" | "water"; text: string }> = [
  { at: 6.25, tone: "offline", text: "Capteur de la parcelle E muet depuis 06 h 10 : tâche créée pour Ibou, technicien." },
  { at: 9.75, tone: "sun", text: "Parcelle B sous 30 % : SMS envoyé à Awa, responsable de la parcelle." },
  { at: 17, tone: "water", text: "Irrigation de la parcelle B, 25 minutes." },
  { at: 18.5, tone: "brand", text: "Parcelle B revenue à 38 %. Alerte close." },
];

export function HeroField() {
  const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [t, setT] = useState(reduce ? 17 : T0);
  const [playing, setPlaying] = useState(false);
  const played = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const visible = useRef(true);

  useEffect(() => {
    if (reduce || !box.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        visible.current = !!e?.isIntersecting;
        if (e && e.intersectionRatio >= 0.45 && !played.current) {
          played.current = true;
          setPlaying(true);
        }
      },
      { threshold: [0, 0.45] },
    );
    io.observe(box.current);
    return () => io.disconnect();
  }, [reduce]);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let acc = 0;
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (visible.current) acc += dt * 1.45;
      // Un rendu par quart d'heure simulé : l'horloge et les valeurs affichées ne changent pas plus souvent.
      if (acc >= 0.25) {
        const inc = Math.floor(acc * 4) / 4;
        acc -= inc;
        setT((cur) => {
          const next = Math.min(T1, cur + inc);
          if (next >= T1) setPlaying(false);
          return next;
        });
      }
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing]);

  const parcels: PlanParcel[] = ["A", "B", "C", "D", "E", "F"].map((code) => {
    const v = moisture(code, t);
    return { code, crop: CROPS[code]!, value: v == null ? null : Math.round(v), state: state(v) };
  });
  const b = Math.round(moisture("B", t)!);
  const smsVisible = t >= 9.75;
  const past = EVENTS.filter((e) => t >= e.at);

  return (
    <div ref={box} className="relative overflow-hidden rounded-[28px] bg-[#0b1a14] text-[#eaf3ee] shadow-3">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_55%_40%,rgba(43,212,125,0.12),transparent_70%)]" aria-hidden />
      <div className="relative grid gap-0 md:grid-cols-[minmax(0,1fr)_250px]">
        <div className="p-5 pb-3 sm:p-7 sm:pb-4">
          <div className="flex items-baseline justify-between gap-4 text-[13px] text-[#a9bdb2]">
            <span>Exploitation de Mboro, Niayes</span>
            <span className="font-display text-[22px] font-semibold tabular text-white" aria-live="off">
              {clock(t)}
            </span>
          </div>
          <div className="mx-auto mt-2 max-w-[440px]">
            <FieldPlan parcels={parcels} palette="night" title={`Plan des six parcelles à ${clock(t)}. Parcelle B à ${b} % d’humidité.`} />
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:p-6 md:border-l md:border-t-0">
          <div className={cn("rounded-2xl bg-[#f4f7f5] p-3.5 text-[#0e1f18] shadow-2 transition-all duration-500", smsVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0")} aria-hidden={!smsVisible}>
            <p className="flex items-center justify-between text-[11.5px] font-semibold text-[#5f7067]">
              <span>SMS · SaytuMbay</span>
              <span className="tabular">09 h 45</span>
            </p>
            <p className="mt-1.5 text-[13.5px] leading-snug">Parcelle B (tomate) à 29 %, sous son seuil. Irriguer aujourd’hui. Détail sur saytumbay.com</p>
          </div>
          <ol className="flex flex-col gap-2.5 text-[13px] leading-snug" aria-label="Journal de la journée">
            {EVENTS.map((e) => {
              const on = past.includes(e);
              return (
                <li key={e.at} className={cn("flex gap-2.5 transition-opacity duration-300", on ? "opacity-100" : "opacity-25")}>
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", { sun: "bg-[#f0b642]", brand: "bg-[#2bd47d]", offline: "bg-[#8c968f]", water: "bg-[#4fd8ef]" }[e.tone])} aria-hidden />
                  <span>
                    <span className="font-semibold tabular text-white">{clock(e.at)}</span> <span className="text-[#c9d8cf]">{e.text}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <div className="relative flex items-center gap-3 border-t border-white/10 px-5 py-3.5 sm:px-7">
        <button
          type="button"
          onClick={() => {
            if (t >= T1) setT(T0);
            setPlaying((p) => !p);
          }}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          aria-label={playing ? "Mettre en pause" : t >= T1 ? "Rejouer la journée" : "Lire la journée"}
        >
          {playing ? <Pause className="size-4" aria-hidden /> : t >= T1 ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
        </button>
        <label htmlFor="hero-heure" className="sr-only">
          Heure de la journée
        </label>
        <input
          id="hero-heure"
          type="range"
          min={T0}
          max={T1}
          step={0.25}
          value={t}
          onChange={(e) => {
            setPlaying(false);
            played.current = true;
            setT(Number(e.target.value));
          }}
          aria-valuetext={`${clock(t)}, parcelle B à ${b} %`}
          className="h-8 min-w-0 flex-1 cursor-pointer accent-[#2bd47d]"
        />
        <span className="hidden text-[12.5px] text-[#a9bdb2] sm:inline">Faites glisser pour rejouer la journée</span>
      </div>
    </div>
  );
}
