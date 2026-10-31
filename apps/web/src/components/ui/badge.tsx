import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Droplets, Flame, Info, Sun, WifiOff, BatteryLow, Clock3, Wrench, ShieldAlert } from "lucide-react";
import type { DeviceStatus, MoistureState, Severity, StorageRisk, AlertStatus, TaskStatus, InvoiceStatus } from "@saytumbay/shared";
import { cn } from "@/lib/cn";

export type Tone = "brand" | "water" | "sun" | "danger" | "onion" | "offline" | "neutral" | "solid-danger" | "solid-brand";

const tones: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand-strong dark:text-brand",
  water: "bg-water-soft text-water-ink",
  sun: "bg-sun-soft text-sun-ink",
  danger: "bg-danger-soft text-danger-ink",
  onion: "bg-onion-soft text-onion-ink",
  offline: "bg-offline-soft text-ink-2",
  neutral: "bg-surface-2 text-ink-2",
  "solid-danger": "bg-danger text-white dark:text-[#2a0a04]",
  "solid-brand": "bg-brand text-brand-ink",
};

export function Badge({ tone = "neutral", icon, children, className, size = "md" }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string; size?: "sm" | "md" }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full font-display font-semibold", size === "sm" ? "px-2 py-0.5 text-[11.5px]" : "px-2.5 py-1 text-xs", tones[tone], className)}>
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

const ic = "size-3.5 shrink-0";

export function MoistureBadge({ state, value, size }: { state: MoistureState; value?: number | null; size?: "sm" | "md" }) {
  const map: Record<MoistureState, [Tone, ReactNode, string]> = {
    sec: ["sun", <Sun key="s" className={ic} aria-hidden />, "Sec"],
    optimal: ["brand", <CheckCircle2 key="o" className={ic} aria-hidden />, "Dans la plage"],
    humide: ["water", <Droplets key="h" className={ic} aria-hidden />, "Humide"],
    indisponible: ["offline", <WifiOff key="i" className={ic} aria-hidden />, "Indisponible"],
  };
  const [tone, icon, label] = map[state];
  return (
    <Badge tone={tone} icon={icon} size={size}>
      {label}
      {value != null && state !== "indisponible" ? ` · ${Math.round(value)} %` : ""}
    </Badge>
  );
}

export function RiskBadge({ risk, size }: { risk: StorageRisk; size?: "sm" | "md" }) {
  const map: Record<StorageRisk, [Tone, ReactNode, string]> = {
    bon: ["brand", <CheckCircle2 key="b" className={ic} aria-hidden />, "Bonne conservation"],
    surveiller: ["sun", <Clock3 key="s" className={ic} aria-hidden />, "À surveiller"],
    risque: ["danger", <AlertTriangle key="r" className={ic} aria-hidden />, "Risque de pourriture"],
    pourriture: ["solid-danger", <Flame key="p" className={ic} aria-hidden />, "Pourriture probable"],
  };
  const [tone, icon, label] = map[risk];
  return (
    <Badge tone={tone} icon={icon} size={size}>
      {label}
    </Badge>
  );
}

export function DeviceBadge({ status, size }: { status: DeviceStatus; size?: "sm" | "md" }) {
  const map: Record<DeviceStatus, [Tone, ReactNode, string]> = {
    en_ligne: ["brand", <span key="e" className="size-2 rounded-full bg-current" aria-hidden />, "En ligne"],
    batterie_faible: ["danger", <BatteryLow key="b" className={ic} aria-hidden />, "Batterie faible"],
    hors_ligne: ["offline", <WifiOff key="h" className={ic} aria-hidden />, "Hors ligne"],
    maintenance: ["water", <Wrench key="m" className={ic} aria-hidden />, "Maintenance"],
  };
  const [tone, icon, label] = map[status];
  return (
    <Badge tone={tone} icon={icon} size={size}>
      {label}
    </Badge>
  );
}

export function SeverityBadge({ severity, size }: { severity: Severity; size?: "sm" | "md" }) {
  const map: Record<Severity, [Tone, ReactNode, string]> = {
    critique: ["solid-danger", <ShieldAlert key="c" className={ic} aria-hidden />, "Critique"],
    attention: ["sun", <AlertTriangle key="a" className={ic} aria-hidden />, "À surveiller"],
    info: ["water", <Info key="i" className={ic} aria-hidden />, "Info"],
  };
  const [tone, icon, label] = map[severity];
  return (
    <Badge tone={tone} icon={icon} size={size}>
      {label}
    </Badge>
  );
}

export function AlertStatusBadge({ status }: { status: AlertStatus }) {
  if (status === "ouverte") return <Badge tone="danger" icon={<CircleDashed className={ic} aria-hidden />}>Ouverte</Badge>;
  if (status === "prise_en_charge") return <Badge tone="water" icon={<Clock3 className={ic} aria-hidden />}>Prise en charge</Badge>;
  return <Badge tone="brand" icon={<CheckCircle2 className={ic} aria-hidden />}>Résolue</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  if (status === "a_faire") return <Badge tone="sun">À faire</Badge>;
  if (status === "en_cours") return <Badge tone="water">En cours</Badge>;
  return <Badge tone="brand">Terminée</Badge>;
}

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, [Tone, string]> = {
    payee: ["brand", "Payée"],
    en_attente: ["neutral", "En attente"],
    en_retard: ["solid-danger", "En retard"],
    partielle: ["sun", "Partielle"],
    annulee: ["offline", "Annulée"],
  };
  const [tone, label] = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}
