import { MARK_LAYERS } from "./paths";
import { cn } from "@/lib/cn";

/**
 * « Le tracé » de la charte : contour du signe, très grand, toujours coupé par le bord du bloc qui le contient
 * (le parent doit être `relative overflow-hidden`). Décor seul : jamais derrière un texte courant sans cartouche.
 */
export function SignTrace({ className, color = "var(--sun)" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="-3.5 1 120.5 124" className={cn("pointer-events-none absolute", className)} fill="none" aria-hidden>
      {MARK_LAYERS.map((l, i) => (
        <path key={i} d={l.d} stroke={color} strokeWidth={0.45} vectorEffect="non-scaling-stroke" strokeLinejoin="round" style={{ strokeWidth: 1.5 }} />
      ))}
    </svg>
  );
}
