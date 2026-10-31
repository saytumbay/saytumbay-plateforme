import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Search } from "lucide-react";
import { fmt, type AuditRow } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView, EmptyState } from "@/components/ui/feedback";
import { FilterChips } from "@/components/ui/data";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

type Filter = "tout" | AuditRow["outcome"];
const OUTCOME: Record<AuditRow["outcome"], [string, "brand" | "sun" | "danger"]> = { succes: ["Succès", "brand"], refus: ["Refusé", "sun"], echec: ["Échec", "danger"] };
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function Audit() {
  const q = useQuery({ queryKey: ["admin", "audit"], queryFn: api.admin.audit });
  const orgs = useQuery({ queryKey: ["admin", "orgs"], queryFn: api.admin.orgs });
  const orgName = (id: string | null) => (id ? (orgs.data?.find((o) => o.id === id)?.name ?? id) : "Plateforme");
  const [filter, setFilter] = useState<Filter>("tout");
  const [search, setSearch] = useState("");
  const columns = useMemo<Array<ColumnDef<AuditRow, unknown>>>(
    () => [
      { id: "date", header: "Date", accessorKey: "at", cell: ({ row: { original: a } }) => <span className="whitespace-nowrap text-[13px] tabular">{fmt.date(a.at)} · {fmt.time(a.at)}</span> },
      { id: "acteur", header: "Acteur", accessorKey: "actorLabel", cell: ({ row: { original: a } }) => <span className="font-medium">{a.actorLabel.charAt(0).toUpperCase() + a.actorLabel.slice(1)}</span> },
      {
        id: "action",
        header: "Action",
        accessorKey: "action",
        cell: ({ row: { original: a } }) => (
          <div className="min-w-0">
            <p>{a.action}</p>
            <p className="truncate text-[12.5px] text-ink-3">{a.target}</p>
          </div>
        ),
      },
      { id: "org", header: "Organisation", accessorFn: (a) => orgName(a.orgId), cell: ({ getValue }) => <span className="text-[13px]">{String(getValue())}</span> },
      { id: "ip", header: "Adresse IP", accessorFn: (a) => a.ip ?? "", cell: ({ row: { original: a } }) => <span className="text-[13px] tabular text-ink-3">{a.ip ?? "—"}</span> },
      { id: "resultat", header: "Résultat", accessorKey: "outcome", cell: ({ row: { original: a } }) => <Badge tone={OUTCOME[a.outcome][1]} size="sm">{OUTCOME[a.outcome][0]}</Badge> },
    ],
    [orgs.data],
  );
  return (
    <>
      <PageHeader
        title="Journal d’audit"
        subtitle="Connexions, changements de droits, paiements, mises à jour : qui a fait quoi, quand et d’où. Conservé 12 mois."
        actions={
          q.data && (
            <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={() => downloadCsv("saytumbay-journal.csv", q.data!.map((a) => ({ Date: a.at, Acteur: a.actorLabel, Action: a.action, Cible: a.target, Organisation: orgName(a.orgId), IP: a.ip ?? "", Résultat: OUTCOME[a.outcome][0] })))}>
              Exporter
            </Button>
          )
        }
      />
      <QueryView q={q}>
        {(rows) => {
          const s = norm(search.trim());
          const list = [...rows].sort((a, b) => b.at.localeCompare(a.at)).filter((a) => (filter === "tout" || a.outcome === filter) && (!s || norm(`${a.actorLabel} ${a.action} ${a.target} ${a.ip ?? ""} ${orgName(a.orgId)}`).includes(s)));
          return (
            <Card as="div" className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
                <FilterChips label="Filtrer par résultat" value={filter} onChange={setFilter} options={[{ value: "tout", label: "Tout", count: rows.length }, { value: "succes", label: "Succès", count: rows.filter((a) => a.outcome === "succes").length }, { value: "refus", label: "Refusés", count: rows.filter((a) => a.outcome === "refus").length }, { value: "echec", label: "Échecs", count: rows.filter((a) => a.outcome === "echec").length }]} />
                <label className="relative block md:w-72">
                  <span className="sr-only">Rechercher dans le journal</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                  <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Personne, action, IP" className="pl-9" />
                </label>
              </div>
              <DataTable caption="Journal d’activité" data={list} columns={columns} getRowId={(a) => a.id} empty={<EmptyState className="m-5" title="Aucune entrée ne correspond" />} />
            </Card>
          );
        }}
      </QueryView>
    </>
  );
}
