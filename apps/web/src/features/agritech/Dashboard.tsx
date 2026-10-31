import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sun, Wind, CloudRain, Droplets, RadioTower, BatteryLow, Sprout, Warehouse, ArrowUpRight, Waves, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { fmt, RISK_LABEL, type Overview, type ParcelSnapshot, type Task } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useSession, useCan } from "@/lib/auth";
import { LIVE_MS, MOISTURE_COLOR, RISK_COLOR, useSeries } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView, Skeleton } from "@/components/ui/feedback";
import { Kpi, Segmented } from "@/components/ui/data";
import { MoistureBadge, RiskBadge, TaskStatusBadge } from "@/components/ui/badge";
import { ButtonLink, Button } from "@/components/ui/button";
import { Gauge, MonthBars, Sparkline } from "@/components/charts/charts";
import { ActionList } from "@/features/shared/ActionList";
import { IrrigateSheet, StopButton } from "@/features/shared/irrigation";
import { SyncStatus } from "@/layouts/AppShell";
import { NewTaskSheet } from "@/features/shared/TasksPage";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", timeZone: "Africa/Dakar" }).format(new Date()));
  return h < 5 || h >= 18 ? "Bonsoir" : "Bonjour";
}

export default function Dashboard() {
  const { data: session } = useSession();
  const q = useQuery({ queryKey: ["overview"], queryFn: api.overview, refetchInterval: LIVE_MS });
  const [irrigate, setIrrigate] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        title={`${greeting()} ${session?.user.firstName ?? ""}`}
        subtitle={q.data ? `${q.data.siteLabel} · ${fmt.dateLong(new Date())}` : fmt.dateLong(new Date())}
        meta={q.data && <SyncStatus at={q.data.generatedAt} />}
        actions={
          <ButtonLink to="/app/rapports" variant="secondary">
            Voir les rapports
          </ButtonLink>
        }
      />
      <QueryView q={q}>
        {(d) => (
          <div className="flex flex-col gap-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <Card>
                <CardHeader
                  title="À faire aujourd’hui"
                  subtitle={d.alerts.length ? `${fmt.plural(d.alerts.length, "point", "points")} à examiner, du plus urgent au moins urgent` : "Tout est dans la plage"}
                  actions={
                    <Link to="/app/alertes" className="text-sm font-display font-semibold text-brand hover:underline">
                      Toutes les alertes
                    </Link>
                  }
                />
                <CardBody className="pt-1">
                  <ActionList alerts={d.alerts} onIrrigate={(id) => setIrrigate(id)} limit={5} showModule />
                </CardBody>
              </Card>
              <div className="flex flex-col gap-6">
                <WeatherCard d={d} />
                <AverageCard d={d} />
              </div>
            </div>

            <section aria-labelledby="parcelles-titre">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="parcelles-titre" className="text-lg font-semibold">
                    Humidité du sol, parcelle par parcelle
                  </h2>
                  <p className="text-sm text-ink-3">7 derniers jours. La bande verte est la plage visée pour la culture.</p>
                </div>
                <ButtonLink to="/app/carte" variant="ghost" size="sm" icon={<ArrowUpRight className="size-4" aria-hidden />}>
                  Ouvrir la carte
                </ButtonLink>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {d.parcels.map((p) => (
                  <ParcelTile key={p.parcel.id} s={p} onIrrigate={() => setIrrigate(p.parcel.id)} />
                ))}
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Surface suivie" value={fmt.num(d.areaHa, 1)} unit="ha" sub={`+${fmt.num(d.areaTrendHa, 1)} ha depuis le début de la saison`} icon={<Sprout className="size-[18px]" aria-hidden />} tone="brand" to="/app/parcelles" />
              <Kpi label="Eau économisée" value={d.water.savedPct} unit="%" sub={`par rapport à un arrosage à heure fixe (${fmt.m3(d.water.savedM3)} ce mois)`} icon={<Droplets className="size-[18px]" aria-hidden />} tone="water" to="/app/rapports" />
              <Kpi label="Capteurs en ligne" value={`${d.devices.online} / ${d.devices.total}`} sub={d.devices.offline.length ? `${d.devices.offline.join(", ")} hors ligne` : "Tous transmettent"} icon={<RadioTower className="size-[18px]" aria-hidden />} tone={d.devices.offline.length ? "sun" : "brand"} to="/app/capteurs" />
              <Kpi label="Batteries faibles" value={d.devices.lowBattery.length} sub={d.devices.lowBattery.length ? `${d.devices.lowBattery.join(", ")} à remplacer` : "Aucune à prévoir"} icon={<BatteryLow className="size-[18px]" aria-hidden />} tone={d.devices.lowBattery.length ? "danger" : "neutral"} to="/app/capteurs" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <WaterCard d={d} />
              <EquipmentCard d={d} onIrrigate={setIrrigate} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
              <StorageCard d={d} />
              <TasksCard tasks={d.tasks} />
            </div>
          </div>
        )}
      </QueryView>
      <IrrigateSheet snapshot={q.data?.parcels.find((p) => p.parcel.id === irrigate) ?? null} open={!!irrigate} onOpenChange={(v) => !v && setIrrigate(null)} />
    </>
  );
}

