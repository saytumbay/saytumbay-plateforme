import type { ReactNode } from "react";
import { AlertOctagon, RefreshCw, WifiOff } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { ApiError, errorMessage } from "@/lib/api";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse-soft rounded-md bg-surface-3", className)} aria-hidden />;
}

/** Squelette de page : réserve la place des blocs pour éviter les sauts de mise en page. */
export function PageSkeleton({ blocks = 4 }: { blocks?: number }) {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Chargement">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: blocks - 2 }, (_, i) => (
        <Skeleton key={i} className="h-72 rounded-xl" />
      ))}
      <span className="sr-only">Chargement des données…</span>
    </div>
  );
}

export function EmptyState({ icon, title, children, action, className }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center", className)}>
      {icon && <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-ink-3">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="max-w-md text-sm text-ink-3">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const offline = error instanceof ApiError && error.status === 0;
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-6 py-12 text-center", className)}>
      <div className={cn("flex size-12 items-center justify-center rounded-full", offline ? "bg-offline-soft text-ink-2" : "bg-danger-soft text-danger-ink")}>
        {offline ? <WifiOff className="size-6" aria-hidden /> : <AlertOctagon className="size-6" aria-hidden />}
      </div>
      <h3 className="text-base font-semibold">{offline ? "Pas de connexion" : "Impossible d’afficher ces données"}</h3>
      <p className="max-w-md text-sm text-ink-3">{offline ? "Les dernières données reçues restent visibles quand elles sont disponibles. La page se mettra à jour dès le retour du réseau." : errorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} icon={<RefreshCw className="size-4" aria-hidden />}>
          Réessayer
        </Button>
      )}
    </div>
  );
}

/** Rend le contenu une fois les données là ; gère chargement et erreur de façon uniforme. */
export function QueryView<T>({ q, children, skeleton }: { q: UseQueryResult<T>; children: (data: T) => ReactNode; skeleton?: ReactNode }) {
  if (q.isPending) return <>{skeleton ?? <PageSkeleton />}</>;
  if (q.isError && !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return <>{children(q.data as T)}</>;
}

export function LiveDot({ className, label = "Mise à jour en direct" }: { className?: string; label?: string }) {
  return (
    <span className={cn("relative inline-flex size-2.5", className)} title={label}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
      <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Callout({ tone = "info", icon, title, children, action, className }: { tone?: "info" | "warn" | "danger" | "success"; icon?: ReactNode; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const tones = {
    info: "bg-water-soft text-water-ink border-water/25",
    warn: "bg-sun-soft text-sun-ink border-sun/30",
    danger: "bg-danger-soft text-danger-ink border-danger/30",
    success: "bg-brand-soft text-brand-strong border-brand/25 dark:text-brand",
  } as const;
  return (
    <div className={cn("flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3.5 text-sm", tones[tone], className)}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        {title && <p className="font-display font-semibold">{title}</p>}
        {children && <div className={cn(title ? "mt-0.5" : undefined, "opacity-95")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
