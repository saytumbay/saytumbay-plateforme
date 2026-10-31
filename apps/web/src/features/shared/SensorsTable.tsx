import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, RadioTower, Repeat2, QrCode } from "lucide-react";
import { z } from "zod";
import { deviceRegisterSchema, fmt, type DeviceKind, type DeviceRow } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { LIVE_MS } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView, EmptyState, Callout } from "@/components/ui/feedback";
import { FilterChips, Meter } from "@/components/ui/data";
import { DataTable } from "@/components/ui/table";
import { DeviceBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { Field, Input, Select, FormError } from "@/components/ui/form";

type F = "tous" | "traiter" | "hors_ligne" | "en_ligne";

function SignalBars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-end gap-0.5" aria-label={`Signal ${n} sur 4`} role="img">
      {[1, 2, 3, 4].map((k) => (
        <span key={k} className={cn("w-1 rounded-sm", k <= n ? "bg-ink" : "bg-line-strong")} style={{ height: 3 + k * 3 }} />
      ))}
    </span>
  );
}

export function SensorsPage({ kinds, title, subtitle, detailBase, addLabel }: { kinds: DeviceKind[]; title: string; subtitle: string; detailBase: string; addLabel: string }) {
  const q = useQuery({ queryKey: ["devices"], queryFn: api.devices.list, refetchInterval: LIVE_MS });
  const [filter, setFilter] = useState<F>("tous");
  const [add, setAdd] = useState(false);
  const [replace, setReplace] = useState<DeviceRow | null>(null);
  const canManage = useCan("capteurs:gerer");
  const navigate = useNavigate();
  const all = (q.data ?? []).filter((d) => kinds.includes(d.kind));
  const todo = (d: DeviceRow) => d.status === "hors_ligne" || d.status === "batterie_faible";
  const rows = all.filter((d) => (filter === "tous" ? true : filter === "traiter" ? todo(d) : filter === "hors_ligne" ? d.status === "hors_ligne" : d.status === "en_ligne"));
  const columns = useMemo<Array<ColumnDef<DeviceRow, unknown>>>(
    () => [
      {
        id: "id",
        header: "Capteur",
        accessorKey: "id",
        cell: ({ row: { original: d } }) => (
          <div>
            <p className="font-display font-semibold tabular">{d.id}</p>
            <p className="text-[13px] text-ink-3">{d.label}</p>
          </div>
        ),
      },
      {
        id: "mesure",
        header: "Dernière valeur",
        accessorFn: (d) => d.lastValue?.value ?? -1,
        cell: ({ row: { original: d } }) =>
          d.lastValue ? (
            <span className={cn("font-display font-semibold tabular", d.lastValue.value == null && "text-ink-3")}>{d.lastValue.value == null ? "Indisponible" : `${fmt.num(d.lastValue.value, d.lastValue.metric === "airTemp" ? 1 : 0)} ${d.lastValue.unit}`}</span>
          ) : (
            <span className="text-ink-3">—</span>
          ),
      },
      {
        id: "batterie",
        header: "Batterie",
        accessorFn: (d) => d.battery ?? 101,
        cell: ({ row: { original: d } }) =>
          d.battery == null ? (
            <span className="text-[13px] text-ink-3">Secteur</span>
          ) : (
            <div className="flex min-w-[110px] items-center gap-2">
              <Meter value={d.battery} tone={d.battery < 20 ? "danger" : "brand"} label={`Batterie ${d.id}`} className="w-16" />
              <span className={cn("text-[13px] tabular", d.battery < 20 && "font-semibold text-danger-ink")}>{d.battery}&nbsp;%</span>
            </div>
          ),
      },
      { id: "signal", header: "Signal", accessorKey: "signal", cell: ({ row: { original: d } }) => (d.status === "hors_ligne" ? <span className="text-[13px] text-ink-3">Aucun</span> : <SignalBars n={d.signal} />) },
      { id: "vu", header: "Vu", accessorFn: (d) => d.lastSeenAt ?? "", cell: ({ row: { original: d } }) => <span className="text-[13px] text-ink-2">{d.lastSeenAt ? fmt.ago(d.lastSeenAt) : "jamais"}</span> },
      { id: "fw", header: "Version", accessorKey: "firmware", cell: ({ row: { original: d } }) => <span className="text-[13px] tabular text-ink-2">{d.firmware}</span> },
      { id: "etat", header: "État", accessorKey: "status", cell: ({ row: { original: d } }) => <DeviceBadge status={d.status} size="sm" /> },
      {
        id: "action",
        header: "",
        enableSorting: false,
        cell: ({ row: { original: d } }) =>
          canManage && todo(d) && d.kind !== "passerelle" ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<Repeat2 className="size-4" aria-hidden />}
              onClick={(e) => {
                e.stopPropagation();
                setReplace(d);
              }}
            >
              Remplacer
            </Button>
          ) : null,
      },
    ],
    [canManage],
  );
  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          canManage && (
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setAdd(true)}>
              {addLabel}
            </Button>
          )
        }
      />
      <QueryView q={q}>
        {() => (
          <div className="flex flex-col gap-4">
            <FilterChips
              label="Filtrer les capteurs"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "tous", label: "Tous", count: all.length },
                { value: "traiter", label: "À traiter", count: all.filter(todo).length },
                { value: "hors_ligne", label: "Hors ligne", count: all.filter((d) => d.status === "hors_ligne").length },
                { value: "en_ligne", label: "En ligne", count: all.filter((d) => d.status === "en_ligne").length },
              ]}
            />
            <Card as="div" className="overflow-hidden">
              <DataTable
                caption={title}
                data={rows}
                columns={columns}
                getRowId={(d) => d.id}
                onRowClick={(d) => navigate(`${detailBase}/${d.id}`)}
                empty={
                  <EmptyState icon={<RadioTower className="size-6" aria-hidden />} title="Aucun capteur dans ce filtre" className="m-5">
                    {filter === "traiter" ? "Tous les capteurs transmettent et leurs batteries tiennent." : "Changez de filtre pour voir les autres capteurs."}
                  </EmptyState>
                }
              />
            </Card>
            {all.some((d) => d.simulated) && <p className="text-[13px] text-ink-3">Valeurs simulées pour la démonstration : aucun capteur physique n’est relié à cet espace.</p>}
          </div>
        )}
      </QueryView>
      <AddSensorSheet open={add} onOpenChange={setAdd} kinds={kinds} />
      <ReplaceSheet device={replace} onOpenChange={(v) => !v && setReplace(null)} />
    </>
  );
}