function ParcelTile({ s, onIrrigate }: { s: ParcelSnapshot; onIrrigate: () => void }) {
  const dev = s.parcel.sensorIds[0];
  const series = useSeries(dev, "soilMoisture", 7);
  const canIrrigate = useCan("irrigation:commander");
  const p = s.parcel;
  return (
    <article className="group relative flex flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-semibold">
            <Link to={`/app/parcelles/${p.id}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none">
              {p.name}
            </Link>
          </h3>
          <p className="text-[13px] text-ink-3">
            {p.crop} · {fmt.hectares(p.areaHa)}
          </p>
        </div>
        <MoistureBadge state={s.state} size="sm" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-display text-[34px] font-semibold leading-none tracking-tight tabular" style={{ color: s.state === "indisponible" ? "var(--ink-3)" : undefined }}>
          {s.moisture == null ? "—" : Math.round(s.moisture)}
          {s.moisture != null && <span className="ml-0.5 text-base font-medium text-ink-3">%</span>}
        </p>
        <p className="pb-1 text-right text-[12px] text-ink-3">
          {s.irrigating ? (
            <span className="inline-flex items-center gap-1 font-semibold text-water-ink">
              <Waves className="size-3.5 animate-pulse-soft" aria-hidden /> Arrosage en cours
            </span>
          ) : s.lastMeasureAt ? (
            `mesuré ${fmt.ago(s.lastMeasureAt)}`
          ) : (
            "aucune mesure récente"
          )}
        </p>
      </div>
      <div className="mt-3">
        {series.data ? (
          <Sparkline points={series.data.points} band={[p.moisture.dry, p.moisture.wet]} label={`Humidité de ${p.name} sur 7 jours`} stateColor={MOISTURE_COLOR[s.state]} />
        ) : (
          <Skeleton className="h-14 w-full" />
        )}
      </div>
      {s.state === "sec" && canIrrigate && !s.irrigating && (
        <Button size="sm" className="relative z-10 mt-3 self-start" icon={<Droplets className="size-4" aria-hidden />} onClick={onIrrigate}>
          Arroser maintenant
        </Button>
      )}
      {s.irrigating && (
        <div className="relative z-10 mt-3">
          <StopButton parcelId={p.id} />
        </div>
      )}
    </article>
  );
}

function WeatherCard({ d }: { d: Overview }) {
  const w = d.weather;
  const [unit, setUnit] = useState<"C" | "F">("C");
  const T = (v: number) => (unit === "C" ? `${v} °C` : `${Math.round((v * 9) / 5 + 32)} °F`);
  return (
    <Card>
      <CardHeader title="Météo à Mboro" subtitle={w.simulated ? "Données d’exemple" : "Prévisions Open-Meteo"} actions={<Segmented label="Unité de température" size="sm" value={unit} onChange={setUnit} options={[{ value: "C", label: "°C" }, { value: "F", label: "°F" }]} />} />
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Sun className="size-12 text-sun" aria-hidden />
          <div>
            <p className="font-display text-[40px] font-semibold leading-none tabular">{T(w.temp)}</p>
            <p className="mt-1 text-sm text-ink-3">
              Ressenti {T(w.feelsLike)} · min {T(w.min)} · max {T(w.max)}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-surface-2 px-2 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-[12px] text-ink-3">
              <Wind className="size-3.5" aria-hidden /> Vent
            </dt>
            <dd className="mt-0.5 font-display text-sm font-semibold">
              {w.windKmh}&nbsp;km/h <span className="block text-[11.5px] font-medium text-ink-3">{w.windDir}</span>
            </dd>
          </div>
          <div className="rounded-lg bg-surface-2 px-2 py-2.5">
            <dt className="flex items-center justify-center gap-1 text-[12px] text-ink-3">
              <CloudRain className="size-3.5" aria-hidden /> Pluie
            </dt>
            <dd className="mt-0.5 font-display text-sm font-semibold">
              {fmt.num(w.rainTomorrowMm, 1)}&nbsp;mm <span className="block text-[11.5px] font-medium text-ink-3">demain</span>
            </dd>
          </div>
          <div className="rounded-lg bg-surface-2 px-2 py-2.5">
            <dt className="text-[12px] text-ink-3">Évaporation</dt>
            <dd className="mt-0.5 font-display text-sm font-semibold">
              {fmt.num(w.et0Mm, 1)}&nbsp;mm <span className="block text-[11.5px] font-medium text-ink-3">par jour</span>
            </dd>
          </div>
        </dl>
        <p className="rounded-lg border border-line px-3 py-2.5 text-[13px] text-ink-2">
          {w.rainTomorrowMm < 2 ? "Pas de pluie prévue : les règles d’irrigation automatique restent actives." : "Pluie prévue : les arrosages automatiques de demain seront suspendus."}
        </p>
      </CardBody>
    </Card>
  );
}

function WaterCard({ d }: { d: Overview }) {
  const [parcel, setParcel] = useState("toutes");
  const codes = Object.keys(d.water.months[0]?.byParcel ?? {});
  const data = d.water.months.map((m) => ({ month: m.month, value: parcel === "toutes" ? m.total : (m.byParcel[parcel] ?? 0) }));
  return (
    <Card>
      <CardHeader
        title="Eau utilisée par mois"
        subtitle={`${fmt.m3(d.water.monthM3)} ce mois-ci, toutes parcelles`}
        actions={
          <select value={parcel} onChange={(e) => setParcel(e.target.value)} className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-[13px]" aria-label="Filtrer par parcelle">
            <option value="toutes">Toutes les parcelles</option>
            {codes.map((c) => (
              <option key={c} value={c}>
                Parcelle {c}
              </option>
            ))}
          </select>
        }
      />
      <CardBody>
        <MonthBars data={data} unit="m³" ariaLabel="Eau utilisée chaque mois, en mètres cubes" />
      </CardBody>
    </Card>
  );
}

function AverageCard({ d }: { d: Overview }) {
  const online = d.parcels.filter((p) => p.moisture != null);
  const avg = online.length ? online.reduce((a, p) => a + p.moisture!, 0) / online.length : null;
  const counts = { sec: 0, optimal: 0, humide: 0, indisponible: 0 } as Record<string, number>;
  for (const p of d.parcels) counts[p.state]! += 1;
  return (
    <Card>
      <CardHeader title="Humidité moyenne" subtitle={`Moyenne de ${online.length} parcelles en ligne`} />
      <CardBody className="flex flex-col items-center gap-4">
        <Gauge value={avg} band={[30, 45]} label="Humidité moyenne du sol" sub="Sec sous 30 %, humide au-dessus de 45 %" />
        <ul className="grid w-full grid-cols-2 gap-2 text-sm">
          {(
            [
              ["sec", "Sèches"],
              ["optimal", "Dans la plage"],
              ["humide", "Humides"],
              ["indisponible", "Sans mesure"],
            ] as const
          ).map(([k, l]) => (
            <li key={k} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
              <span className="size-2.5 rounded-full" style={{ background: MOISTURE_COLOR[k] }} aria-hidden />
              <span className="text-ink-2">{l}</span>
              <span className="ml-auto font-display font-semibold tabular">{counts[k]}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function EquipmentCard({ d, onIrrigate }: { d: Overview; onIrrigate: (id: string) => void }) {
  const byParcel = new Map(d.parcels.map((p) => [p.parcel.id, p]));
  return (
    <Card>
      <CardHeader
        title="Pompe et vannes"
        subtitle={d.equipment.pump.running ? `${d.equipment.pump.name} en marche · ${fmt.num(d.equipment.pump.flowM3h, 1)} m³/h` : `${d.equipment.pump.name} à l’arrêt`}
        actions={
          <ButtonLink to="/app/irrigation" variant="ghost" size="sm">
            Règles et programmation
          </ButtonLink>
        }
      />
      <CardBody>
        <ul className="grid gap-2 sm:grid-cols-2">
          {d.equipment.valves.map((v) => {
            const s = byParcel.get(v.parcelId);
            if (!s) return null;
            return (
              <li key={v.id} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5", v.open ? "border-water bg-water-soft/50" : "border-line")}>
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", v.open ? "bg-water text-white dark:text-[#06222a]" : "bg-surface-2 text-ink-3")}>
                  <Droplets className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold">{v.name}</p>
                  <p className="text-[12.5px] text-ink-3">{v.open ? "Ouverte, arrosage en cours" : `Fermée · sol à ${fmt.pct(s.moisture)}`}</p>
                </div>
                {v.open ? (
                  <StopButton parcelId={v.parcelId} />
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => onIrrigate(v.parcelId)} disabled={s.state === "indisponible"}>
                    Arroser
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

function StorageCard({ d }: { d: Overview }) {
  if (!d.storage.length) return null;
  return (
    <Card>
      <CardHeader
        title="Stocks et conservation"
        subtitle="Module Onion"
        actions={
          <ButtonLink to="/app/onion" variant="ghost" size="sm" icon={<ArrowUpRight className="size-4" aria-hidden />}>
            Ouvrir Onion
          </ButtonLink>
        }
      />
      <CardBody className="pt-2">
        <ul className="divide-y divide-line">
          {d.storage.map((w) => (
            <li key={w.id}>
              <Link to={`/app/onion/entrepots/${w.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-onion-soft text-onion-ink">
                  <Warehouse className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold">{w.name}</p>
                  <p className="text-[12.5px] text-ink-3">
                    {w.product === "oignon" ? "Oignon" : "Pomme de terre"} {w.variety} · {fmt.tonnes(w.stockT)}
                    {w.days != null ? ` · ${w.days} j en stock` : ""}
                  </p>
                </div>
                <span className="hidden sm:block">
                  <RiskBadge risk={w.risk} size="sm" />
                </span>
                <span className="size-2.5 rounded-full sm:hidden" style={{ background: RISK_COLOR[w.risk] }} aria-label={RISK_LABEL[w.risk]} />
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function TasksCard({ tasks }: { tasks: Task[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const canManage = useCan("taches:gerer");
  const members = useQuery({ queryKey: ["members"], queryFn: api.members.list, staleTime: 5 * 60_000 });
  const toggle = useMutation({
    mutationFn: (t: Task) => api.tasks.status(t.id, t.status === "terminee" ? "a_faire" : "terminee"),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (t.status === "terminee") toast.success("Tâche terminée.");
    },
  });
  const name = (id: string | null) => {
    const m = members.data?.find((x) => x.user.id === id);
    return m ? `${m.user.firstName} ${m.user.lastName}` : "Non attribuée";
  };
  const list = [...tasks].sort((a, b) => Number(a.status === "terminee") - Number(b.status === "terminee") || a.due.localeCompare(b.due)).slice(0, 6);
  return (
    <Card>
      <CardHeader
        title="Tâches de l’équipe"
        subtitle={`${tasks.filter((t) => t.status !== "terminee").length} en cours ou à faire`}
        actions={
          <>
            <ButtonLink to="/app/taches" variant="ghost" size="sm">
              Toutes les tâches
            </ButtonLink>
            {canManage && (
              <Button size="sm" icon={<Plus className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
                Ajouter une tâche
              </Button>
            )}
          </>
        }
      />
      <CardBody className="pt-2">
        <ul className="divide-y divide-line">
          {list.map((t) => {
            const done = t.status === "terminee";
            const late = !done && t.due < new Date().toISOString().slice(0, 10);
            return (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => toggle.mutate(t)}
                  className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors", done ? "border-brand bg-brand text-brand-ink" : "border-line-strong hover:border-brand")}
                  aria-label={done ? `Marquer « ${t.title} » à faire` : `Marquer « ${t.title} » terminée`}
                  aria-pressed={done}
                >
                  {done && <Check className="size-4" strokeWidth={3} aria-hidden />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[14.5px] font-medium", done && "text-ink-3 line-through")}>{t.title}</p>
                  <p className={cn("text-[12.5px]", late ? "font-semibold text-danger-ink" : "text-ink-3")}>
                    {name(t.assigneeId)} · {late ? "en retard, " : ""}
                    {t.due === new Date().toISOString().slice(0, 10) ? "aujourd’hui" : fmt.date(t.due)}
                  </p>
                </div>
                <span className="max-sm:hidden">
                  <TaskStatusBadge status={t.status} />
                </span>
              </li>
            );
          })}
        </ul>
      </CardBody>
      <NewTaskSheet open={open} onOpenChange={setOpen} module="agritech" />
    </Card>
  );
}
