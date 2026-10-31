import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Droplets, Square } from "lucide-react";
import type { ParcelSnapshot } from "@saytumbay/shared";
import { fmt } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { Sheet } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Segmented } from "@/components/ui/data";
import { Callout } from "@/components/ui/feedback";
import { MoistureBadge } from "@/components/ui/badge";

const L_PER_MIN = 5.6; // goutte-à-goutte, débit moyen observé par parcelle

export function useIrrigationMutations() {
  const qc = useQueryClient();
  const refresh = () => {
    for (const k of ["overview", "parcels", "parcel", "irrigation", "alerts", "series"]) qc.invalidateQueries({ queryKey: [k] });
  };
  const start = useMutation({
    mutationFn: (v: { parcelId: string; durationMin: number }) => api.irrigation.start(v.parcelId, v.durationMin),
    onSuccess: (_d, v) => {
      refresh();
      toast.success(`Irrigation lancée pour ${v.durationMin} min.`, { description: "La vanne s’ouvre ; l’humidité du sol va remonter dans les prochaines minutes." });
    },
  });
  const stop = useMutation({
    mutationFn: (parcelId: string) => api.irrigation.stop(parcelId),
    onSuccess: () => {
      refresh();
      toast.success("Irrigation arrêtée. La vanne est fermée.");
    },
  });
  return { start, stop };
}

/** Lancer une irrigation manuelle : durée, eau estimée, effet attendu. */
export function IrrigateSheet({ snapshot, open, onOpenChange }: { snapshot: ParcelSnapshot | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const [preset, setPreset] = useState<"10" | "15" | "25" | "autre">("25");
  const [custom, setCustom] = useState(30);
  const { start } = useIrrigationMutations();
  const allowed = useCan("irrigation:commander");
  if (!snapshot) return null;
  const p = snapshot.parcel;
  const minutes = preset === "autre" ? custom : Number(preset);
  const target = Math.round((p.moisture.dry + p.moisture.wet) / 2);
  const valid = minutes >= 1 && minutes <= 120;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Arroser la parcelle ${p.code}`}
      description={`${p.crop} · ${fmt.hectares(p.areaHa)} · plage visée ${p.moisture.dry} à ${p.moisture.wet} %`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            icon={<Droplets className="size-4" aria-hidden />}
            loading={start.isPending}
            disabled={!allowed || !valid}
            onClick={() => start.mutate({ parcelId: p.id, durationMin: minutes }, { onSuccess: () => onOpenChange(false) })}
          >
            Arroser {minutes} min
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-4 py-3">
          <div>
            <p className="text-[13px] text-ink-3">Humidité du sol maintenant</p>
            <p className="font-display text-2xl font-semibold tabular">{fmt.pct(snapshot.moisture)}</p>
          </div>
          <MoistureBadge state={snapshot.state} />
        </div>
        <Field label="Durée" hint="Le capteur arrête l’arrosage plus tôt si le sol atteint le seuil haut.">
          <Segmented
            label="Durée de l’irrigation"
            value={preset}
            onChange={setPreset}
            options={[
              { value: "10", label: "10 min" },
              { value: "15", label: "15 min" },
              { value: "25", label: "25 min" },
              { value: "autre", label: "Autre" },
            ]}
          />
        </Field>
        {preset === "autre" && (
          <Field label="Durée personnalisée" error={valid ? undefined : "Entre 1 et 120 minutes"}>
            <Input type="number" inputMode="numeric" min={1} max={120} value={custom} onChange={(e) => setCustom(Number(e.target.value))} suffix="min" />
          </Field>
        )}
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line p-3">
            <dt className="text-[12.5px] text-ink-3">Eau estimée</dt>
            <dd className="font-display text-lg font-semibold tabular">{fmt.num(minutes * L_PER_MIN)}&nbsp;L</dd>
          </div>
          <div className="rounded-xl border border-line p-3">
            <dt className="text-[12.5px] text-ink-3">Objectif</dt>
            <dd className="font-display text-lg font-semibold tabular">≈ {target}&nbsp;%</dd>
          </div>
        </dl>
        {snapshot.state === "humide" && (
          <Callout tone="warn" title="Le sol est déjà humide">
            Arroser maintenant risque d’asphyxier les racines et de lessiver l’engrais.
          </Callout>
        )}
        {!allowed && <Callout tone="info">Votre rôle permet de consulter l’irrigation, pas de la commander.</Callout>}
      </div>
    </Sheet>
  );
}

export function StopButton({ parcelId, size = "sm" }: { parcelId: string; size?: "sm" | "md" }) {
  const { stop } = useIrrigationMutations();
  const allowed = useCan("irrigation:commander");
  return (
    <Button variant="secondary" size={size} disabled={!allowed} loading={stop.isPending} icon={<Square className="size-3.5" aria-hidden />} onClick={() => stop.mutate(parcelId)}>
      Arrêter
    </Button>
  );
}
