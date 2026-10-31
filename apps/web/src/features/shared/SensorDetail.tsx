import { useState } from "react";
import { useLocation, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { BatteryMedium, Signal, Cpu, MapPin } from "lucide-react";
import { fmt, METRIC_LABEL, METRIC_UNIT, type Metric } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { LIVE_MS, useSeries } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView, Callout, Skeleton } from "@/components/ui/feedback";
import { Kpi, Segmented } from "@/components/ui/data";
import { DeviceBadge } from "@/components/ui/badge";
import { TimeSeriesChart } from "@/components/charts/charts";
import { linkFor } from "./ActionList";
import { ButtonLink } from "@/components/ui/button";

export default function SensorDetail() {
  const { id = "" } = useParams();
  const onion = useLocation().pathname.startsWith("/app/onion");
  const q = useQuery({ queryKey: ["device", id], queryFn: () => api.devices.get(id), refetchInterval: LIVE_MS });
  return (
    <QueryView q={q}>
      {(d) => {
        const dv = d.device;
        return (
          <>
            <PageHeader crumbs={[{ label: onion ? "Sondes" : "Capteurs", to: onion ? "/app/onion/capteurs" : "/app/capteurs" }, { label: dv.id }]} title={dv.id} subtitle={`${dv.model} · ${dv.label}`} meta={<DeviceBadge status={dv.status} />} />
            {dv.status === "hors_ligne" && (
              <Callout tone="warn" className="mb-6" title={dv.lastSeenAt ? `Aucune mesure depuis ${fmt.ago(dv.lastSeenAt)}` : "En attente de la première mesure"}>
                Vérifiez l’alimentation et l’antenne, puis la portée jusqu’à la passerelle. Les irrigations automatiques liées à ce capteur sont suspendues.
              </Callout>
            )}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Batterie" value={dv.battery == null ? "Secteur" : `${dv.battery}`} unit={dv.battery == null ? undefined : "%"} sub={dv.battery != null && dv.battery < 20 ? "À remplacer sous deux semaines" : "Autonomie normale"} icon={<BatteryMedium className="size-[18px]" aria-hidden />} tone={dv.battery != null && dv.battery < 20 ? "danger" : "brand"} />
              <Kpi label="Signal radio" value={dv.status === "hors_ligne" ? "—" : `${dv.signal} / 4`} sub={dv.rssi ? `RSSI ${dv.rssi} dBm` : "Aucun signal reçu"} icon={<Signal className="size-[18px]" aria-hidden />} tone="water" />
              <Kpi label="Micrologiciel" value={dv.firmware} sub={`Installé le ${fmt.date(dv.installedAt)}`} icon={<Cpu className="size-[18px]" aria-hidden />} />
              <Kpi label="Dernière mesure" value={dv.lastSeenAt ? fmt.hm(dv.lastSeenAt) : "—"} sub={dv.lastSeenAt ? fmt.ago(dv.lastSeenAt) : "jamais reçue"} icon={<MapPin className="size-[18px]" aria-hidden />} />
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              {d.metrics.length ? <MetricsCard id={dv.id} metrics={d.metrics as Metric[]} /> : <Card className="p-6 text-sm text-ink-2">Une passerelle relaie les mesures des capteurs vers la plateforme. Elle ne mesure rien elle-même.</Card>}
              <div className="flex flex-col gap-6">
                <Card>
                  <CardHeader title="Alertes liées" />
                  <CardBody className="pt-2">
                    {d.alerts.length ? (
                      <ul className="flex flex-col gap-3">
                        {d.alerts.map((a) => (
                          <li key={a.id} className="rounded-lg border border-line p-3">
                            <p className="font-display text-sm font-semibold">{a.title}</p>
                            <p className="mt-0.5 text-[13px] text-ink-3">{fmt.ago(a.createdAt)}</p>
                            <ButtonLink to={linkFor(a).to} size="sm" variant="ghost" className="mt-2 -ml-2">
                              {linkFor(a).label}
                            </ButtonLink>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-ink-3">Aucune alerte ouverte.</p>
                    )}
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title="Historique" />
                  <CardBody className="pt-2">
                    <ol className="relative ml-2 border-l border-line">
                      {d.history.map((h, i) => (
                        <li key={i} className="relative pb-4 pl-5 last:pb-0">
                          <span className="absolute -left-[5px] top-1.5 size-2.5 rounded-full bg-brand" aria-hidden />
                          <p className="text-sm font-medium">{h.label}</p>
                          <p className="text-[12.5px] text-ink-3">{fmt.date(h.at)}</p>
                        </li>
                      ))}
                    </ol>
                  </CardBody>
                </Card>
              </div>
            </div>
          </>
        );
      }}
    </QueryView>
  );
}

function MetricsCard({ id, metrics }: { id: string; metrics: Metric[] }) {
  const [metric, setMetric] = useState<Metric>(metrics[0]!);
  const [days, setDays] = useState<"1" | "7" | "30">("7");
  const s = useSeries(id, metric, Number(days));
  const unit = METRIC_UNIT[metric];
  const last = s.data?.points.filter((p) => p[1] != null).at(-1)?.[1];
  return (
    <Card>
      <CardHeader title={METRIC_LABEL[metric]} subtitle={last == null ? "Aucune valeur récente" : `Dernière valeur : ${fmt.num(last, unit === "°C" || unit === "" ? 1 : 0)} ${unit}`} actions={<Segmented label="Période" size="sm" value={days} onChange={setDays} options={[{ value: "1", label: "24 h" }, { value: "7", label: "7 j" }, { value: "30", label: "30 j" }]} />} />
      <CardBody>
        <div className="mb-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Mesure affichée">
          {metrics.map((m) => (
            <button key={m} role="radio" aria-checked={m === metric} onClick={() => setMetric(m)} className="h-8 rounded-full border border-line-strong px-3 font-display text-[12.5px] font-semibold aria-checked:border-ink aria-checked:bg-ink aria-checked:text-bg">
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
        {s.data ? <TimeSeriesChart ariaLabel={`${METRIC_LABEL[metric]} du capteur ${id}`} unit={unit} height={300} series={[{ key: "v", name: METRIC_LABEL[metric], points: s.data.points }]} area digits={unit === "°C" || unit === "" || unit === "dS/m" ? 1 : 0} /> : <Skeleton className="h-[300px]" />}
      </CardBody>
    </Card>
  );
}
