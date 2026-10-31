import { Link } from "react-router";
import { Thermometer, Droplets, Wind } from "lucide-react";
import { fmt, RISK_LABEL, type StorageRisk, type WarehouseSnapshot, type ZoneSnapshot } from "@saytumbay/shared";
import { cn } from "@/lib/cn";
import { RiskBadge } from "@/components/ui/badge";

export const PRODUCT_LABEL = { oignon: "Oignon", pomme_de_terre: "Pomme de terre" } as const;
export const STORAGE_LABEL = { ventilation_naturelle: "Ventilation naturelle", ventilation_forcee: "Ventilation forcée", chambre_froide: "Chambre froide" } as const;

const RISK_BG: Record<StorageRisk, string> = {
  bon: "bg-brand-soft text-brand-strong dark:text-brand border-brand/30",
  surveiller: "bg-sun-soft text-sun-ink border-sun/40",
  risque: "bg-danger-soft text-danger-ink border-danger/40",
  pourriture: "bg-danger text-white border-danger dark:text-[#2a0a04]",
};

/** Bande des rangées d'un entrepôt : une case par rangée, couleur = risque, texte = valeurs (jamais la couleur seule). */
export function ZoneStrip({ w, size = "md", selected, onSelect }: { w: WarehouseSnapshot; size?: "sm" | "md"; selected?: string | null; onSelect?: (z: string) => void }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${w.zones.length}, minmax(0,1fr))` }} role="list" aria-label={`Rangées de ${w.warehouse.name}`}>
      {w.zones.map((z) => {
        const label = w.warehouse.zones.find((x) => x.id === z.zoneId)?.label ?? z.zoneId;
        const content = (
          <>
            <span className={cn("font-display font-semibold", size === "sm" ? "text-[11px]" : "text-[12.5px]")}>{label.replace("Rangée ", "R")}</span>
            {size === "md" && <span className="text-[12px] tabular opacity-90">{z.humidity == null ? "—" : `${Math.round(z.humidity)} %`}</span>}
            <span className="sr-only">
              {label} : {RISK_LABEL[z.risk]}, humidité {z.humidity ?? "indisponible"} %, {z.temp ?? "—"} °C
            </span>
          </>
        );
        const cls = cn("flex flex-col items-center justify-center rounded-lg border", size === "sm" ? "h-9" : "h-14", RISK_BG[z.risk], selected === z.zoneId && "ring-2 ring-ink ring-offset-2 ring-offset-[var(--surface)]");
        return onSelect ? (
          <button key={z.zoneId} role="listitem" aria-pressed={selected === z.zoneId} onClick={() => onSelect(z.zoneId)} className={cls}>
            {content}
          </button>
        ) : (
          <div key={z.zoneId} role="listitem" className={cls}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function WarehouseCard({ w }: { w: WarehouseSnapshot }) {
  const t = w.warehouse.thresholds;
  return (
    <article className="relative flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[16px] font-semibold">
            <Link to={`/app/onion/entrepots/${w.warehouse.id}`} className="after:absolute after:inset-0 after:rounded-xl">
              {w.warehouse.name}
            </Link>
          </h3>
          <p className="text-[13px] text-ink-3">
            {PRODUCT_LABEL[w.warehouse.product]} {w.warehouse.variety} · {fmt.tonnes(w.stockT)} sur {w.warehouse.capacityT} t
          </p>
        </div>
        <RiskBadge risk={w.risk} size="sm" />
      </div>
      <dl className="grid grid-cols-3 gap-2">
        <Metric icon={<Thermometer className="size-3.5" aria-hidden />} label="Température" value={fmt.temp(w.temp)} bad={w.temp != null && (w.temp > t.temp[1] || w.temp < t.temp[0])} />
        <Metric icon={<Droplets className="size-3.5" aria-hidden />} label="Humidité" value={fmt.pct(w.humidity)} bad={w.humidity != null && w.humidity > t.humidity[1]} />
        <Metric icon={<Wind className="size-3.5" aria-hidden />} label="CO₂" value={w.co2 == null ? "—" : `${fmt.num(w.co2)}`} unit="ppm" bad={w.co2 != null && w.co2 > t.co2} />
      </dl>
      <ZoneStrip w={w} size="sm" />
      {w.reasons[0] && <p className="text-[13px] text-ink-2">{w.reasons[0]}</p>}
    </article>
  );
}

function Metric({ icon, label, value, unit, bad }: { icon: React.ReactNode; label: string; value: string; unit?: string; bad?: boolean }) {
  return (
    <div className={cn("rounded-lg px-2.5 py-2", bad ? "bg-danger-soft" : "bg-surface-2")}>
      <dt className="flex items-center gap-1 text-[11.5px] text-ink-3">
        {icon} {label}
      </dt>
      <dd className={cn("font-display text-[15px] font-semibold tabular", bad && "text-danger-ink")}>
        {value}
        {unit && <span className="ml-0.5 text-[11px] font-medium text-ink-3">{unit}</span>}
        {bad && <span className="sr-only"> (hors plage)</span>}
      </dd>
    </div>
  );
}

export function zoneLabel(w: WarehouseSnapshot, z: ZoneSnapshot) {
  return w.warehouse.zones.find((x) => x.id === z.zoneId)?.label ?? z.zoneId;
}
