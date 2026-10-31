import type { ReactNode } from "react";
import { usePageTitle } from "@/components/ui/page";

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/**
 * Gabarit des pages d'information : sommaire collant à gauche (écrans larges), texte à 68 caractères par ligne.
 * Les éléments entre crochets sont à compléter avant la mise en ligne (société en cours de constitution).
 */
export function LegalPage({ title, intro, updated, sections, draft = true }: { title: string; intro?: ReactNode; updated: string; sections: LegalSection[]; draft?: boolean }) {
  usePageTitle(title);
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 pt-10 sm:px-6 lg:pt-16">
      <header className="max-w-[760px]">
        <h1 className="font-display text-[clamp(32px,4vw,48px)] font-semibold leading-[1.06] tracking-[-0.03em]">{title}</h1>
        {intro && <div className="mt-5 text-[17px] leading-relaxed text-ink-2">{intro}</div>}
        <p className="mt-4 text-[14px] text-ink-3">Dernière mise à jour : {updated}</p>
        {draft && (
          <p className="mt-6 rounded-xl border border-sun/35 bg-sun-soft px-4 py-3 text-[14.5px] leading-relaxed text-sun-ink">
            Document de travail : les éléments entre crochets sont à compléter ou à valider avant la mise en ligne du site.
          </p>
        )}
      </header>
      <div className="mt-12 grid gap-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="Sommaire" className="hidden lg:block">
          <ol className="sticky top-28 flex flex-col gap-1 border-l border-line text-[14px]">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-ink-3 hover:border-line-strong hover:text-ink">
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="max-w-[68ch]">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 border-t border-line py-9 first:border-t-0 first:pt-0">
              <h2 className="font-display text-[22px] font-semibold tracking-tight">{s.title}</h2>
              <div className="prose-sb mt-4">{s.body}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Champ à compléter, visible et repérable. */
export function Todo({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-sun-soft px-1 text-sun-ink">[{children}]</mark>;
}
