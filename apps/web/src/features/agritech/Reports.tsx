import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { fmt } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan, useActiveMembership } from "@/lib/auth";
import { downloadCsv, printPage } from "@/lib/export";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView } from "@/components/ui/feedback";
import { Kpi, Segmented, Meter } from "@/components/ui/data";
import { Button } from "@/components/ui/button";
import { MonthBars, monthShort } from "@/components/charts/charts";

export default function Reports() {
  const [season, setSeason] = useState<string | undefined>(undefined);
  const q = useQuery({ queryKey: ["report", "agritech", season], queryFn: () => api.reports.agritech(season), placeholderData: (p) => p });
  const canExport = useCan("rapports:exporter");
  const org = useActiveMembership()?.org.name ?? "";
  return (
    <>
      <PageHeader
        title="Rapports"
        subtitle="Eau, humidité et alertes par saison. Exportez-les pour un partenaire, une banque ou l’assemblée de la coopérative."
        actions={
          canExport &&
          q.data && (
            <div className="no-print flex gap-2">
              <Button
                variant="secondary"
                icon={<Download className="size-4" aria-hidden />}
                onClick={() =>
                  downloadCsv(
                    `saytumbay-rapport-${q.data!.season.replace(/\s+/g, "-").toLowerCase()}.csv`,
                    q.data!.byParcel.map((p) => ({ Parcelle: p.code, Culture: p.crop, "Eau (m³)": p.m3, "Humidité moyenne (%)": p.avgMoisture, "Jours sous le seuil": p.dryDays })),
                  )
                }
              >
                Exporter en CSV
              </Button>
              <Button icon={<Printer className="size-4" aria-hidden />} onClick={() => printPage(`Rapport SaytuMbay · ${org} · ${q.data!.season}`)}>
                Imprimer ou PDF
              </Button>
            </div>
          )
        }
      />
      <QueryView q={q}>
        {(r) => (
          <div className="flex flex-col gap-6">
            <div className="print-only mb-2 text-sm">
              {org} · {r.season} · édité le {fmt.date(new Date())}
            </div>
            <div className="no-print">
              <Segmented label="Saison" value={r.season} onChange={setSeason} options={r.seasons.map((s) => ({ value: s, label: s }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Eau utilisée" value={fmt.num(r.waterTotalM3, 1)} unit="m³" sub={r.season} tone="water" />
              <Kpi label="Eau économisée" value={r.savedPct} unit="%" sub="par rapport à un arrosage à heure fixe" tone="brand" />
              <Kpi label="Jours sous le seuil sec" value={r.daysBelowThreshold} sub="toutes parcelles confondues" tone={r.daysBelowThreshold > 10 ? "sun" : "neutral"} />
              <Kpi label="Irrigations" value={r.irrigations} sub="automatiques, programmées et manuelles" />
            </div>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Card>
                <CardHeader title="Eau par mois" subtitle="Eau utilisée et eau économisée grâce aux capteurs" />
                <CardBody>
                  <MonthBars data={r.months.map((m) => ({ month: m.month, value: m.used, extra: m.saved }))} unit="m³" stack={{ label: "Économisée", color: "var(--brand)", mainLabel: "Utilisée" }} color="var(--water)" height={240} ariaLabel="Eau utilisée et économisée par mois" />
                  <table className="sr-only">
                    <caption>Eau par mois</caption>
                    <tbody>
                      {r.months.map((m) => (
                        <tr key={m.month}>
                          <th>{monthShort(m.month)}</th>
                          <td>{m.used} m³ utilisés</td>
                          <td>{m.saved} m³ économisés</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Par parcelle" subtitle="Eau consommée sur la saison" />
                <CardBody>
                  <ul className="flex flex-col gap-4">
                    {r.byParcel.map((p) => {
                      const max = Math.max(...r.byParcel.map((x) => x.m3));
                      return (
                        <li key={p.parcelId}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                            <span className="font-display font-semibold">
                              Parcelle {p.code} <span className="font-sans font-normal text-ink-3">· {p.crop}</span>
                            </span>
                            <span className="font-display font-semibold tabular">{fmt.m3(p.m3)}</span>
                          </div>
                          <Meter value={p.m3} max={max} tone="water" label={`Eau parcelle ${p.code}`} />
                          <p className="mt-1 text-[12.5px] text-ink-3">
                            Humidité moyenne {p.avgMoisture == null ? "indisponible" : `${p.avgMoisture} %`} · {p.dryDays == null ? "pas de données récentes" : `${p.dryDays} j sous le seuil`}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </CardBody>
              </Card>
            </div>
            <Card>
              <CardHeader title="Alertes de la saison" />
              <CardBody>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    ["Sol sec", r.alertsCount.sol_sec],
                    ["Capteur hors ligne", r.alertsCount.capteur_hors_ligne],
                    ["Batterie faible", r.alertsCount.batterie_faible],
                    ["Stockage", r.alertsCount.stock],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="rounded-xl bg-surface-2 p-4">
                      <dt className="text-[13px] text-ink-3">{l}</dt>
                      <dd className="font-display text-2xl font-semibold tabular">{v ?? 0}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-[13px] text-ink-3">Chiffres de démonstration. En production, ils proviennent du journal des alertes et des mesures enregistrées.</p>
              </CardBody>
            </Card>
          </div>
        )}
      </QueryView>
    </>
  );
}
