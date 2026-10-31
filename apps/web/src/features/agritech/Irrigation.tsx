import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { CalendarPlus, Droplets, Pause, Play, Trash2, Waves } from "lucide-react";
import { fmt, scheduleSchema, type IrrigationRule, type IrrigationState, type ScheduleInput } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { LIVE_MS } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Sheet, Confirm } from "@/components/ui/overlay";
import { Field, Input, Select, Switch, FormError } from "@/components/ui/form";
import { MoistureBadge } from "@/components/ui/badge";
import { IrrigateSheet, StopButton } from "@/features/shared/irrigation";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function Irrigation() {
  const q = useQuery({ queryKey: ["irrigation"], queryFn: api.irrigation.state, refetchInterval: LIVE_MS });
  const [plan, setPlan] = useState(false);
  const [irr, setIrr] = useState<string | null>(null);
  const canRules = useCan("irrigation:regles");
  return (
    <>
      <PageHeader
        title="Irrigation"
        subtitle={q.data ? `${q.data.pump.name} · ${q.data.valves.length} vannes · ${q.data.pump.running ? "pompe en marche" : "pompe à l’arrêt"}` : undefined}
        actions={
          canRules && (
            <Button icon={<CalendarPlus className="size-4" aria-hidden />} onClick={() => setPlan(true)}>
              Nouvelle programmation
            </Button>
          )
        }
      />
      <QueryView q={q}>
        {(d) => (
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader title="Règles par parcelle" subtitle="En automatique, la vanne s’ouvre quand le sol passe sous le seuil de démarrage et se ferme au seuil d’arrêt." />
              <CardBody className="pt-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {d.parcels.map((s) => (
                    <RuleCard key={s.parcel.id} d={d} parcelId={s.parcel.id} onIrrigate={() => setIrr(s.parcel.id)} />
                  ))}
                </div>
              </CardBody>
            </Card>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <WeekCard d={d} />
              <JournalCard d={d} />
            </div>
          </div>
        )}
      </QueryView>
      <ScheduleSheet open={plan} onOpenChange={setPlan} parcels={q.data?.parcels.map((p) => ({ id: p.parcel.id, name: p.parcel.name })) ?? []} />
      <IrrigateSheet snapshot={q.data?.parcels.find((p) => p.parcel.id === irr) ?? null} open={!!irr} onOpenChange={(v) => !v && setIrr(null)} />
    </>
  );
}

