import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Droplets, ListPlus, Phone, CalendarClock, Settings2 } from "lucide-react";
import { fmt, DEVICE_STATUS_LABEL, type ParcelDetail as PD } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { LIVE_MS, useSeries } from "@/lib/hooks";
import { PageHeader, DefinitionList } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView, Callout, Skeleton } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/data";
import { MoistureBadge, DeviceBadge, SeverityBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { TimeSeriesChart, MonthBars } from "@/components/charts/charts";
import { IrrigateSheet, StopButton } from "@/features/shared/irrigation";
import { NewTaskSheet } from "@/features/shared/TasksPage";

const DAYS = ["lun", "mar", "mer", "jeu", "ven", "sam", "dim"];

export default function ParcelDetail() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["parcel", id], queryFn: () => api.parcels.get(id), refetchInterval: LIVE_MS });
  const [irr, setIrr] = useState(false);
  const [task, setTask] = useState(false);
  const canIrrigate = useCan("irrigation:commander");
  const canTask = useCan("taches:gerer");
  return (
    <QueryView q={q}>
      {(d) => {
        const p = d.snapshot.parcel;
        return (
          <>
            <PageHeader
              crumbs={[{ label: "Parcelles", to: "/app/parcelles" }, { label: p.name }]}
              title={`${p.name} · ${p.crop}`}
              subtitle={`${p.variety ?? ""} · ${fmt.hectares(p.areaHa)} · sol ${p.soil} · plantée le ${fmt.date(p.plantedAt)}, récolte prévue ${fmt.monthYear(p.harvestAt)}`}
              actions={
                <>
                  {canTask && (
                    <Button variant="secondary" icon={<ListPlus className="size-4" aria-hidden />} onClick={() => setTask(true)}>
                      Créer une tâche
                    </Button>
                  )}
                  {d.snapshot.irrigating ? (
                    <StopButton parcelId={p.id} size="md" />
                  ) : (
                    canIrrigate && (
                      <Button icon={<Droplets className="size-4" aria-hidden />} onClick={() => setIrr(true)} disabled={d.snapshot.state === "indisponible"}>
                        Arroser
                      </Button>
                    )
                  )}
                </>
              }
            />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="flex flex-col gap-6">
                <StatusBand d={d} />
                <MoistureCard d={d} />
                <div className="grid gap-6 lg:grid-cols-2">
                  <SoilCard d={d} />
                  <Card>
                    <CardHeader title="Eau utilisée" subtitle="6 derniers mois" />
                    <CardBody>
                      <MonthBars data={d.waterByMonth.map((w) => ({ month: w.month, value: w.m3 }))} unit="m³" height={180} ariaLabel={`Eau utilisée par la ${p.name}`} />
                    </CardBody>
                  </Card>
                </div>
                <JournalCard d={d} />
              </div>
              <div className="flex flex-col gap-6">
                <ThresholdsCard d={d} />
                <IrrigationCard d={d} />
                <Card>
                  <CardHeader title="Capteurs" subtitle={`${d.devices.length} sur cette parcelle`} />
                  <CardBody className="pt-2">
                    <ul className="divide-y divide-line">
                      {d.devices.map((dv) => (
                        <li key={dv.id}>
                          <Link to={`/app/capteurs/${dv.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-surface-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-display text-sm font-semibold tabular">{dv.id}</p>
                              <p className="text-[12.5px] text-ink-3">
                                {dv.battery != null ? `batterie ${dv.battery} %` : ""} · {dv.lastSeenAt ? fmt.ago(dv.lastSeenAt) : "jamais vu"}
                              </p>
                            </div>
                            <DeviceBadge status={dv.status} size="sm" />
                          </Link>
                        </li>
                      ))}
                      {!d.devices.length && <li className="py-3 text-sm text-ink-3">Aucun capteur associé.</li>}
                    </ul>
                  </CardBody>
                </Card>
                {d.responsible && (
                  <Card className="p-5">
                    <p className="text-[12.5px] text-ink-3">Responsable de la parcelle</p>
                    <p className="mt-0.5 font-display font-semibold">
                      {d.responsible.firstName} {d.responsible.lastName}
                    </p>
                    <a href={`tel:${d.responsible.phone}`} className="mt-2 inline-flex items-center gap-2 text-sm font-display font-semibold text-brand hover:underline">
                      <Phone className="size-4" aria-hidden /> {fmt.phone(d.responsible.phone)}
                    </a>
                  </Card>
                )}
              </div>
            </div>
            <IrrigateSheet snapshot={d.snapshot} open={irr} onOpenChange={setIrr} />
            <NewTaskSheet open={task} onOpenChange={setTask} module="agritech" link={{ type: "parcelle", id: p.id }} />
          </>
        );
      }}
    </QueryView>
  );
}

function StatusBand({ d }: { d: PD }) {
  const s = d.snapshot;
  const p = s.parcel;
  const open = d.alerts.filter((a) => a.status !== "resolue");
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <div>
          <p className="text-[13px] text-ink-3">Humidité du sol</p>
          <p className="font-display text-[48px] font-semibold leading-none tabular">{fmt.pct(s.moisture)}</p>
        </div>
        <div className="flex flex-col gap-2">
          <MoistureBadge state={s.state} />
          <p className="text-sm text-ink-2">
            Plage visée {p.moisture.dry} à {p.moisture.wet} % · {s.lastMeasureAt ? `mesuré ${fmt.ago(s.lastMeasureAt)}` : "aucune mesure récente"}
          </p>
        </div>
        <div className="ml-auto grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <span className="text-ink-3">Température du sol</span>
          <span className="font-display font-semibold tabular">{fmt.temp(s.soilTemp)}</span>
          <span className="text-ink-3">Eau ce mois-ci</span>
          <span className="font-display font-semibold tabular">{fmt.m3(s.waterMonthM3)}</span>
        </div>
      </div>
      {open.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {open.map((a) => (
            <li key={a.id}>
              <Callout tone={a.severity === "critique" ? "danger" : a.severity === "attention" ? "warn" : "info"} title={a.title}>
                {a.advice}
              </Callout>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function MoistureCard({ d }: { d: PD }) {
  const [days, setDays] = useState<"1" | "7" | "30">("7");
  const dev = d.devices.find((x) => x.status !== "hors_ligne") ?? d.devices[0];
  const s = useSeries(dev?.id, "soilMoisture", Number(days));
  const p = d.snapshot.parcel;
  return (
    <Card>
      <CardHeader
        title="Humidité du sol"
        subtitle={dev ? `Capteur ${dev.id} · ${DEVICE_STATUS_LABEL[dev.status].toLowerCase()}` : "Aucun capteur"}
        actions={<Segmented label="Période" size="sm" value={days} onChange={setDays} options={[{ value: "1", label: "24 h" }, { value: "7", label: "7 j" }, { value: "30", label: "30 j" }]} />}
      />
      <CardBody>
        {s.data ? (
          <TimeSeriesChart ariaLabel={`Humidité du sol de la ${p.name} sur ${days} jours`} unit="%" height={280} band={[p.moisture.dry, p.moisture.wet]} series={[{ key: "h", name: "Humidité", color: "var(--series-1)", points: s.data.points }]} area digits={1} />
        ) : (
          <Skeleton className="h-[280px] w-full" />
        )}
        <p className="mt-3 text-[13px] text-ink-3">Chaque remontée correspond à un arrosage ; la pente descendante est l’évaporation de la journée.</p>
      </CardBody>
    </Card>
  );
}

function SoilCard({ d }: { d: PD }) {
  const s = d.soil;
  const phNote = s.ph == null ? "" : s.ph < 6 ? "acide" : s.ph > 7.5 ? "basique" : "neutre, favorable";
  return (
    <Card>
      <CardHeader title="Analyse du sol" subtitle="Dernière mesure du capteur 7-en-1" />
      <CardBody>
        <DefinitionList
          items={[
            { label: "pH", value: s.ph == null ? "—" : `${fmt.num(s.ph, 1)} (${phNote})` },
            { label: "Conductivité", value: s.ec == null ? "—" : `${fmt.num(s.ec, 1)} dS/m` },
            { label: "Azote (N)", value: s.n == null ? "—" : `${s.n} mg/kg` },
            { label: "Phosphore (P)", value: s.p == null ? "—" : `${s.p} mg/kg` },
            { label: "Potassium (K)", value: s.k == null ? "—" : `${s.k} mg/kg` },
            { label: "Température", value: fmt.temp(s.temp) },
          ]}
        />
        {s.n != null && s.n < 30 && <Callout tone="info" className="mt-4" title="Azote un peu bas">Un apport fractionné d’engrais azoté peut être utile avant la floraison.</Callout>}
      </CardBody>
    </Card>
  );
}

function ThresholdsCard({ d }: { d: PD }) {
  const p = d.snapshot.parcel;
  const [dry, setDry] = useState(p.moisture.dry);
  const [wet, setWet] = useState(p.moisture.wet);
  const can = useCan("parcelles:modifier");
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => api.parcels.update(p.id, { moisture: { dry, wet } }),
    onSuccess: () => {
      for (const k of ["parcel", "parcels", "overview", "alerts"]) qc.invalidateQueries({ queryKey: [k] });
      toast.success(`Seuils de la ${p.name} enregistrés : ${dry} à ${wet} %.`);
    },
  });
  const invalid = wet - dry < 5;
  const changed = dry !== p.moisture.dry || wet !== p.moisture.wet;
  return (
    <Card>
      <CardHeader title="Seuils d’humidité" subtitle="Pour cette culture et ce sol" />
      <CardBody className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sec en dessous de">
            <Input type="number" inputMode="numeric" min={5} max={80} value={dry} onChange={(e) => setDry(Number(e.target.value))} suffix="%" disabled={!can} />
          </Field>
          <Field label="Humide au-dessus de" error={invalid ? "Au moins 5 points d’écart" : undefined}>
            <Input type="number" inputMode="numeric" min={10} max={95} value={wet} onChange={(e) => setWet(Number(e.target.value))} suffix="%" disabled={!can} />
          </Field>
        </div>
        {can ? (
          <Button onClick={() => save.mutate()} disabled={!changed || invalid} loading={save.isPending} icon={<Settings2 className="size-4" aria-hidden />}>
            Enregistrer les seuils
          </Button>
        ) : (
          <p className="text-[13px] text-ink-3">Seul un responsable peut modifier les seuils.</p>
        )}
        <p className="text-[13px] text-ink-3">Les alertes et l’irrigation automatique utilisent ces seuils dès l’enregistrement.</p>
      </CardBody>
    </Card>
  );
}

function IrrigationCard({ d }: { d: PD }) {
  const r = d.rule;
  return (
    <Card>
      <CardHeader
        title="Irrigation"
        actions={
          <ButtonLink to="/app/irrigation" variant="ghost" size="sm">
            Modifier
          </ButtonLink>
        }
      />
      <CardBody className="flex flex-col gap-3 text-sm">
        {r ? (
          <p>
            <span className="font-display font-semibold">{r.mode === "automatique" ? "Automatique" : "Manuelle"}</span>
            {r.mode === "automatique" ? ` : démarre sous ${r.startBelow} %, s’arrête à ${r.stopAbove} %, ${r.maxDurationMin} min au plus. Suspendue si plus de ${r.skipIfRainMm} mm de pluie sont prévus.` : " : aucun arrosage n’est lancé sans action d’un membre."}
          </p>
        ) : (
          <p className="text-ink-3">Aucune règle.</p>
        )}
        {d.schedules.map((s) => (
          <p key={s.id} className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
            <span>
              {s.days.length === 7 ? "Tous les jours" : s.days.map((x) => DAYS[x]).join(", ")} à {s.time}, {s.durationMin} min{!s.enabled && " (en pause)"}
            </span>
          </p>
        ))}
      </CardBody>
    </Card>
  );
}

function JournalCard({ d }: { d: PD }) {
  const label = { terminee: "Irrigation terminée", lancee: "Irrigation lancée", annulee: "Irrigation annulée", regle_modifiee: "Règle modifiée" } as const;
  return (
    <Card>
      <CardHeader title="Journal" subtitle="Irrigations et changements de règle" />
      <CardBody className="pt-2">
        <ol className="relative ml-2 border-l border-line">
          {d.events.map((e) => (
            <li key={e.id} className="relative pb-4 pl-5 last:pb-0">
              <span className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full ${e.kind === "annulee" ? "bg-danger" : e.kind === "regle_modifiee" ? "bg-brand" : "bg-water"}`} aria-hidden />
              <p className="font-display text-sm font-semibold">{label[e.kind]}</p>
              <p className="text-[13px] text-ink-3">
                {fmt.ago(e.at)}
                {e.durationMin ? ` · ${e.durationMin} min` : ""}
                {e.liters ? ` · ${e.liters} L` : ""}
                {` · ${e.trigger}`}
                {e.note ? ` · ${e.note}` : ""}
              </p>
            </li>
          ))}
          {!d.events.length && <li className="pl-5 text-sm text-ink-3">Aucun événement récent.</li>}
        </ol>
        {d.alerts.some((a) => a.status === "resolue") && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-sm font-semibold text-ink-2">Alertes passées</p>
            {d.alerts
              .filter((a) => a.status === "resolue")
              .map((a) => (
                <p key={a.id} className="flex items-center gap-2 text-[13px] text-ink-3">
                  <SeverityBadge severity={a.severity} size="sm" /> {a.title} · {fmt.date(a.createdAt)}
                </p>
              ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
