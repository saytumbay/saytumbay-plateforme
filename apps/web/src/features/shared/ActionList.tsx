import { Link } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sun, WifiOff, BatteryLow, Droplets, Flame, Thermometer, Wind, AlertTriangle, CheckCircle2, MessageSquareText } from "lucide-react";
import type { Alert, AlertKind } from "@saytumbay/shared";
import { fmt } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { Button, ButtonLink } from "@/components/ui/button";
import { SeverityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";

const KIND_ICON: Record<AlertKind, typeof Sun> = {
  sol_sec: Sun,
  sol_humide: Droplets,
  capteur_hors_ligne: WifiOff,
  batterie_faible: BatteryLow,
  stock_humidite: Droplets,
  stock_temperature: Thermometer,
  stock_co2: Wind,
  stock_gaz: Flame,
  stock_controle: AlertTriangle,
  irrigation_annulee: Droplets,
};

export function linkFor(a: Alert): { to: string; label: string } {
  switch (a.source.type) {
    case "parcelle":
      return { to: `/app/parcelles/${a.source.id}`, label: "Voir la parcelle" };
    case "capteur":
      return { to: a.module === "onion" ? `/app/onion/capteurs/${a.source.id}` : `/app/capteurs/${a.source.id}`, label: "Voir le capteur" };
    case "entrepot":
    case "zone":
      return { to: `/app/onion/entrepots/${a.source.id.split(":")[0]}`, label: "Voir l’entrepôt" };
    case "lot":
      return { to: "/app/onion/lots", label: "Voir le lot" };
  }
}

export function useAlertAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; action: "prendre_en_charge" | "resoudre" | "rouvrir" }) => api.alerts.act(v.id, v.action),
    onSuccess: (_a, v) => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["warehouse"] });
      toast.success(v.action === "prendre_en_charge" ? "Alerte prise en charge. L’équipe voit que vous vous en occupez." : v.action === "resoudre" ? "Alerte résolue." : "Alerte rouverte.");
    },
  });
}

/**
 * « À faire aujourd'hui » : chaque alerte est une action. Le bouton principal fait la chose
 * (arroser, ouvrir le capteur, trier), le secondaire signale qu'on s'en occupe.
 */
export function ActionList({ alerts, onIrrigate, limit = 6, compact, showModule }: { alerts: Alert[]; onIrrigate?: (parcelId: string) => void; limit?: number; compact?: boolean; showModule?: boolean }) {
  const act = useAlertAction();
  const canTreat = useCan("alertes:traiter");
  const canIrrigate = useCan("irrigation:commander");
  const list = alerts.filter((a) => a.status !== "resolue").slice(0, limit);
  if (!list.length)
    return (
      <EmptyState icon={<CheckCircle2 className="size-6 text-brand" aria-hidden />} title="Rien d’urgent aujourd’hui">
        Toutes les parcelles et tous les stocks sont dans leur plage. Les capteurs continuent de veiller.
      </EmptyState>
    );
  return (
    <ul className="@container flex flex-col divide-y divide-line">
      {list.map((a) => {
        const I = KIND_ICON[a.kind];
        const link = linkFor(a);
        const taken = a.status === "prise_en_charge";
        const crit = a.severity === "critique";
        return (
          <li key={a.id} className={cn("relative flex flex-col gap-3 py-4 pl-4 @2xl:flex-row @2xl:items-center", compact && "py-3")}>
            <span className={cn("absolute left-0 top-4 bottom-4 w-1 rounded-full", crit ? "bg-danger" : a.severity === "attention" ? "bg-sun" : "bg-water")} aria-hidden />
            <div className={cn("hidden size-10 shrink-0 items-center justify-center rounded-xl @2xl:flex", crit ? "bg-danger-soft text-danger-ink" : a.severity === "attention" ? "bg-sun-soft text-sun-ink" : "bg-water-soft text-water-ink")}>
              <I className="size-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <SeverityBadge severity={a.severity} size="sm" />
                {showModule && a.module === "onion" && <span className="rounded-full bg-onion-soft px-2 py-0.5 font-display text-[11px] font-semibold text-onion-ink">Stockage</span>}
                {taken && <span className="text-[12px] font-semibold text-water-ink">Prise en charge</span>}
                <span className="text-[12px] text-ink-3">{fmt.ago(a.createdAt)}</span>
                {a.notifications.some((n) => n.channel === "sms") && (
                  <span className="inline-flex items-center gap-1 text-[12px] text-ink-3" title="Un SMS a été envoyé au responsable">
                    <MessageSquareText className="size-3.5" aria-hidden /> SMS envoyé
                  </span>
                )}
              </div>
              <p className="font-display text-[15.5px] font-semibold leading-snug">{a.title}</p>
              {!compact && <p className="mt-0.5 text-sm text-ink-2">{a.advice}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 @2xl:justify-end">
              {a.kind === "sol_sec" && onIrrigate && canIrrigate ? (
                <Button size="sm" icon={<Droplets className="size-4" aria-hidden />} onClick={() => onIrrigate(a.source.id)}>
                  Arroser
                </Button>
              ) : (
                <ButtonLink to={link.to} size="sm" variant={crit ? "primary" : "secondary"}>
                  {link.label}
                </ButtonLink>
              )}
              {canTreat && !taken && (
                <Button size="sm" variant="ghost" loading={act.isPending && act.variables?.id === a.id} onClick={() => act.mutate({ id: a.id, action: "prendre_en_charge" })}>
                  Je m’en occupe
                </Button>
              )}
              {canTreat && taken && (
                <Button size="sm" variant="ghost" loading={act.isPending && act.variables?.id === a.id} onClick={() => act.mutate({ id: a.id, action: "resoudre" })}>
                  Marquer résolue
                </Button>
              )}
            </div>
          </li>
        );
      })}
      {alerts.filter((a) => a.status !== "resolue").length > limit && (
        <li className="pt-3 text-sm">
          <Link to="/app/alertes" className="font-display font-semibold text-brand hover:underline">
            Voir les {alerts.filter((a) => a.status !== "resolue").length} alertes
          </Link>
        </li>
      )}
    </ul>
  );
}