function AddSensorSheet({ open, onOpenChange, kinds }: { open: boolean; onOpenChange: (v: boolean) => void; kinds: DeviceKind[] }) {
  const qc = useQueryClient();
  const onion = kinds.includes("stockage");
  const parcels = useQuery({ queryKey: ["parcels"], queryFn: api.parcels.list, enabled: open && !onion });
  const whs = useQuery({ queryKey: ["warehouses"], queryFn: api.warehouses.list, enabled: open && onion });
  const form = useForm<z.input<typeof deviceRegisterSchema>>({ resolver: zodResolver(deviceRegisterSchema), defaultValues: { id: onion ? "OS-105" : "AS-0012", parcelId: "", warehouseId: "", zoneId: "", devEui: "" } });
  const wid = form.watch("warehouseId");
  const reg = useMutation({
    mutationFn: (v: z.input<typeof deviceRegisterSchema>) => api.devices.register({ id: v.id, parcelId: v.parcelId || undefined, warehouseId: v.warehouseId || undefined, zoneId: v.zoneId || undefined, devEui: v.devEui || undefined }),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["devices"] });
      toast.success(`${d.id} ajouté.`, { description: "Il apparaîtra en ligne à sa première mesure (10 minutes au plus)." });
      onOpenChange(false);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.details && typeof e.details === "object" && "fields" in e.details) for (const [k, v] of Object.entries((e.details as { fields: Record<string, string> }).fields)) form.setError(k as "id", { message: v });
    },
  });
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={onion ? "Ajouter une sonde" : "Ajouter un capteur"}
      description="Enregistrez le boîtier avant de le poser : ses mesures apparaîtront dès la première remontée."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="form-capteur" loading={reg.isPending}>
            Ajouter
          </Button>
        </>
      }
    >
      <form id="form-capteur" noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => reg.mutate(v))}>
        <FormError>{reg.isError && !(reg.error instanceof ApiError && [409, 422].includes(reg.error.status)) ? reg.error.message : null}</FormError>
        <Callout tone="info" icon={<QrCode className="size-4" aria-hidden />}>
          L’identifiant SaytuMbay et le DevEUI sont imprimés sur l’étiquette du boîtier.
        </Callout>
        <Field label="Identifiant" hint={onion ? "Format OS-105" : "Format AS-0012"} error={form.formState.errors.id?.message} required>
          <Input autoCapitalize="characters" autoComplete="off" spellCheck={false} {...form.register("id")} />
        </Field>
        <Field label="DevEUI" optional hint="Nécessaire pour recevoir les mesures via ChirpStack" error={form.formState.errors.devEui?.message}>
          <Input autoComplete="off" spellCheck={false} inputMode="text" placeholder="a84041000181a2b3" {...form.register("devEui")} />
        </Field>
        {onion ? (
          <>
            <Field label="Entrepôt">
              <Select {...form.register("warehouseId")}>
                <option value="">Choisir</option>
                {whs.data?.map((w) => (
                  <option key={w.warehouse.id} value={w.warehouse.id}>
                    {w.warehouse.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Emplacement" hint="Au cœur du tas de la rangée choisie, ou en ambiance">
              <Select {...form.register("zoneId")}>
                <option value="">Ambiance du magasin</option>
                {whs.data
                  ?.find((w) => w.warehouse.id === wid)
                  ?.warehouse.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.label}
                    </option>
                  ))}
              </Select>
            </Field>
          </>
        ) : (
          <Field label="Parcelle">
            <Select {...form.register("parcelId")}>
              <option value="">Choisir</option>
              {parcels.data?.map((p) => (
                <option key={p.parcel.id} value={p.parcel.id}>
                  {p.parcel.name} · {p.parcel.crop}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </form>
    </Sheet>
  );
}

function ReplaceSheet({ device, onOpenChange }: { device: DeviceRow | null; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [id, setId] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const rep = useMutation({
    mutationFn: () => api.devices.replace(device!.id, id.trim().toUpperCase()),
    onSuccess: (d) => {
      for (const k of ["devices", "overview", "parcels", "alerts", "warehouses"]) qc.invalidateQueries({ queryKey: [k] });
      toast.success(`${device!.id} remplacé par ${d.id}.`, { description: "L’historique, les seuils et l’emplacement sont conservés." });
      setId("");
      onOpenChange(false);
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Remplacement impossible."),
  });
  return (
    <Sheet
      open={!!device}
      onOpenChange={onOpenChange}
      title={`Remplacer ${device?.id ?? ""}`}
      description="Le nouveau capteur reprend l’emplacement, les seuils et l’historique de l’ancien."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button loading={rep.isPending} disabled={!id.trim()} onClick={() => (setErr(undefined), rep.mutate())}>
            Remplacer
          </Button>
        </>
      }
    >
      <Field label="Identifiant du nouveau capteur" hint={device?.id.startsWith("OS") ? "Format OS-105" : "Format AS-0012"} error={err}>
        <Input value={id} onChange={(e) => setId(e.target.value)} autoCapitalize="characters" spellCheck={false} />
      </Field>
    </Sheet>
  );
}
