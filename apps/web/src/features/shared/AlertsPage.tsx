import { useState } from "react";
import { useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { BellOff, MessageSquareText } from "lucide-react";
import { fmt, type Alert } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { LIVE_MS } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView, EmptyState } from "@/components/ui/feedback";
import { FilterChips } from "@/components/ui/data";
import { AlertStatusBadge, SeverityBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { linkFor, useAlertAction } from "./ActionList";
import { cn } from "@/lib/cn";

type F = "ouvertes" | "prises" | "resolues" | "toutes";

export default function AlertsPage() {
  const onion = useLocation().pathname.startsWith("/app/onion");
  const module = onion ? "onion" : "agritech";
  const q = useQuery({ queryKey: ["alerts", module], queryFn: () => api.alerts.list({ module }), refetchInterval: LIVE_MS });
  const [f, setF] = useState<F>("ouvertes");
  const all = q.data ?? [];
  const rows = all.filter((a) => (f === "toutes" ? true : f === "ouvertes" ? a.status === "ouverte" : f === "prises" ? a.status === "prise_en_charge" : a.status === "resolue"));
  return (
    <>
      <PageHeader title={onion ? "Alertes de stockage" : "Alertes"} subtitle="Chaque alerte vient d’un écart mesuré par rapport aux seuils. Le responsable est prévenu par SMS dès qu’une alerte critique s’ouvre." />
      <div className="mb-5">
        <FilterChips
          label="Filtrer les alertes"
          value={f}
          onChange={setF}
          options={[
            { value: "ouvertes", label: "Ouvertes", count: all.filter((a) => a.status === "ouverte").length },
            { value: "prises", label: "Prises en charge", count: all.filter((a) => a.status === "prise_en_charge").length },
            { value: "resolues", label: "Résolues", count: all.filter((a) => a.status === "resolue").length },
            { value: "toutes", label: "Toutes", count: all.length },
          ]}
        />
      </div>
      <QueryView q={q}>
        {() =>
          rows.length ? (
            <div className="flex flex-col gap-3">
              {rows.map((a) => (
                <AlertRow key={a.id} a={a} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<BellOff className="size-6" aria-hidden />} title={f === "ouvertes" ? "Aucune alerte ouverte" : "Rien dans ce filtre"}>
              {f === "ouvertes" ? "Les mesures sont dans les plages visées. Vous serez prévenu par SMS au moindre écart." : "Changez de filtre pour voir les autres alertes."}
            </EmptyState>
          )
        }
      </QueryView>
    </>
  );
}

function AlertRow({ a }: { a: Alert }) {
  const act = useAlertAction();
  const can = useCan("alertes:traiter");
  const link = linkFor(a);
  const busy = act.isPending && act.variables?.id === a.id;
  return (
    <Card as="article" className={cn("relative overflow-hidden p-5 pl-6", a.status === "resolue" && "opacity-80")}>
      <span className={cn("absolute inset-y-0 left-0 w-1.5", a.status === "resolue" ? "bg-line-strong" : a.severity === "critique" ? "bg-danger" : a.severity === "attention" ? "bg-sun" : "bg-water")} aria-hidden />
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SeverityBadge severity={a.severity} size="sm" />
            <AlertStatusBadge status={a.status} />
            <span className="text-[12.5px] text-ink-3">
              {a.source.label} · ouverte {fmt.ago(a.createdAt)}
            </span>
          </div>
          <h2 className="text-[17px] font-semibold">{a.title}</h2>
          <p className="mt-1 text-sm text-ink-2">{a.detail}</p>
          <p className="mt-2 text-sm">
            <span className="font-display font-semibold">À faire : </span>
            {a.advice}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
            {a.notifications.map((n, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                <MessageSquareText className="size-3.5" aria-hidden /> SMS {n.delivered ? "remis" : "en attente"} au {fmt.phone(n.to)} · {fmt.hm(n.at)}
              </span>
            ))}
            {a.acknowledgedAt && <span>Prise en charge {fmt.ago(a.acknowledgedAt)}</span>}
            {a.resolvedAt && <span>Résolue {fmt.ago(a.resolvedAt)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={link.to} size="sm" variant="secondary">
            {link.label}
          </ButtonLink>
          {can && a.status === "ouverte" && (
            <Button size="sm" loading={busy} onClick={() => act.mutate({ id: a.id, action: "prendre_en_charge" })}>
              Je m’en occupe
            </Button>
          )}
          {can && a.status === "prise_en_charge" && (
            <Button size="sm" loading={busy} onClick={() => act.mutate({ id: a.id, action: "resoudre" })}>
              Marquer résolue
            </Button>
          )}
          {can && a.status === "resolue" && (
            <Button size="sm" variant="ghost" loading={busy} onClick={() => act.mutate({ id: a.id, action: "rouvrir" })}>
              Rouvrir
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
