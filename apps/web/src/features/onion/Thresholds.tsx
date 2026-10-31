import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import type { StorageThresholds, WarehouseSnapshot } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView, Callout } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { PRODUCT_LABEL, STORAGE_LABEL } from "./shared";

/** Valeurs de départ issues de la littérature, à recalibrer avec les mesures et les contrôles terrain. */
const PRESETS: Record<string, StorageThresholds> = {
  oignon: { temp: [24, 30], humidity: [65, 72], co2: 1200, gas: 40 },
  pomme_de_terre: { temp: [8, 14], humidity: [85, 95], co2: 2000, gas: 40 },
};

export default function Thresholds() {
  const q = useQuery({ queryKey: ["warehouses"], queryFn: api.warehouses.list });
  const can = useCan("stock:seuils");
  return (
    <>
      <PageHeader title="Seuils de stockage" subtitle="Au-delà de ces limites, une alerte s’ouvre et le responsable reçoit un SMS." />
      {!can && <Callout tone="info" className="mb-5">Votre rôle permet de consulter les seuils. Seul un responsable peut les modifier.</Callout>}
      <QueryView q={q}>
        {(list) => (
          <div className="grid gap-6 xl:grid-cols-2">
            {list.map((w) => (
              <ThresholdCard key={w.warehouse.id} w={w} disabled={!can} />
            ))}
            <Card className="p-5 text-sm text-ink-2 xl:col-span-2">
              <p className="font-display font-semibold text-ink">D’où viennent les valeurs conseillées ?</p>
              <p className="mt-1">
                Oignon en magasin ventilé : 24 à 30 °C et 65 à 72 % d’humidité relative ; au-dessus, les bulbes respirent davantage et les pourritures se développent. Pomme de terre : 8 à 14 °C et 85 à 95 %. Ce sont des points de départ : ajustez-les après quelques semaines de mesures et de contrôles visuels.
              </p>
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}

function ThresholdCard({ w, disabled }: { w: WarehouseSnapshot; disabled: boolean }) {
  const [t, setT] = useState<StorageThresholds>(w.warehouse.thresholds);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => api.warehouses.thresholds(w.warehouse.id, t),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["warehouse"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success(`Seuils du ${w.warehouse.name} enregistrés.`, { description: "Les alertes sont recalculées immédiatement." });
    },
  });
  const errT = t.temp[0] >= t.temp[1] ? "Le minimum doit être inférieur au maximum" : undefined;
  const errH = t.humidity[0] >= t.humidity[1] ? "Le minimum doit être inférieur au maximum" : undefined;
  const changed = JSON.stringify(t) !== JSON.stringify(w.warehouse.thresholds);
  const num = (v: string) => (v === "" ? 0 : Number(v));
  return (
    <Card>
      <CardHeader
        title={w.warehouse.name}
        subtitle={`${PRODUCT_LABEL[w.warehouse.product]} ${w.warehouse.variety} · ${STORAGE_LABEL[w.warehouse.storageType]}`}
        actions={
          !disabled && (
            <Button size="sm" variant="ghost" icon={<RotateCcw className="size-4" aria-hidden />} onClick={() => setT(PRESETS[w.warehouse.product]!)}>
              Valeurs conseillées
            </Button>
          )
        }
      />
      <CardBody className="flex flex-col gap-4">
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="col-span-2 mb-1 font-display text-sm font-semibold">Température</legend>
          <Field label="Minimum" error={errT}>
            <Input type="number" step="0.5" inputMode="decimal" suffix="°C" value={t.temp[0]} disabled={disabled} onChange={(e) => setT({ ...t, temp: [num(e.target.value), t.temp[1]] })} />
          </Field>
          <Field label="Maximum">
            <Input type="number" step="0.5" inputMode="decimal" suffix="°C" value={t.temp[1]} disabled={disabled} onChange={(e) => setT({ ...t, temp: [t.temp[0], num(e.target.value)] })} />
          </Field>
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="col-span-2 mb-1 font-display text-sm font-semibold">Humidité de l’air</legend>
          <Field label="Minimum" error={errH}>
            <Input type="number" inputMode="numeric" suffix="%" value={t.humidity[0]} disabled={disabled} onChange={(e) => setT({ ...t, humidity: [num(e.target.value), t.humidity[1]] })} />
          </Field>
          <Field label="Maximum">
            <Input type="number" inputMode="numeric" suffix="%" value={t.humidity[1]} disabled={disabled} onChange={(e) => setT({ ...t, humidity: [t.humidity[0], num(e.target.value)] })} />
          </Field>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Alerte CO₂ au-dessus de" hint="Respiration excessive">
            <Input type="number" inputMode="numeric" suffix="ppm" value={t.co2} disabled={disabled} onChange={(e) => setT({ ...t, co2: num(e.target.value) })} />
          </Field>
          <Field label="Alerte gaz au-dessus de" hint="Indice de 0 à 100">
            <Input type="number" inputMode="numeric" value={t.gas} disabled={disabled} onChange={(e) => setT({ ...t, gas: num(e.target.value) })} />
          </Field>
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!changed || !!errT || !!errH}>
              Enregistrer les seuils
            </Button>
            {changed && (
              <Button variant="ghost" onClick={() => setT(w.warehouse.thresholds)}>
                Annuler les modifications
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
