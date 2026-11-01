import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fmt, type CostLine, type CostsState } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView } from "@/components/ui/feedback";
import { Kpi } from "@/components/ui/data";
import { MonthLines, monthLong, ofMonth } from "@/components/charts/charts";
import { cn } from "@/lib/cn";

const CATEGORY: Record<CostLine["category"], string> = { materiel: "Matériel", hebergement: "Hébergement", sms: "SMS", terrain: "Terrain", connectivite: "Connectivité", autre: "Autre" };
const signed = (v: number) => `${v < 0 ? "−" : "+"}${fmt.num(Math.abs(v))}`;

export default function Costs() {
  const q = useQuery({ queryKey: ["admin", "costs"], queryFn: api.admin.costs });
  const subs = useQuery({ queryKey: ["admin", "billing"], queryFn: api.admin.billing });
  return (
    <>
      <PageHeader title="Coûts et rentabilité" subtitle="Ce que coûte le service chaque mois, ce qu’il rapporte, et à partir de combien de capteurs il devient rentable." />
      <QueryView q={q}>{(d) => <CostsView d={d} subs={subs.data?.subscriptions ?? []} />}</QueryView>
    </>
  );
}

function CostsView({ d, subs }: { d: CostsState; subs: Array<{ orgId: string; orgName: string; baseFcfa: number; perSensorFcfa: number; sensors: number; plan: string }> }) {
  const month = d.lines[0]?.month ?? d.finance[d.finance.length - 1]!.month;
  const total = d.lines.reduce((a, l) => a + l.amount, 0);
  const VAR = d.variablePerSensor;
  const fixedCosts = total - VAR * d.sensorsPaying;
  const currentPrice = subs.find((s) => s.perSensorFcfa > 0)?.perSensorFcfa ?? 2500;
  const mrr = subs.reduce((a, s) => a + s.baseFcfa + s.perSensorFcfa * s.sensors, 0);
  const [price, setPrice] = useState(currentPrice);
  const [n, setN] = useState(Math.max(15, d.sensorsPaying));
  const breakEven = (p: number) => (p > VAR ? Math.max(1, Math.ceil((fixedCosts - d.fixedRevenue) / (p - VAR))) : null);
  const be = breakEven(price);
  const simRev = d.fixedRevenue + price * n;
  const simCost = fixedCosts + VAR * n;
  const simM = simRev - simCost;
  const cum = d.finance.reduce((a, m) => a + m.billed - m.costs, 0);
  const maxLine = Math.max(...d.lines.map((l) => l.amount));
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={`Coûts ${ofMonth(month)}`} value={fmt.num(total)} unit="FCFA" sub={fmt.plural(d.lines.length, "poste", "postes")} />
        <Kpi label="Coût par capteur" value={fmt.num(total / Math.max(1, d.sensorsInstalled))} unit="FCFA / mois" sub={`${d.sensorsInstalled} capteurs installés`} tone="danger" />
        <Kpi label="Revenu par capteur" value={fmt.num(mrr / Math.max(1, d.sensorsPaying))} unit="FCFA / mois" sub={`${d.sensorsPaying} capteurs payants, forfaits compris`} tone="brand" />
        <Kpi label="Point mort" value={breakEven(currentPrice) ?? "—"} unit={breakEven(currentPrice) ? "capteurs" : undefined} sub={breakEven(currentPrice) ? `au tarif actuel de ${fmt.fcfa(currentPrice)}` : `pas atteignable à ${fmt.fcfa(currentPrice)} par capteur`} tone="water" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title={`Postes de coûts ${ofMonth(month)}`} subtitle={`${fmt.fcfa(total)} au total`} />
          <CardBody>
            <ul className="flex flex-col gap-4">
              {[...d.lines]
                .sort((a, b) => b.amount - a.amount)
                .map((l) => (
                  <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{l.label}</p>
                      <p className="truncate text-[12.5px] text-ink-3">
                        {CATEGORY[l.category]} · {l.detail}
                      </p>
                    </div>
                    <span className="font-display text-sm font-semibold tabular">{fmt.fcfa(l.amount)}</span>
                    <div className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                      <div className="h-full rounded-full bg-series-1" style={{ width: `${(l.amount / maxLine) * 100}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
          </CardBody>
        </Card>

        <section aria-labelledby="sim-title" className="flex flex-col gap-5 rounded-2xl border border-transparent bg-[#0b2e24] p-5 text-[#f4efe6] shadow-2 dark:border-white/10 sm:p-6">
          <div>
            <h2 id="sim-title" className="font-display text-lg font-semibold text-white">
              Simuler le tarif
            </h2>
            <p className="mt-1 text-[13.5px] opacity-70">Forfaits de base actuels compris ({fmt.fcfa(d.fixedRevenue)} par mois). Coût direct d’un capteur : {fmt.fcfa(VAR)} par mois.</p>
          </div>
          <Range label="Abonnement par capteur et par mois" min={1500} max={8000} step={250} value={price} onChange={setPrice} display={`${fmt.num(price)} FCFA`} mark={{ value: currentPrice, label: "tarif actuel" }} />
          <Range label="Capteurs payants" min={10} max={300} step={5} value={n} onChange={setN} display={String(n)} mark={{ value: d.sensorsPaying, label: "aujourd’hui" }} />
          <dl className="grid grid-cols-3 gap-2.5" aria-live="polite">
            {[
              ["Revenus / mois", fmt.num(simRev), ""],
              ["Coûts / mois", fmt.num(simCost), ""],
              ["Marge / mois", signed(simM), simM < 0 ? "text-[#ff9b80]" : "text-[#5be39a]"],
            ].map(([l, v, c]) => (
              <div key={l} className="rounded-xl bg-white/[0.07] px-3 py-2.5">
                <dt className="text-[12.5px] opacity-70">{l}</dt>
                <dd className={cn("font-display text-lg font-semibold tabular sm:text-xl", c)}>{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[14px] leading-relaxed opacity-85">{be ? `À ${fmt.num(price)} FCFA par capteur, l’activité devient rentable à partir de ${be} capteurs payants.` : `À ${fmt.num(price)} FCFA, chaque capteur coûte plus qu’il ne rapporte : la marge baisse quand le parc grandit. Il faut dépasser ${fmt.num(VAR)} FCFA par capteur.`}</p>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Revenus et coûts · 6 mois" subtitle={`Écart cumulé : ${signed(cum)} FCFA`} />
          <CardBody>
            <MonthLines
              ariaLabel="Revenus facturés et coûts par mois"
              unit="FCFA"
              data={d.finance.map((m) => ({ month: m.month, billed: m.billed, costs: m.costs }))}
              series={[
                { key: "billed", name: "Revenus facturés" },
                { key: "costs", name: "Coûts", color: "var(--series-2)" },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={`Rentabilité par client en ${monthLong(month)}`} />
          <CardBody className="pt-2">
            <table className="w-full text-sm">
              <caption className="sr-only">Revenu, coûts directs et marge par client</caption>
              <thead>
                <tr className="border-b border-line text-left font-display text-[12.5px] text-ink-3">
                  <th scope="col" className="py-2 pr-3 font-semibold">Client</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Revenu</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Coûts directs</th>
                  <th scope="col" className="py-2 text-right font-semibold">Marge</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => {
                  const rev = s.baseFcfa + s.perSensorFcfa * s.sensors;
                  const cost = VAR * s.sensors;
                  const m = rev - cost;
                  return (
                    <tr key={s.orgId} className="border-b border-line last:border-0">
                      <th scope="row" className="py-3 pr-3 text-left font-normal">
                        <span className="block font-display font-semibold">{s.orgName}</span>
                        <span className="text-[12.5px] text-ink-3">{fmt.plural(s.sensors, "capteur", "capteurs")}</span>
                      </th>
                      <td className="py-3 pr-3 text-right tabular">{fmt.num(rev)}</td>
                      <td className="py-3 pr-3 text-right tabular">{fmt.num(cost)}</td>
                      <td className={cn("py-3 text-right font-display font-semibold tabular", m < 0 ? "text-danger-ink" : "text-brand-strong dark:text-brand")}>{signed(m)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-4 text-[13px] text-ink-3">Coûts directs : capteurs amortis sur 36 mois, SMS envoyés et déplacements de maintenance. Serveurs et passerelles sont comptés à part. Montants en FCFA.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Range({ label, min, max, step, value, onChange, display, mark }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; display: string; mark?: { value: number; label: string } }) {
  const id = useId();
  const pos = mark ? ((mark.value - min) / (max - min)) * 100 : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[14px] opacity-80">
          {label}
        </label>
        <output htmlFor={id} className="font-display text-xl font-semibold tabular">
          {display}
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-valuetext={display} className="h-8 w-full cursor-pointer accent-[#4cc98a]" />
      {mark && mark.value >= min && mark.value <= max && (
        <div className="relative h-4 text-[11.5px] opacity-60" aria-hidden>
          <span className={cn("absolute whitespace-nowrap", pos > 70 ? "-translate-x-full pr-0" : "-translate-x-[5px]")} style={{ left: `calc(${pos / 100} * (100% - 16px) + 8px)` }}>
            {pos > 70 ? `${mark.label} ▲` : `▲ ${mark.label}`}
          </span>
        </div>
      )}
    </div>
  );
}
