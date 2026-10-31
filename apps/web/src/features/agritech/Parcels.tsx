import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Sprout } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { fmt, MOISTURE_LABEL, parcelSchema, type ParcelInput, type ParcelSnapshot } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { LIVE_MS } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView, EmptyState } from "@/components/ui/feedback";
import { DataTable, FilterChips, Meter } from "@/components/ui/data";
import { MoistureBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { Field, Input, Select, FormError } from "@/components/ui/form";
import { TimeSeriesChart, SERIES } from "@/components/charts/charts";
import { useQueries } from "@tanstack/react-query";

type F = "toutes" | "surveiller" | "indisponibles";

export default function Parcels() {
  const q = useQuery({ queryKey: ["parcels"], queryFn: api.parcels.list, refetchInterval: LIVE_MS });
  const [filter, setFilter] = useState<F>("toutes");
  const [open, setOpen] = useState(false);
  const canEdit = useCan("parcelles:modifier");
  const navigate = useNavigate();
  const list = q.data ?? [];
  const rows = list.filter((p) => (filter === "toutes" ? true : filter === "surveiller" ? p.state === "sec" || p.state === "humide" : p.state === "indisponible"));
  const columns = useMemo<Array<ColumnDef<ParcelSnapshot, unknown>>>(
    () => [
      {
        id: "parcelle",
        header: "Parcelle",
        accessorFn: (r) => r.parcel.code,
        cell: ({ row: { original: r } }) => (
          <div>
            <p className="font-display font-semibold">{r.parcel.name}</p>
            <p className="text-[13px] text-ink-3">
              {r.parcel.crop} {r.parcel.variety}
            </p>
          </div>
        ),
      },
      { id: "surface", header: "Surface", accessorFn: (r) => r.parcel.areaHa, cell: ({ row: { original: r } }) => <span className="tabular">{fmt.hectares(r.parcel.areaHa)}</span> },
      { id: "sol", header: "Sol", accessorFn: (r) => r.parcel.soil, cell: ({ row: { original: r } }) => <span className="capitalize">{r.parcel.soil}</span> },
      {
        id: "humidite",
        header: "Humidité du sol",
        accessorFn: (r) => r.moisture ?? -1,
        cell: ({ row: { original: r } }) => (
          <div className="min-w-[160px]">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="font-display font-semibold tabular">{r.moisture == null ? "Indisponible" : fmt.pct(r.moisture)}</span>
              <span className="text-[12px] text-ink-3">{MOISTURE_LABEL[r.state]}</span>
            </div>
            <Meter value={r.moisture} max={60} band={[r.parcel.moisture.dry, r.parcel.moisture.wet]} tone={r.state === "sec" ? "sun" : r.state === "humide" ? "water" : r.state === "indisponible" ? "offline" : "brand"} label={`Humidité ${r.parcel.name}`} />
          </div>
        ),
      },
      { id: "etat", header: "État", accessorFn: (r) => r.state, cell: ({ row: { original: r } }) => <MoistureBadge state={r.state} size="sm" /> },
      { id: "recolte", header: "Récolte prévue", accessorFn: (r) => r.parcel.harvestAt, cell: ({ row: { original: r } }) => fmt.monthYear(r.parcel.harvestAt) },
      { id: "capteurs", header: "Capteurs", enableSorting: false, accessorFn: (r) => r.parcel.sensorIds.join(", "), cell: ({ row: { original: r } }) => <span className="text-[13px] tabular text-ink-2">{r.parcel.sensorIds.join(", ") || "Aucun"}</span> },
    ],
    [],
  );
  const ha = list.reduce((a, p) => a + p.parcel.areaHa, 0);
  return (
    <>
      <PageHeader
        title="Parcelles"
        subtitle={list.length ? `${fmt.plural(list.length, "parcelle", "parcelles")} · ${fmt.hectares(ha)} · ${list.filter((p) => p.state === "sec" || p.state === "humide").length} à surveiller · ${list.filter((p) => p.state === "indisponible").length} sans mesure` : undefined}
        actions={
          canEdit && (
            <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
              Ajouter une parcelle
            </Button>
          )
        }
      />
      <QueryView q={q}>
        {() => (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterChips
                label="Filtrer les parcelles"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "toutes", label: "Toutes", count: list.length },
                  { value: "surveiller", label: "À surveiller", count: list.filter((p) => p.state === "sec" || p.state === "humide").length },
                  { value: "indisponibles", label: "Sans mesure", count: list.filter((p) => p.state === "indisponible").length },
                ]}
              />
            </div>
            <Card as="div" className="overflow-hidden">
              <DataTable
                caption="Liste des parcelles et humidité du sol"
                data={rows}
                columns={columns}
                getRowId={(r) => r.parcel.id}
                onRowClick={(r) => navigate(`/app/parcelles/${r.parcel.id}`)}
                empty={
                  <EmptyState icon={<Sprout className="size-6" aria-hidden />} title="Aucune parcelle dans ce filtre" className="m-5">
                    Changez de filtre pour voir les autres parcelles.
                  </EmptyState>
                }
              />
            </Card>
            <Compare parcels={list} />
          </div>
        )}
      </QueryView>
      <NewParcelSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Comparer jusqu'à 3 parcelles. La couleur suit la parcelle (attribuée à la sélection, jamais au rang). */
