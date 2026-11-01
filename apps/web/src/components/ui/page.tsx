import { useEffect, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

/** Titre de l'onglet. `null` : page d'accueil (titre complet du site). */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} · SaytuMbay` : "SaytuMbay · Voir la perte avant qu’elle arrive";
  }, [title]);
}

export function PageHeader({ title, subtitle, actions, crumbs, meta, className }: { title: string; subtitle?: ReactNode; actions?: ReactNode; crumbs?: Array<{ label: string; to?: string }>; meta?: ReactNode; className?: string }) {
  usePageTitle(title);
  return (
    <header className={cn("mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Fil d’Ariane" className="mb-1.5">
            <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-3">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1">
                  {c.to ? (
                    <Link to={c.to} className="hover:text-ink hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page">{c.label}</span>
                  )}
                  {i < crumbs.length - 1 && <ChevronRight className="size-3.5" aria-hidden />}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-[26px] font-semibold leading-tight sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {(actions || meta) && (
        <div className="flex flex-wrap items-center gap-2">
          {meta}
          {actions}
        </div>
      )}
    </header>
  );
}

export function Section({ title, description, actions, children, className, id }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={cn("mt-8 first:mt-0", className)} aria-labelledby={id}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={id} className="text-lg font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Ligne libellé / valeur (fiches détaillées). */
export function DefinitionList({ items, className, cols = 2 }: { items: Array<{ label: string; value: ReactNode }>; className?: string; cols?: 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", cols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2", className)}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-[12.5px] font-medium text-ink-3">{it.label}</dt>
          <dd className="mt-0.5 font-display text-[15px] font-semibold text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
