import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { Warehouse, Package, AlertTriangle, RadioTower } from "lucide-react";
import { fmt } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { LIVE_MS, useSeries } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView, Skeleton } from "@/components/ui/feedback";
import { Kpi, Segmented } from "@/components/ui/data";
import { TimeSeriesChart } from "@/components/charts/charts";
import { ActionList } from "@/features/shared/ActionList";
import { SyncStatus } from "@/layouts/AppShell";
import { WarehouseCard } from "./shared";

export default function Overview() {
  const ws = useQuery({ queryKey: ["warehouses"], queryFn: api.warehouses.list, refetchInterval: LIVE_MS });
  const alerts = useQuery({ queryKey: ["alerts", "onion"], queryFn: () => api.alerts.list({ module: "onion" }), refetchInterval: LIVE_MS });
  const devices = useQuery({ queryKey: ["devices"], queryFn: api.devices.list, refetchInterval: LIVE_MS });
  return (
    <>
      <PageHeader title="Stockage des oignons" subtitle="Conditions de conservation dans vos magasins, rangée par rangée." meta={<SyncStatus at={new Date().toISOString()} />} />
      <QueryView q={ws}>
        {(list) => {
          const probes = (devices.data ?? []).filter((d) => d.kind === "stockage" || d.kind === "air");
          const open = (alerts.data ?? []).filter((a) => a.status !== "resolue");
          return (
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Stock suivi" value={fmt.num(list.reduce((a, w) => a + w.stockT, 0), 0)} unit="t" sub={`dans ${fmt.plural(list.length, "magasin", "magasins")}`} icon={<Package className="size-[18px]" aria-hidden />} tone="onion" to="/app/onion/lots" />
                <Kpi label="Magasins à risque" value={list.filter((w) => w.risk === "risque" || w.risk === "pourriture").length} sub="pourriture probable ou risque élevé" icon={<AlertTriangle className="size-[18px]" aria-hidden />} tone={list.some((w) => w.risk === "pourriture" || w.risk === "risque") ? "danger" : "brand"} to="/app/onion/entrepots" />
                <Kpi label="Alertes ouvertes" value={open.length} sub={open.length ? `dont ${open.filter((a) => a.severity === "critique").length} critique(s)` : "aucune"} icon={<Warehouse className="size-[18px]" aria-hidden />} tone={open.length ? "sun" : "brand"} to="/app/onion/alertes" />
                <Kpi label="Sondes en ligne" value={`${probes.filter((d) => d.status !== "hors_ligne").length} / ${probes.length}`} sub={probes.filter((d) => d.status === "hors_ligne").map((d) => d.id).join(", ") || "toutes transmettent"} icon={<RadioTower className="size-[18px]" aria-hidden />} tone="water" to="/app/onion/capteurs" />
              </div>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader title="À faire aujourd’hui" subtitle="Alertes de stockage, de la plus urgente à la moins urgente" />
                  <CardBody className="pt-1">{alerts.data ? <ActionList alerts={open} limit={4} /> : <Skeleton className="h-48" />}</CardBody>
                </Card>
                <TrendCard list={list} />
              </div>
              <section aria-labelledby="mag-titre">
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <h2 id="mag-titre" className="text-lg font-semibold">
                      Magasins
                    </h2>
                    <p className="text-sm text-ink-3">Une sonde au cœur de chaque rangée : la pourriture commence au centre du tas, là où l’œil ne voit rien.</p>
                  </div>
                  <Link to="/app/onion/entrepots" className="text-sm font-display font-semibold text-brand hover:underline">
                    Tous les entrepôts
                  </Link>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {list.map((w) => (
                    <WarehouseCard key={w.warehouse.id} w={w} />
                  ))}
                </div>
              </section>
            </div>
          );
        }}
      </QueryView>
    </>
  );
}

function TrendCard({ list }: { list: Awaited<ReturnType<typeof api.warehouses.list>> }) {
  const [id, setId] = useState(list[0]?.warehouse.id ?? "");
  const [metric, setMetric] = useState<"airHumidity" | "airTemp" | "co2">("airHumidity");
  const w = list.find((x) => x.warehouse.id === id) ?? list[0];
  const worst = w ? [...w.zones].sort((a, b) => b.riskScore - a.riskScore)[0] : null;
  const s = useSeries(worst?.deviceId, metric, 7);
  if (!w) return null;
  const t = w.warehouse.thresholds;
  const band: [number, number] | undefined = metric === "airHumidity" ? t.humidity : metric === "airTemp" ? t.temp : undefined;
  const label = { airHumidity: "Humidité de l’air", airTemp: "Température", co2: "CO₂" }[metric];
  return (
    <Card>
      <CardHeader
        title={`${label} · 7 jours`}
        subtitle={worst ? `${w.warehouse.name}, ${w.warehouse.zones.find((z) => z.id === worst.zoneId)?.label.toLowerCase()} (la plus exposée)` : w.warehouse.name}
        actions={
          <select value={id} onChange={(e) => setId(e.target.value)} className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-[13px]" aria-label="Magasin">
            {list.map((x) => (
              <option key={x.warehouse.id} value={x.warehouse.id}>
                {x.warehouse.name}
              </option>
            ))}
          </select>
        }
      />
      <CardBody>
        <Segmented label="Mesure" size="sm" value={metric} onChange={setMetric} options={[{ value: "airHumidity", label: "Humidité" }, { value: "airTemp", label: "Température" }, { value: "co2", label: "CO₂" }]} className="mb-4" />
        {s.data ? (
          <TimeSeriesChart ariaLabel={`${label} sur 7 jours, ${w.warehouse.name}`} unit={metric === "co2" ? "ppm" : metric === "airTemp" ? "°C" : "%"} height={240} band={band} thresholds={metric === "co2" ? [{ y: t.co2, label: `alerte ${fmt.num(t.co2)} ppm` }] : []} series={[{ key: "v", name: label, color: "var(--series-2)", points: s.data.points }]} area digits={metric === "airTemp" ? 1 : 0} />
        ) : (
          <Skeleton className="h-[240px]" />
        )}
        <p className="mt-3 text-[13px] text-ink-3">{metric === "co2" ? "Le CO₂ monte quand les bulbes respirent trop ou commencent à pourrir." : "Bande verte : plage visée pour ce produit."}</p>
      </CardBody>
    </Card>
  );
}