function Compare({ parcels }: { parcels: ParcelSnapshot[] }) {
  const [sel, setSel] = useState<Array<{ id: string; slot: number }>>(() =>
    parcels
      .filter((p) => p.moisture != null)
      .slice(0, 3)
      .map((p, i) => ({ id: p.parcel.id, slot: i })),
  );
  const toggle = (id: string) =>
    setSel((s) => {
      if (s.some((x) => x.id === id)) return s.filter((x) => x.id !== id);
      if (s.length >= 3) return s;
      const used = new Set(s.map((x) => x.slot));
      return [...s, { id, slot: [0, 1, 2].find((n) => !used.has(n))! }];
    });
  const chosen = sel.map((x) => ({ ...x, p: parcels.find((p) => p.parcel.id === x.id)! })).filter((x) => x.p);
  const qs = useQueries({
    queries: chosen.map((c) => ({
      queryKey: ["series", c.p.parcel.sensorIds[0], "soilMoisture", 30],
      queryFn: () => api.series(c.p.parcel.sensorIds[0]!, "soilMoisture", Date.now() - 30 * 86400000, Date.now()),
      enabled: !!c.p.parcel.sensorIds[0],
      staleTime: 60_000,
    })),
  });
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold">Comparer des parcelles</h2>
          <p className="text-sm text-ink-3">Humidité du sol sur 30 jours. Choisissez jusqu’à 3 parcelles.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Parcelles à comparer">
          {parcels.map((p) => {
            const c = sel.find((x) => x.id === p.parcel.id);
            return (
              <button
                key={p.parcel.id}
                onClick={() => toggle(p.parcel.id)}
                aria-pressed={!!c}
                disabled={!c && sel.length >= 3}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-3 font-display text-[13px] font-semibold transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg disabled:opacity-40"
              >
                {c && <span className="h-0.5 w-3.5 rounded-full" style={{ background: SERIES[c.slot] }} aria-hidden />}
                Parcelle {p.parcel.code}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4">
        {chosen.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-3">Sélectionnez une parcelle pour afficher sa courbe.</p>
        ) : (
          <TimeSeriesChart
            ariaLabel={`Humidité du sol sur 30 jours : ${chosen.map((c) => c.p.parcel.name).join(", ")}`}
            unit="%"
            height={300}
            band={chosen.length === 1 ? [chosen[0]!.p.parcel.moisture.dry, chosen[0]!.p.parcel.moisture.wet] : undefined}
            thresholds={chosen.length > 1 ? [{ y: 30, label: "seuil sec 30 %" }] : []}
            series={chosen.map((c, i) => ({ key: c.id, name: c.p.parcel.name, color: SERIES[c.slot], points: qs[i]?.data?.points ?? [] }))}
          />
        )}
      </div>
    </Card>
  );
}

export function NewParcelSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: api.members.list, enabled: open });
  const today = new Date().toISOString().slice(0, 10);
  const form = useForm<ParcelInput>({
    resolver: zodResolver(parcelSchema),
    defaultValues: { code: "G", name: "Parcelle G", crop: "", variety: "", areaHa: 0.5, soil: "sableux", plantedAt: today, harvestAt: new Date(Date.now() + 100 * 86400000).toISOString().slice(0, 10), responsibleId: "", moisture: { dry: 30, wet: 45 } },
  });
  const create = useMutation({
    mutationFn: api.parcels.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parcels"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success("Parcelle créée.", { description: "Associez-lui un capteur pour recevoir les mesures." });
      onOpenChange(false);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.details && typeof e.details === "object" && "fields" in e.details)
        for (const [k, v] of Object.entries((e.details as { fields: Record<string, string> }).fields)) form.setError(k as keyof ParcelInput, { message: v });
    },
  });
  const e = form.formState.errors;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter une parcelle"
      description="Elle apparaîtra sur la carte. Vous pourrez ensuite lui associer un capteur et une vanne."
      width="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="form-parcelle" loading={create.isPending}>
            Créer la parcelle
          </Button>
        </>
      }
    >
      <form id="form-parcelle" noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => create.mutate(v))}>
        <FormError>{create.isError && !(create.error instanceof ApiError && [409, 422].includes(create.error.status)) ? create.error.message : null}</FormError>
        <Field label="Code" hint="Une lettre ou un numéro court" error={e.code?.message} required>
          <Input maxLength={8} {...form.register("code")} />
        </Field>
        <Field label="Nom" error={e.name?.message} required>
          <Input {...form.register("name")} />
        </Field>
        <Field label="Culture" error={e.crop?.message} required>
          <Input placeholder="Oignon, tomate, gombo…" {...form.register("crop")} />
        </Field>
        <Field label="Variété" optional>
          <Input placeholder="Violet de Galmi" {...form.register("variety")} />
        </Field>
        <Field label="Surface" error={e.areaHa?.message} required>
          <Input type="number" step="0.1" min="0.1" inputMode="decimal" suffix="ha" {...form.register("areaHa", { valueAsNumber: true })} />
        </Field>
        <Field label="Type de sol">
          <Select {...form.register("soil")}>
            <option value="sableux">Sableux</option>
            <option value="sablo-argileux">Sablo-argileux</option>
            <option value="argileux">Argileux</option>
            <option value="limoneux">Limoneux</option>
          </Select>
        </Field>
        <Field label="Date de plantation" error={e.plantedAt?.message}>
          <Input type="date" {...form.register("plantedAt")} />
        </Field>
        <Field label="Récolte prévue" error={e.harvestAt?.message}>
          <Input type="date" {...form.register("harvestAt")} />
        </Field>
        <Field label="Seuil sec" hint="Sous ce niveau, le sol est trop sec" error={e.moisture?.dry?.message}>
          <Input type="number" inputMode="numeric" suffix="%" {...form.register("moisture.dry", { valueAsNumber: true })} />
        </Field>
        <Field label="Seuil humide" hint="Au-dessus, l’irrigation s’arrête" error={e.moisture?.wet?.message}>
          <Input type="number" inputMode="numeric" suffix="%" {...form.register("moisture.wet", { valueAsNumber: true })} />
        </Field>
        <Field label="Responsable" error={e.responsibleId?.message} className="sm:col-span-2" required>
          <Select {...form.register("responsibleId", { required: true })}>
            <option value="">Choisir un membre</option>
            {members.data?.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.firstName} {m.user.lastName}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Sheet>
  );
}