function RuleCard({ d, parcelId, onIrrigate }: { d: IrrigationState; parcelId: string; onIrrigate: () => void }) {
  const s = d.parcels.find((p) => p.parcel.id === parcelId)!;
  const rule = d.rules.find((r) => r.parcelId === parcelId);
  const valve = d.valves.find((v) => v.parcelId === parcelId);
  const canRules = useCan("irrigation:regles");
  const canCmd = useCan("irrigation:commander");
  const qc = useQueryClient();
  const [draft, setDraft] = useState<IrrigationRule | null>(null);
  const r = draft ?? rule;
  const save = useMutation({
    mutationFn: (x: IrrigationRule) => api.irrigation.rule(parcelId, { mode: x.mode, startBelow: x.startBelow, stopAbove: x.stopAbove, maxDurationMin: x.maxDurationMin, skipIfRainMm: x.skipIfRainMm }),
    onSuccess: (_d, x) => {
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["irrigation"] });
      qc.invalidateQueries({ queryKey: ["parcel"] });
      toast.success(`Parcelle ${s.parcel.code} : irrigation ${x.mode === "automatique" ? "automatique" : "manuelle"}, démarrage sous ${x.startBelow} %.`);
    },
  });
  if (!r) return null;
  const err = r.stopAbove - r.startBelow < 5 ? "L’arrêt doit être au moins 5 points au-dessus du démarrage" : undefined;
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border p-4", valve?.open ? "border-water bg-water-soft/40" : "border-line")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display font-semibold">
            {s.parcel.name} <span className="font-sans font-normal text-ink-3">· {s.parcel.crop}</span>
          </p>
          <p className="text-[13px] text-ink-3">Sol à {fmt.pct(s.moisture)}</p>
        </div>
        <MoistureBadge state={s.state} size="sm" />
      </div>
      <Switch
        label="Irrigation automatique"
        description={r.mode === "automatique" ? "Le capteur décide, dans les limites ci-dessous." : "Aucun arrosage sans action d’un membre."}
        checked={r.mode === "automatique"}
        disabled={!canRules || s.state === "indisponible"}
        onCheckedChange={(v) => save.mutate({ ...r, mode: v ? "automatique" : "manuel" })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Démarrer sous">
          <Input type="number" inputMode="numeric" suffix="%" value={r.startBelow} disabled={!canRules} onChange={(e) => setDraft({ ...r, startBelow: Number(e.target.value) })} />
        </Field>
        <Field label="Arrêter à" error={err}>
          <Input type="number" inputMode="numeric" suffix="%" value={r.stopAbove} disabled={!canRules} onChange={(e) => setDraft({ ...r, stopAbove: Number(e.target.value) })} />
        </Field>
      </div>
      {draft && (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => save.mutate(draft)} loading={save.isPending} disabled={!!err}>
            Enregistrer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
            Annuler
          </Button>
        </div>
      )}
      {s.state === "indisponible" && <p className="text-[13px] text-danger-ink">Capteur hors ligne : l’automatique est suspendu pour éviter d’arroser à l’aveugle.</p>}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        {valve?.open ? (
          <>
            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-water-ink">
              <Waves className="size-4 animate-pulse-soft" aria-hidden /> Arrosage en cours
            </span>
            <StopButton parcelId={parcelId} />
          </>
        ) : (
          <>
            <span className="text-[13px] text-ink-3">Vanne fermée</span>
            <Button size="sm" variant="secondary" icon={<Droplets className="size-4" aria-hidden />} onClick={onIrrigate} disabled={!canCmd || !valve}>
              Arroser
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function WeekCard({ d }: { d: IrrigationState }) {
  const qc = useQueryClient();
  const canRules = useCan("irrigation:regles");
  const toggle = useMutation({ mutationFn: (v: { id: string; enabled: boolean }) => api.irrigation.updateSchedule(v.id, { enabled: v.enabled }), onSuccess: () => qc.invalidateQueries({ queryKey: ["irrigation"] }) });
  const del = useMutation({
    mutationFn: api.irrigation.deleteSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["irrigation"] });
      toast.success("Programmation supprimée.");
    },
  });
  const todayIdx = (new Date().getUTCDay() + 6) % 7;
  return (
    <Card>
      <CardHeader title="Semaine d’irrigation" subtitle="Créneaux programmés. « Auto » : le capteur peut déclencher un arrosage ce jour-là." />
      <CardBody className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-[12.5px]">
          <caption className="sr-only">Programmation de la semaine par parcelle</caption>
          <thead>
            <tr>
              <th scope="col" className="w-24 text-left font-display font-semibold text-ink-3">
                Parcelle
              </th>
              {DAYS.map((x, i) => (
                <th key={x} scope="col" className={cn("font-display font-semibold", i === todayIdx ? "text-brand" : "text-ink-3")}>
                  {x}
                  {i === todayIdx && <span className="sr-only"> (aujourd’hui)</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {d.parcels.map((p) => {
              const sch = d.schedules.filter((s) => s.parcelId === p.parcel.id && s.enabled);
              const auto = d.rules.find((r) => r.parcelId === p.parcel.id)?.mode === "automatique";
              return (
                <tr key={p.parcel.id}>
                  <th scope="row" className="text-left font-display font-semibold">
                    {p.parcel.code} <span className="font-sans font-normal text-ink-3">{p.parcel.crop}</span>
                  </th>
                  {DAYS.map((_, i) => {
                    const s = sch.find((x) => x.days.includes(i));
                    return (
                      <td key={i} className={cn("h-10 rounded-md", s ? "bg-water font-display font-semibold text-white dark:text-[#06222a]" : auto ? "bg-water-soft text-water-ink" : "bg-surface-2 text-ink-3")}>
                        {s ? s.time : auto ? "auto" : ""}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {d.schedules.length > 0 && (
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {d.schedules.map((s) => {
              const p = d.parcels.find((x) => x.parcel.id === s.parcelId);
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold">{p?.parcel.name}</p>
                    <p className="text-[13px] text-ink-3">
                      {s.days.length === 7 ? "Tous les jours" : s.days.map((x) => DAYS[x]).join(", ")} à {s.time} · {s.durationMin} min
                    </p>
                  </div>
                  {canRules && (
                    <>
                      <Button size="sm" variant="ghost" icon={s.enabled ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />} onClick={() => toggle.mutate({ id: s.id, enabled: !s.enabled })}>
                        {s.enabled ? "Mettre en pause" : "Reprendre"}
                      </Button>
                      <Confirm
                        trigger={
                          <button className="rounded-md p-2 text-ink-3 hover:bg-danger-soft hover:text-danger-ink" aria-label={`Supprimer la programmation de ${p?.parcel.name}`}>
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        }
                        title="Supprimer cette programmation ?"
                        description={`${p?.parcel.name} ne sera plus arrosée à ${s.time}. Les règles automatiques restent actives.`}
                        confirmLabel="Supprimer la programmation"
                        onConfirm={() => del.mutateAsync(s.id)}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function JournalCard({ d }: { d: IrrigationState }) {
  const label = { terminee: "terminée", lancee: "lancée", annulee: "annulée", regle_modifiee: "règle modifiée" } as const;
  return (
    <Card>
      <CardHeader title="Journal d’irrigation" subtitle="Les 40 derniers événements" />
      <CardBody className="pt-2">
        <ol className="flex flex-col divide-y divide-line">
          {d.events.map((e) => {
            const p = d.parcels.find((x) => x.parcel.id === e.parcelId);
            return (
              <li key={e.id} className="flex gap-3 py-3">
                <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", e.kind === "annulee" ? "bg-danger" : e.kind === "regle_modifiee" ? "bg-brand" : "bg-water")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold">
                    {p?.parcel.name ?? e.parcelId} · {e.kind === "regle_modifiee" ? "règle modifiée" : `irrigation ${label[e.kind]}`}
                  </p>
                  <p className="text-[13px] text-ink-3">
                    {[e.durationMin ? `${e.durationMin} min` : null, e.liters ? `${e.liters} L` : null, e.trigger, e.note || null].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <time className="shrink-0 text-[12.5px] text-ink-3" dateTime={e.at}>
                  {fmt.ago(e.at)}
                </time>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}

function ScheduleSheet({ open, onOpenChange, parcels }: { open: boolean; onOpenChange: (v: boolean) => void; parcels: Array<{ id: string; name: string }> }) {
  const qc = useQueryClient();
  const form = useForm<z.input<typeof scheduleSchema>, unknown, ScheduleInput>({ resolver: zodResolver(scheduleSchema), defaultValues: { parcelId: parcels[0]?.id ?? "", days: [0, 2, 4], time: "06:00", durationMin: 20, enabled: true } });
  const days = form.watch("days");
  const add = useMutation({
    mutationFn: api.irrigation.addSchedule,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["irrigation"] });
      toast.success("Programmation enregistrée.", { description: "Elle est ignorée si le sol est déjà au-dessus du seuil d’arrêt." });
      onOpenChange(false);
    },
  });
  const e = form.formState.errors;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Nouvelle programmation"
      description="L’irrigation démarre à l’heure prévue, sauf si le sol est déjà au-dessus du seuil d’arrêt ou si de la pluie est prévue."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="form-prog" loading={add.isPending}>
            Programmer
          </Button>
        </>
      }
    >
      <form id="form-prog" noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => add.mutate(v))}>
        <FormError>{add.isError && !(add.error instanceof ApiError && add.error.status === 422) ? add.error.message : null}</FormError>
        <Field label="Parcelle" error={e.parcelId?.message}>
          <Select {...form.register("parcelId")}>
            {parcels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 font-display text-[13.5px] font-semibold">Jours</legend>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((x, i) => {
              const on = days.includes(i);
              return (
                <button
                  key={x}
                  type="button"
                  aria-pressed={on}
                  onClick={() => form.setValue("days", on ? days.filter((y) => y !== i) : [...days, i].sort(), { shouldValidate: true })}
                  className={cn("h-10 w-12 rounded-lg border font-display text-sm font-semibold", on ? "border-water bg-water text-white dark:text-[#06222a]" : "border-line-strong hover:bg-surface-2")}
                >
                  {x}
                </button>
              );
            })}
          </div>
          {e.days && <p className="mt-1.5 text-[13px] text-danger-ink">Choisissez au moins un jour</p>}
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Heure" hint="Tôt le matin ou en soirée : moins d’évaporation" error={e.time?.message}>
            <Input type="time" {...form.register("time")} />
          </Field>
          <Field label="Durée" error={e.durationMin?.message}>
            <Input type="number" inputMode="numeric" suffix="min" {...form.register("durationMin", { valueAsNumber: true })} />
          </Field>
        </div>
      </form>
    </Sheet>
  );
}
