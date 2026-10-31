import { useState } from "react";
import { useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ClipboardCheck, ListPlus, SlidersHorizontal, AlertTriangle } from "lucide-react";
import type { z } from "zod";
import { fmt, inspectionSchema, RISK_LABEL, type StorageRisk, type WarehouseDetail as WD, type WarehouseSnapshot, type ZoneSnapshot, type Metric } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { LIVE_MS, useSeries } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView, Callout, Skeleton } from "@/components/ui/feedback";
import { Meter } from "@/components/ui/data";
import { RiskBadge, DeviceBadge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { Field, Input, Select, Textarea, FormError } from "@/components/ui/form";
import { TimeSeriesChart } from "@/components/charts/charts";
import { NewTaskSheet } from "@/features/shared/TasksPage";
import { useAlertAction } from "@/features/shared/ActionList";
import { PRODUCT_LABEL, STORAGE_LABEL, zoneLabel } from "./shared";

const FILL: Record<StorageRisk, string> = { bon: "var(--brand)", surveiller: "var(--sun)", risque: "var(--danger)", pourriture: "var(--danger)" };

export default function WarehouseDetail() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["warehouse", id], queryFn: () => api.warehouses.get(id), refetchInterval: LIVE_MS });
  const [zone, setZone] = useState<string | null>(null);
  const [check, setCheck] = useState(false);
  const [task, setTask] = useState(false);
  const canCheck = useCan("stock:controler");
  const canTask = useCan("taches:gerer");
  const act = useAlertAction();
  return (
    <QueryView q={q}>
      {(d) => {
        const w = d.snapshot;
        const sel = w.zones.find((z) => z.zoneId === zone) ?? [...w.zones].sort((a, b) => b.riskScore - a.riskScore)[0]!;
        const alert = d.alerts.find((a) => a.status !== "resolue");
        return (
          <>
            <PageHeader
              crumbs={[{ label: "Entrepôts", to: "/app/onion/entrepots" }, { label: w.warehouse.name }]}
              title={w.warehouse.name}
              subtitle={`${PRODUCT_LABEL[w.warehouse.product]} ${w.warehouse.variety} · ${fmt.tonnes(w.stockT)} sur ${w.warehouse.capacityT} t · ${STORAGE_LABEL[w.warehouse.storageType]}`}
              meta={<RiskBadge risk={w.risk} />}
              actions={
                <>
                  <ButtonLink to="/app/onion/seuils" variant="ghost" icon={<SlidersHorizontal className="size-4" aria-hidden />}>
                    Seuils
                  </ButtonLink>
                  {canTask && (
                    <Button variant="secondary" icon={<ListPlus className="size-4" aria-hidden />} onClick={() => setTask(true)}>
                      Créer une tâche
                    </Button>
                  )}
                  {canCheck && (
                    <Button variant="onion" icon={<ClipboardCheck className="size-4" aria-hidden />} onClick={() => setCheck(true)}>
                      Nouveau contrôle
                    </Button>
                  )}
                </>
              }
            />
            {w.risk !== "bon" && (
              <Callout
                className="mb-6"
                tone={w.risk === "surveiller" ? "warn" : "danger"}
                icon={<AlertTriangle className="size-5" aria-hidden />}
                title={w.risk === "pourriture" ? "Pourriture probable : agir aujourd’hui" : w.risk === "risque" ? "Risque de pourriture : agir aujourd’hui" : "À surveiller dans les prochains jours"}
                action={
                  alert && alert.status === "ouverte" ? (
                    <Button size="sm" variant="secondary" loading={act.isPending} onClick={() => act.mutate({ id: alert.id, action: "prendre_en_charge" })}>
                      Je m’en occupe
                    </Button>
                  ) : undefined
                }
              >
                <ul className="mt-1 list-disc pl-5">
                  {w.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {alert && <p className="mt-2 font-semibold">{alert.advice}</p>}
              </Callout>
            )}
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <Card>
                <CardHeader title="Le tas, rangée par rangée" subtitle="Chaque rangée a une sonde plantée au cœur. Touchez une rangée pour voir ses mesures." />
                <CardBody>
                  <PileView w={w} selected={sel.zoneId} onSelect={setZone} />
                </CardBody>
              </Card>
              <ZonePanel w={w} z={sel} />
            </div>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <LotsCard d={d} />
              <InspectionsCard d={d} onNew={() => setCheck(true)} />
            </div>
            <Card className="mt-6">
              <CardHeader title="Sondes de ce magasin" />
              <CardBody className="pt-2">
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {d.devices.map((dv) => (
                    <li key={dv.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-semibold tabular">{dv.id}</p>
                        <p className="truncate text-[12.5px] text-ink-3">
                          {dv.label.split(" · ")[1] ?? "ambiance"} · batterie {dv.battery} %
                        </p>
                      </div>
                      <DeviceBadge status={dv.status} size="sm" />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <InspectionSheet open={check} onOpenChange={setCheck} d={d} zone={sel.zoneId} />
            <NewTaskSheet open={task} onOpenChange={setTask} module="onion" link={{ type: "entrepot", id: w.warehouse.id }} />
          </>
        );
      }}
    </QueryView>
  );
}

/** Coupe schématique du magasin : les sacs de chaque rangée, la sonde au cœur, l'état par couleur et par texte. */
function PileView({ w, selected, onSelect }: { w: WarehouseSnapshot; selected: string; onSelect: (z: string) => void }) {
  const n = w.zones.length;
  const W = 640;
  const colW = (W - 80) / n;
  return (
    <div>
      <svg viewBox={`0 0 ${W} 300`} className="w-full" role="group" aria-label={`Coupe du ${w.warehouse.name}`}>
        <path d={`M24,96 L${W / 2},26 L${W - 24},96`} fill="none" stroke="var(--line-strong)" strokeWidth={3} strokeLinejoin="round" />
        <line x1={24} y1={262} x2={W - 24} y2={262} stroke="var(--line-strong)" strokeWidth={3} />
        <line x1={34} y1={96} x2={34} y2={262} stroke="var(--line)" strokeWidth={2} />
        <line x1={W - 34} y1={96} x2={W - 34} y2={262} stroke="var(--line)" strokeWidth={2} />
        {w.zones.map((z, i) => {
          const x0 = 40 + i * colW;
          const on = z.zoneId === selected;
          const col = FILL[z.risk];
          const rows = 5;
          const sackW = colW / 3 - 6;
          const label = zoneLabel(w, z);
          return (
            <g
              key={z.zoneId}
              role="button"
              tabIndex={0}
              aria-pressed={on}
              aria-label={`${label} : ${RISK_LABEL[z.risk]}, ${z.temp ?? "—"} °C, humidité ${z.humidity ?? "—"} %`}
              onClick={() => onSelect(z.zoneId)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onSelect(z.zoneId))}
              className="cursor-pointer outline-none [&:focus-visible>rect.focus]:opacity-100"
            >
              <rect className="focus" x={x0 + 2} y={104} width={colW - 4} height={154} rx={10} fill="none" stroke="var(--focus)" strokeWidth={3} opacity={on ? 1 : 0} />
              {Array.from({ length: rows }, (_, r) =>
                Array.from({ length: 3 }, (_, c) => {
                  const cx = x0 + 6 + c * (sackW + 6) + (r % 2 ? sackW / 2 - 1 : 0);
                  if (r % 2 && c === 2) return null;
                  const cy = 240 - r * 27;
                  const core = r === 2 && c === 1;
                  return <rect key={`${r}-${c}`} x={cx} y={cy} width={sackW} height={22} rx={8} fill={col} opacity={core ? 0.95 : 0.35 + (r === 2 ? 0.25 : 0.1)} />;
                }),
              )}
              {/* sonde au cœur */}
              <line x1={x0 + colW / 2} y1={118} x2={x0 + colW / 2} y2={192} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
              <circle cx={x0 + colW / 2} cy={116} r={7} fill="var(--surface)" stroke="var(--ink)" strokeWidth={3} />
              <text x={x0 + colW / 2} y={284} textAnchor="middle" className="font-display" style={{ fontSize: 15, fontWeight: 600, fill: "var(--ink)" }}>
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
        {w.zones.map((z) => (
          <button key={z.zoneId} onClick={() => onSelect(z.zoneId)} className={cn("rounded-lg border px-2 py-2 text-center", z.zoneId === selected ? "border-ink" : "border-line")} aria-pressed={z.zoneId === selected}>
            <span className="block font-display text-[15px] font-semibold tabular">{fmt.temp(z.temp)}</span>
            <span className="block text-[12px] tabular text-ink-3">{fmt.pct(z.humidity)}</span>
            <span className="mt-1 block text-[11.5px] font-semibold" style={{ color: z.risk === "bon" ? "var(--brand)" : z.risk === "surveiller" ? "var(--sun-ink)" : "var(--danger-ink)" }}>
              {RISK_LABEL[z.risk]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ZonePanel({ w, z }: { w: WarehouseSnapshot; z: ZoneSnapshot }) {
  const metrics: Array<{ m: Metric; label: string; unit: string; band?: [number, number]; th?: number }> = [
    { m: "airTemp", label: "Température", unit: "°C", band: w.warehouse.thresholds.temp },
    { m: "airHumidity", label: "Humidité de l’air", unit: "%", band: w.warehouse.thresholds.humidity },
    { m: "co2", label: "CO₂", unit: "ppm", th: w.warehouse.thresholds.co2 },
    { m: "gas", label: "Gaz de pourriture", unit: "/100", th: w.warehouse.thresholds.gas },
  ];
  const [m, setM] = useState(0);
  const cur = metrics[m]!;
  const s = useSeries(z.deviceId, cur.m, 7);
  return (
    <Card>
      <CardHeader title={zoneLabel(w, z)} subtitle={z.deviceId ? `Sonde ${z.deviceId} · score de risque ${z.riskScore} / 100` : "Pas de sonde"} actions={<RiskBadge risk={z.risk} size="sm" />} />
      <CardBody>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {metrics.map((x, i) => {
            const v = x.m === "airTemp" ? z.temp : x.m === "airHumidity" ? z.humidity : x.m === "co2" ? z.co2 : z.gas;
            const bad = v != null && (x.band ? v > x.band[1] || v < x.band[0] : x.th != null && v > x.th);
            return (
              <button key={x.m} onClick={() => setM(i)} aria-pressed={i === m} className={cn("rounded-lg border px-3 py-2 text-left", i === m ? "border-ink" : "border-line", bad && "bg-danger-soft")}>
                <span className="block text-[12px] text-ink-3">{x.label}</span>
                <span className={cn("font-display text-lg font-semibold tabular", bad && "text-danger-ink")}>
                  {v == null ? "—" : `${fmt.num(v, x.m === "airTemp" ? 1 : 0)} ${x.unit}`}
                </span>
              </button>
            );
          })}
        </div>
        {s.data ? (
          <TimeSeriesChart ariaLabel={`${cur.label} sur 7 jours, ${zoneLabel(w, z)}`} unit={cur.unit === "/100" ? "" : cur.unit} height={220} band={cur.band} thresholds={cur.th != null ? [{ y: cur.th, label: `alerte ${fmt.num(cur.th)}` }] : []} series={[{ key: "v", name: cur.label, color: "var(--series-2)", points: s.data.points }]} area digits={cur.m === "airTemp" ? 1 : 0} />
        ) : (
          <Skeleton className="h-[220px]" />
        )}
      </CardBody>
    </Card>
  );
}

function LotsCard({ d }: { d: WD }) {
  return (
    <Card>
      <CardHeader
        title="Lots dans ce magasin"
        actions={
          <ButtonLink to="/app/onion/lots" variant="ghost" size="sm">
            Tous les lots
          </ButtonLink>
        }
      />
      <CardBody className="pt-2">
        <ul className="divide-y divide-line">
          {d.lots.map((l) => {
            const days = Math.round((Date.now() - new Date(l.enteredAt).getTime()) / 86400000);
            const ratio = days / l.maxDays;
            const zr = d.snapshot.zones.filter((z) => l.zoneIds.includes(z.zoneId)).sort((a, b) => b.riskScore - a.riskScore)[0];
            return (
              <li key={l.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-display font-semibold">
                    Lot {l.id} <span className="font-sans font-normal text-ink-3">· {fmt.tonnes(l.quantityT)} · {l.zoneIds.map((z) => d.snapshot.warehouse.zones.find((x) => x.id === z)?.label ?? z).join(", ")}</span>
                  </p>
                  {zr && <RiskBadge risk={zr.risk} size="sm" />}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <Meter value={days} max={l.maxDays} tone={ratio > 0.8 ? "danger" : "brand"} label={`Durée en stock du lot ${l.id}`} />
                  <span className="shrink-0 text-[12.5px] tabular text-ink-3">
                    {days} j / {l.maxDays} j
                  </span>
                </div>
                {zr && (zr.risk === "risque" || zr.risk === "pourriture") && <p className="mt-1.5 text-[13px] font-semibold text-danger-ink">Trier et vendre en priorité</p>}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

function InspectionsCard({ d, onNew }: { d: WD; onNew: () => void }) {
  const can = useCan("stock:controler");
  return (
    <Card>
      <CardHeader title="Contrôles visuels" subtitle="Ouvrir quelques sacs et compter les bulbes abîmés confirme ce que disent les sondes." actions={can && <Button size="sm" variant="secondary" onClick={onNew}>Saisir un contrôle</Button>} />
      <CardBody className="pt-2">
        <ul className="divide-y divide-line">
          {d.inspections.map((i) => {
            const rate = i.damaged / i.sampled;
            return (
              <li key={i.id} className="flex items-start gap-3 py-3">
                <span className={cn("mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg font-display text-[13px] font-bold tabular", rate >= 0.2 ? "bg-danger-soft text-danger-ink" : rate > 0 ? "bg-sun-soft text-sun-ink" : "bg-brand-soft text-brand-strong dark:text-brand")}>{Math.round(rate * 100)}%</span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold">
                    {d.snapshot.warehouse.zones.find((z) => z.id === i.zoneId)?.label ?? i.zoneId} · {i.damaged} abîmés sur {i.sampled}
                  </p>
                  <p className="text-[13px] text-ink-3">
                    {i.byName} · {fmt.ago(i.at)}
                    {i.note ? ` · ${i.note}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
          {!d.inspections.length && <li className="py-3 text-sm text-ink-3">Aucun contrôle saisi.</li>}
        </ul>
      </CardBody>
    </Card>
  );
}

function InspectionSheet({ open, onOpenChange, d, zone }: { open: boolean; onOpenChange: (v: boolean) => void; d: WD; zone: string }) {
  const qc = useQueryClient();
  const form = useForm<z.input<typeof inspectionSchema>>({ resolver: zodResolver(inspectionSchema), values: { warehouseId: d.snapshot.warehouse.id, zoneId: zone, lotId: d.lots.find((l) => l.zoneIds.includes(zone))?.id ?? null, sampled: 20, damaged: 0, note: "" } });
  const save = useMutation({
    mutationFn: (v: z.input<typeof inspectionSchema>) => api.inspections.create(inspectionSchema.parse(v)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouse"] });
      toast.success("Contrôle enregistré.");
      onOpenChange(false);
    },
  });
  const e = form.formState.errors;
  const sampled = Number(form.watch("sampled")) || 0;
  const damaged = Number(form.watch("damaged")) || 0;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Nouveau contrôle visuel"
      description="Ouvrez quelques sacs dans la rangée et comptez les produits abîmés (mous, moisis, germés)."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="form-controle" variant="onion" loading={save.isPending}>
            Enregistrer le contrôle
          </Button>
        </>
      }
    >
      <form id="form-controle" noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
        <FormError>{save.isError && !(save.error instanceof ApiError && save.error.status === 422) ? save.error.message : null}</FormError>
        <Field label="Rangée">
          <Select {...form.register("zoneId")}>
            {d.snapshot.warehouse.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Produits contrôlés" error={e.sampled?.message}>
            <Input type="number" inputMode="numeric" {...form.register("sampled", { valueAsNumber: true })} />
          </Field>
          <Field label="Dont abîmés" error={e.damaged?.message}>
            <Input type="number" inputMode="numeric" {...form.register("damaged", { valueAsNumber: true })} />
          </Field>
        </div>
        {sampled > 0 && damaged / sampled >= 0.2 && <Callout tone="danger">Plus d’un produit sur cinq est abîmé : sortez et triez les sacs de cette rangée en priorité.</Callout>}
        <Field label="Remarque" optional>
          <Textarea rows={3} placeholder="Odeur, bulbes mous, germination…" {...form.register("note")} />
        </Field>
      </form>
    </Sheet>
  );
}
