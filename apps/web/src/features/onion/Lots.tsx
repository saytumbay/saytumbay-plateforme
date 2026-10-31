import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import type { z } from "zod";
import { fmt, lotSchema, type Lot } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView } from "@/components/ui/feedback";
import { DataTable, FilterChips, Meter } from "@/components/ui/data";
import { Badge, RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { Field, Input, Select, FormError } from "@/components/ui/form";

const STATUS = { en_stock: "En stock", a_vendre: "À vendre en priorité", vendu: "Vendu" } as const;

export default function Lots() {
  const lots = useQuery({ queryKey: ["lots"], queryFn: api.lots.list });
  const ws = useQuery({ queryKey: ["warehouses"], queryFn: api.warehouses.list });
  const can = useCan("stock:controler");
  const qc = useQueryClient();
  const [f, setF] = useState<"stock" | "vendre" | "vendus" | "tous">("stock");
  const [open, setOpen] = useState(false);
  const status = useMutation({
    mutationFn: (v: { id: string; status: Lot["status"] }) => api.lots.status(v.id, v.status),
    onSuccess: (l) => {
      qc.invalidateQueries({ queryKey: ["lots"] });
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success(`Lot ${l.id} : ${STATUS[l.status].toLowerCase()}.`);
    },
  });
  const wsMap = new Map((ws.data ?? []).map((w) => [w.warehouse.id, w]));
  const columns = useMemo<Array<ColumnDef<Lot, unknown>>>(
    () => [
      {
        id: "lot",
        header: "Lot",
        accessorKey: "id",
        cell: ({ row: { original: l } }) => (
          <div>
            <p className="font-display font-semibold">Lot {l.id}</p>
            <p className="text-[13px] text-ink-3">{l.origin || "Origine non renseignée"}</p>
          </div>
        ),
      },
      { id: "mag", header: "Magasin", accessorFn: (l) => wsMap.get(l.warehouseId)?.warehouse.name ?? "", cell: ({ getValue }) => String(getValue()) },
      { id: "qte", header: "Quantité", accessorKey: "quantityT", cell: ({ row: { original: l } }) => <span className="tabular">{fmt.tonnes(l.quantityT)}</span> },
      { id: "var", header: "Variété", accessorKey: "variety" },
      {
        id: "duree",
        header: "En stock",
        accessorFn: (l) => (Date.now() - new Date(l.enteredAt).getTime()) / 86400000 / l.maxDays,
        cell: ({ row: { original: l } }) => {
          const days = Math.round((Date.now() - new Date(l.enteredAt).getTime()) / 86400000);
          return (
            <div className="flex min-w-[140px] items-center gap-2">
              <Meter value={days} max={l.maxDays} tone={days / l.maxDays > 0.8 ? "danger" : "brand"} label={`Durée du lot ${l.id}`} className="w-20" />
              <span className="text-[13px] tabular text-ink-2">
                {days} / {l.maxDays} j
              </span>
            </div>
          );
        },
      },
      {
        id: "etat",
        header: "Conservation",
        enableSorting: false,
        cell: ({ row: { original: l } }) => {
          const w = wsMap.get(l.warehouseId);
          const z = w?.zones.filter((x) => l.zoneIds.includes(x.zoneId)).sort((a, b) => b.riskScore - a.riskScore)[0];
          return z ? <RiskBadge risk={z.risk} size="sm" /> : <span className="text-ink-3">—</span>;
        },
      },
      {
        id: "statut",
        header: "Statut",
        accessorKey: "status",
        cell: ({ row: { original: l } }) =>
          can ? (
            <select aria-label={`Statut du lot ${l.id}`} value={l.status} onClick={(e) => e.stopPropagation()} onChange={(e) => status.mutate({ id: l.id, status: e.target.value as Lot["status"] })} className="h-9 rounded-md border border-line-strong bg-surface px-2 text-[13px]">
              {Object.entries(STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <Badge>{STATUS[l.status]}</Badge>
          ),
      },
    ],
    [can, ws.data], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const all = lots.data ?? [];
  const rows = all.filter((l) => (f === "tous" ? true : f === "stock" ? l.status !== "vendu" : f === "vendre" ? l.status === "a_vendre" : l.status === "vendu"));
  return (
    <>
      <PageHeader
        title="Lots"
        subtitle="Chaque entrée en magasin est un lot : on sait où il est rangé, depuis quand, et dans quel état."
        actions={
          can && (
            <Button variant="onion" icon={<Plus className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
              Enregistrer un lot
            </Button>
          )
        }
      />
      <div className="mb-4">
        <FilterChips
          label="Filtrer les lots"
          value={f}
          onChange={setF}
          options={[
            { value: "stock", label: "En magasin", count: all.filter((l) => l.status !== "vendu").length },
            { value: "vendre", label: "À vendre en priorité", count: all.filter((l) => l.status === "a_vendre").length },
            { value: "vendus", label: "Vendus", count: all.filter((l) => l.status === "vendu").length },
            { value: "tous", label: "Tous", count: all.length },
          ]}
        />
      </div>
      <QueryView q={lots}>
        {() => (
          <Card as="div" className="overflow-hidden">
            <DataTable caption="Lots en stock" data={rows} columns={columns} getRowId={(l) => l.id} />
          </Card>
        )}
      </QueryView>
      <LotSheet open={open} onOpenChange={setOpen} warehouses={(ws.data ?? []).map((w) => ({ id: w.warehouse.id, name: w.warehouse.name, zones: w.warehouse.zones }))} />
    </>
  );
}

function LotSheet({ open, onOpenChange, warehouses }: { open: boolean; onOpenChange: (v: boolean) => void; warehouses: Array<{ id: string; name: string; zones: Array<{ id: string; label: string }> }> }) {
  const qc = useQueryClient();
  const form = useForm<z.input<typeof lotSchema>>({ resolver: zodResolver(lotSchema), defaultValues: { warehouseId: warehouses[0]?.id ?? "", variety: "Violet de Galmi", quantityT: 5, zoneIds: [], enteredAt: new Date().toISOString().slice(0, 10), maxDays: 150, origin: "" } });
  const wid = form.watch("warehouseId");
  const zones = form.watch("zoneIds") ?? [];
  const create = useMutation({
    mutationFn: (v: z.input<typeof lotSchema>) => api.lots.create(lotSchema.parse(v)),
    onSuccess: (l) => {
      qc.invalidateQueries({ queryKey: ["lots"] });
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      toast.success(`Lot ${l.id} enregistré.`);
      onOpenChange(false);
    },
  });
  const e = form.formState.errors;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Enregistrer un lot"
      description="À l’entrée en magasin : quantité, rangées occupées, durée de conservation visée."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="form-lot" variant="onion" loading={create.isPending}>
            Enregistrer le lot
          </Button>
        </>
      }
    >
      <form id="form-lot" noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
        <FormError>{create.isError && !(create.error instanceof ApiError && create.error.status === 422) ? create.error.message : null}</FormError>
        <Field label="Magasin">
          <Select {...form.register("warehouseId")} onChange={(ev) => (form.setValue("warehouseId", ev.target.value), form.setValue("zoneIds", []))}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 font-display text-[13.5px] font-semibold">Rangées occupées</legend>
          <div className="flex flex-wrap gap-1.5">
            {warehouses
              .find((w) => w.id === wid)
              ?.zones.map((z) => {
                const on = zones.includes(z.id);
                return (
                  <button key={z.id} type="button" aria-pressed={on} onClick={() => form.setValue("zoneIds", on ? zones.filter((x) => x !== z.id) : [...zones, z.id], { shouldValidate: true })} className="h-9 rounded-full border border-line-strong px-3 text-[13px] font-semibold aria-pressed:border-onion aria-pressed:bg-onion aria-pressed:text-white">
                    {z.label}
                  </button>
                );
              })}
          </div>
          {e.zoneIds && <p className="mt-1.5 text-[13px] text-danger-ink">Choisissez au moins une rangée</p>}
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Variété" error={e.variety?.message}>
            <Input {...form.register("variety")} />
          </Field>
          <Field label="Quantité" error={e.quantityT?.message}>
            <Input type="number" step="0.5" inputMode="decimal" suffix="t" {...form.register("quantityT", { valueAsNumber: true })} />
          </Field>
          <Field label="Date d’entrée" error={e.enteredAt?.message}>
            <Input type="date" {...form.register("enteredAt")} />
          </Field>
          <Field label="Conservation visée" hint="Oignon de Galmi : 4 à 5 mois" error={e.maxDays?.message}>
            <Input type="number" inputMode="numeric" suffix="j" {...form.register("maxDays", { valueAsNumber: true })} />
          </Field>
        </div>
        <Field label="Origine" optional>
          <Input placeholder="Producteurs, parcelle, GIE…" {...form.register("origin")} />
        </Field>
      </form>
    </Sheet>
  );
}
