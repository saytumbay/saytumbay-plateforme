/**
 * En-tête des tableaux de bord : une vraie photo du terrain sur fond nuit, le bonjour, et la journée résumée
 * en une phrase. Le résumé est lu en premier par un lecteur d'écran (c'est l'information utile).
 */
import type { ReactNode } from "react";
import type { PhotoKey } from "@/assets/photos";
import { Photo } from "@/components/ui/photo";
import { usePageTitle } from "@/components/ui/page";

export function FieldBanner({ photo, position, title, subtitle, summary, meta, actions }: { photo: PhotoKey; position?: string; title: string; subtitle?: ReactNode; summary: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  usePageTitle(title);
  return (
    <header className="relative mb-6 overflow-hidden rounded-[22px] bg-[#0b2e24] text-[#f4efe6]">
      <Photo name={photo} caption={false} alt="" sizes="(min-width: 1024px) 1100px, 100vw" position={position} className="absolute inset-0" frameClassName="h-full" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b2e24] via-[#0b2e24]/88 to-[#0b2e24]/35" aria-hidden />
      <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-4 p-5 sm:p-7">
        <div className="min-w-0 max-w-[62ch]">
          <h1 className="text-[26px] font-semibold leading-tight text-[#f4efe6] sm:text-[30px]">{title}</h1>
          {subtitle && <p className="mt-1 text-[14.5px] text-[#d6dbd2]">{subtitle}</p>}
          <p className="mt-4 flex items-start gap-2.5 font-display text-[17px] font-semibold leading-snug sm:text-[19px]">
            <span className="mt-2 size-2.5 shrink-0 rounded-full bg-[#ef6a22]" aria-hidden />
            <span>{summary}</span>
          </p>
        </div>
        {/* Jetons du thème sombre pour les boutons et l'état de synchronisation posés sur le bandeau. */}
        <div className="dark flex flex-wrap items-center gap-3 text-ink">
          {meta}
          {actions}
        </div>
      </div>
    </header>
  );
}
