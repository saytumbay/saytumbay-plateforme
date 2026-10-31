import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { fmt, RISK_LABEL, type StorageRisk } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan, useActiveMembership } from "@/lib/auth";
import { downloadCsv, printPage } from "@/lib/export";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView, Callout } from "@/components/ui/feedback";
import { Kpi } from "@/components/ui/data";
import { RiskBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OnionReports() {
  const q = useQuery({ queryKey: ["report", "onion"], queryFn: api.reports.onion });
  const can = useCan("rapports:exporter");
  const org = useActiveMembership()?.org.name ?? "";
  return (
    <>
      <PageHeader
        title="Rapports de stockage"
        subtitle="Conditions de conservation, contrôles et alertes par magasin."
        actions={
          can &&
          q.data && (
            <div className="no-print flex gap-2">
              <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={() => downloadCsv("saytumbay-stockage.csv", q.data!.byWarehouse.map((w) => ({ Magasin: w.name, "Stock (t)": w.stockT, État: RISK_LABEL[w.risk as StorageRisk], "Jours hors plage (7 j)": w.daysOverThreshold, Alertes: w.alerts })))}>
                Exporter en CSV
              </Button>
              <Button icon={<Printer className="size-4" aria-hidden />} onClick={() => printPage(`Rapport de stockage SaytuMbay · ${org}`)}>
                Imprimer ou PDF
              </Button>
            </div>
          )
        }
      />
      <QueryView q={q}>
        {(r) => (
          <div className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi label="Stock suivi" value={fmt.num(r.stockT)} unit="t" tone="onion" />
              <Kpi label="Contrôles visuels" value={r.inspections} sub="saisis sur la période" />
              <Kpi label="Produits abîmés" value={fmt.num(r.damagedRate, 1)} unit="%" sub="dans les échantillons contrôlés" tone={r.damagedRate > 10 ? "danger" : "brand"} />
              <Kpi label="Pertes évitées" value="—" sub="calculées après une saison complète avec magasin témoin" />
            </div>
            <Card>
              <CardHeader title="Par magasin" />
              <CardBody className="pt-2">
                <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[520px] text-sm">
                  <caption className="sr-only">Synthèse par magasin</caption>
                  <thead>
                    <tr className="border-b border-line text-left font-display text-[12.5px] text-ink-3">
                      <th scope="col" className="py-2 pr-3">Magasin</th>
                      <th scope="col" className="py-2 pr-3">Stock</th>
                      <th scope="col" className="py-2 pr-3">État</th>
                      <th scope="col" className="py-2 pr-3">Jours hors plage (7 j)</th>
                      <th scope="col" className="py-2">Alertes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.byWarehouse.map((w) => (
                      <tr key={w.id} className="border-b border-line last:border-0">
                        <th scope="row" className="py-3 pr-3 text-left font-display font-semibold">{w.name}</th>
                        <td className="py-3 pr-3 tabular">{fmt.tonnes(w.stockT)}</td>
                        <td className="py-3 pr-3"><RiskBadge risk={w.risk as StorageRisk} size="sm" /></td>
                        <td className="py-3 pr-3 tabular">{w.daysOverThreshold}</td>
                        <td className="py-3 tabular">{w.alerts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </CardBody>
            </Card>
            <Callout tone="info" title="Mesurer les pertes évitées, honnêtement">
              Le pilote compare chaque magasin équipé à un magasin témoin non équipé, sur une saison complète (pesée à l’entrée et à la sortie). Tant que cette comparaison n’existe pas, aucun chiffre de pertes évitées n’est affiché.
            </Callout>
          </div>
        )}
      </QueryView>
    </>
  );
}
