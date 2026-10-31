import { MARK_LAYERS, REDUCED_LAYERS, TAGLINE_D, WORDMARK_D } from "./paths";
import { cn } from "@/lib/cn";

const FILL = { disc: "var(--logo-disc)", orbit: "var(--logo-orbit)", sensor: "var(--logo-sensor)" } as const;

/** Signe seul. Sous 40 px, la version réduite (sans orbite) reste lisible, comme le prévoit la charte. */
export function LogoMark({ size = 40, className, title }: { size?: number; className?: string; title?: string }) {
  const reduced = size < 40;
  const layers = reduced ? REDUCED_LAYERS : MARK_LAYERS;
  const vb = reduced ? "-5.5 1 122.5 124" : "-3.5 1 120.5 124";
  return (
    <svg viewBox={vb} width={size} height={size} className={cn("logo-colors shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {layers.map((l, i) => (
        <path key={i} d={l.d} fill={FILL[l.role]} />
      ))}
    </svg>
  );
}

/** Logo horizontal : signe + mot-symbole (+ signature facultative). */
export function Logo({ height = 36, tagline = false, className, title = "SaytuMbay" }: { height?: number; tagline?: boolean; className?: string; title?: string }) {
  const vb = tagline ? "-3.5 1 463.56 124" : "-3.5 1 463.56 112";
  const [, , w, h] = vb.split(" ").map(Number) as [number, number, number, number];
  return (
    <svg viewBox={vb} height={height} width={(height * w) / h} className={cn("logo-colors shrink-0", className)} role="img" aria-label={title}>
      {MARK_LAYERS.map((l, i) => (
        <path key={i} d={l.d} fill={FILL[l.role]} />
      ))}
      <path d={WORDMARK_D} fill="var(--logo-word)" />
      {tagline && <path d={TAGLINE_D} fill="var(--logo-tag)" />}
    </svg>
  );
}
