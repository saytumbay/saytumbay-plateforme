/** Photo responsive (WebP en plusieurs largeurs). Les crédits (auteur, licence) sont regroupés dans les mentions légales. */
import type { CSSProperties, ReactNode } from "react";
import { PHOTOS, type PhotoKey } from "@/assets/photos";
import { cn } from "@/lib/cn";

/** Légende seule : utile quand un autre élément s'intercale entre la photo et son crédit. */
export function PhotoCredit({ name, className }: { name: PhotoKey; className?: string }) {
  const p = PHOTOS[name];
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[12px] leading-snug text-ink-3", className)}>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-sun" aria-hidden />
        {p.place}
      </span>
      <span>
        <span aria-hidden>· </span>Photo{" "}
        <a href={p.source} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
          {p.author}
        </a>
        ,{" "}
        <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
          {p.license}
        </a>
      </span>
    </p>
  );
}

export function Photo({
  name,
  alt,
  sizes,
  className,
  frameClassName,
  position,
  priority,
  caption = false,
  children,
}: {
  name: PhotoKey;
  alt: string;
  /** Largeur affichée, pour que le navigateur choisisse le bon fichier (ex. « (min-width: 1024px) 50vw, 100vw »). */
  sizes: string;
  className?: string;
  /** Cadre de l'image : proportions et arrondi (ex. « aspect-[4/3] rounded-[24px] »). */
  frameClassName?: string;
  /** Point d'intérêt du recadrage (object-position). */
  position?: CSSProperties["objectPosition"];
  /** Image visible dès l'arrivée : chargée tout de suite. */
  priority?: boolean;
  caption?: boolean;
  /** Éléments posés sur la photo (positionnés en absolu dans le cadre). */
  children?: ReactNode;
}) {
  const p = PHOTOS[name];
  return (
    <figure className={cn("min-w-0", className)}>
      <div className={cn("relative overflow-hidden bg-surface-3", frameClassName)}>
        <img
          src={p.srcs[Math.min(1, p.srcs.length - 1)]![1]}
          srcSet={p.srcs.map(([w, s]) => `${s} ${w}w`).join(", ")}
          sizes={sizes}
          width={p.width}
          height={p.height}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
          style={position ? { objectPosition: position } : undefined}
        />
        {children}
      </div>
      {caption && (
        <figcaption className="mt-2.5">
          <PhotoCredit name={name} />
        </figcaption>
      )}
    </figure>
  );
}
