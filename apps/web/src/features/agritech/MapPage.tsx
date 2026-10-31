import { lazy, Suspense, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Droplets, ArrowRight } from "lucide-react";
import { fmt, MOISTURE_LABEL, type ParcelSnapshot } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { LIVE_MS, MOISTURE_COLOR } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView, Skeleton } from "@/components/ui/feedback";
import { MoistureBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { StateLegend } from "@/components/charts/charts";
import { IrrigateSheet } from "@/features/shared/irrigation";
import { SyncStatus } from "@/layouts/AppShell";
import { cn } from "@/lib/cn";

const ParcelMap = lazy(() => import("@/components/map/ParcelMap").then((m) => ({ default: m.ParcelMap })));

export default function MapPage() {
  const q = useQuery({ queryKey: ["parcels"], queryFn: api.parcels.list, refetchInterval: LIVE_MS });
  const [sel, setSel] = useState<string | null>(null);
  const [irr, setIrr] = useState<ParcelSnapshot | null>(null);
  const canIrrigate = useCan("irrigation:commander");
  const selected = q.data?.find((p) => p.parcel.id === sel) ?? null;
  return (
    <>
      <PageHeader title="Carte des parcelles" subtitle="Cliquez sur une parcelle pour voir son état. La couleur indique l’humidité du sol." meta={<SyncStatus at={new Date().toISOString()} />} />
      <QueryView q={q}>
        {(parcels) => (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-3">
              <Suspense fallback={<Skeleton className="h-[min(70vh,640px)] rounded-xl" />}>
                <ParcelMap parcels={parcels} height="min(70vh, 640px)" selected={sel} onSelect={setSel} />
              </Suspense>
              <StateLegend
                items={[
                  { color: MOISTURE_COLOR.sec, label: "Sec" },
                  { color: MOISTURE_COLOR.optimal, label: "Dans la plage" },
                  { color: MOISTURE_COLOR.humide, label: "Humide" },
                  { color: MOISTURE_COLOR.indisponible, label: "Sans mesure (contour pointillé)", dashed: true },
                ]}
              />
            </div>
            <aside className="flex flex-col gap-3" aria-label="Liste des parcelles">
              {selected ? (
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">{selected.parcel.name}</h2>
                      <p className="text-sm text-ink-3">
                        {selected.parcel.crop} {selected.parcel.variety} · {fmt.hectares(selected.parcel.areaHa)}
                      </p>
                    </div>
                    <button onClick={() => setSel(null)} className="text-sm font-display font-semibold text-ink-3 hover:text-ink">
                      Fermer
                    </button>
                  </div>
                  <p className="mt-4 font-display text-[44px] font-semibold leading-none tabular">{fmt.pct(selected.moisture)}</p>
                  <div className="mt-2">
                    <MoistureBadge state={selected.state} />
                  </div>
                  <p className="mt-3 text-sm text-ink-2">
                    Plage visée {selected.parcel.moisture.dry} à {selected.parcel.moisture.wet} %. {selected.lastMeasureAt ? `Mesure ${fmt.ago(selected.lastMeasureAt)}.` : "Aucune mesure récente : vérifiez le capteur."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canIrrigate && selected.state !== "indisponible" && (
                      <Button icon={<Droplets className="size-4" aria-hidden />} onClick={() => setIrr(selected)}>
                        Arroser
                      </Button>
                    )}
                    <ButtonLink to={`/app/parcelles/${selected.parcel.id}`} variant="secondary" icon={<ArrowRight className="size-4" aria-hidden />}>
                      Fiche de la parcelle
                    </ButtonLink>
                  </div>
                </Card>
              ) : null}
              <Card as="div">
                <ul className="divide-y divide-line">
                  {parcels.map((p) => (
                    <li key={p.parcel.id}>
                      <button onClick={() => setSel(p.parcel.id)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2", sel === p.parcel.id && "bg-surface-2")} aria-pressed={sel === p.parcel.id}>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border-[3px] bg-ink font-display text-[13px] font-bold text-bg" style={{ borderColor: MOISTURE_COLOR[p.state] }}>
                          {p.parcel.code}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-sm font-semibold">{p.parcel.crop}</span>
                          <span className="block text-[12.5px] text-ink-3">{MOISTURE_LABEL[p.state]}</span>
                        </span>
                        <span className="font-display text-lg font-semibold tabular">{fmt.pct(p.moisture)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
              <p className="text-[13px] text-ink-3">
                Contours de démonstration autour de Mboro. Pour tracer vos vraies parcelles, ajoutez-les depuis la page{" "}
                <Link to="/app/parcelles" className="text-brand hover:underline">
                  Parcelles
                </Link>
                .
              </p>
            </aside>
          </div>
        )}
      </QueryView>
      <IrrigateSheet snapshot={irr} open={!!irr} onOpenChange={(v) => !v && setIrr(null)} />
    </>
  );
}
