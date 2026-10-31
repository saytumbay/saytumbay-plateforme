import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, RadioTower, Cpu, Coins, ReceiptText, MessageSquareText } from "lucide-react";
import { fmt, type AdminOrgRow } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView } from "@/components/ui/feedback";
import { Kpi } from "@/components/ui/data";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const ORG_TYPE = { cooperative: "Coopérative", gie: "GIE", entreprise: "Entreprise", exploitation: "Exploitation" } as const;
export const PLAN = { essai: "Essai", standard: "Standard", pro: "Pro" } as const;

export function OrgStatus({ o }: { o: Pick<AdminOrgRow, "status" | "trialEndsAt"> }) {
  if (o.status === "actif") return <Badge tone="brand">Actif</Badge>;
  if (o.status === "essai") return <Badge tone="water">Essai{o.trialEndsAt ? ` · ${Math.max(0, Math.ceil((new Date(o.trialEndsAt).getTime() - Date.now()) / 86400000))} j` : ""}</Badge>;
  return <Badge tone="danger">Suspendu</Badge>;
}

export default function Clients() {
  const ov = useQuery({ queryKey: ["admin", "overview"], queryFn: api.admin.overview });
  const q = useQuery({ queryKey: ["admin", "orgs"], queryFn: api.admin.orgs });
  const navigate = useNavigate();
  const billing = useCan("admin:facturation");
  const columns = useMemo<Array<ColumnDef<AdminOrgRow, unknown>>>(
    () => [
      {
        id: "nom",
        header: "Client",
        accessorKey: "name",
        cell: ({ row: { original: o } }) => (
          <div>
            <p className="font-display font-semibold">{o.name}</p>
            <p className="text-[13px] text-ink-3">
              {ORG_TYPE[o.type]} · {o.locality}, {o.region}
            </p>
          </div>
        ),
      },
      { id: "modules", header: "Modules", accessorFn: (o) => o.modules.join(), cell: ({ row: { original: o } }) => <span className="text-[13px]">{o.modules.map((m) => (m === "agritech" ? "AgriTech" : "Onion")).join(", ")}</span> },
      { id: "plan", header: "Offre", accessorKey: "plan", cell: ({ row: { original: o } }) => PLAN[o.plan] },
      { id: "capteurs", header: "Capteurs", accessorKey: "devices", cell: ({ row: { original: o } }) => <span className="tabular">{o.devices}</span> },
      { id: "horsligne", header: "Hors ligne", accessorKey: "offline", cell: ({ row: { original: o } }) => <span className={o.offline ? "font-semibold text-danger-ink tabular" : "tabular"}>{o.offline}</span> },
      { id: "membres", header: "Membres", accessorKey: "members" },
      ...(billing ? [{ id: "mrr", header: "Mensuel", accessorKey: "mrr", cell: ({ row: { original: o } }: { row: { original: AdminOrgRow } }) => <span className="tabular">{o.mrr ? fmt.fcfa(o.mrr) : "—"}</span> } as ColumnDef<AdminOrgRow, unknown>] : []),
      { id: "statut", header: "Statut", accessorKey: "status", cell: ({ row: { original: o } }) => <OrgStatus o={o} /> },
      { id: "activite", header: "Activité", accessorFn: (o) => o.lastActivityAt ?? "", cell: ({ row: { original: o } }) => <span className="text-[13px] text-ink-3">{o.lastActivityAt ? fmt.ago(o.lastActivityAt) : "—"}</span> },
    ],
    [billing],
  );
  return (
    <>
      <PageHeader title="Clients et parc" subtitle="Toutes les organisations clientes, leurs capteurs et leur abonnement." />
      {ov.data && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Clients" value={ov.data.orgs} icon={<Building2 className="size-[18px]" aria-hidden />} tone="brand" />
          <Kpi label="Capteurs installés" value={ov.data.devices.installed} sub={`${ov.data.devices.online} en ligne`} icon={<RadioTower className="size-[18px]" aria-hidden />} tone="water" />
          <Kpi label="À mettre à jour" value={ov.data.outdated} sub={`vers ${ov.data.latestFirmware}`} icon={<Cpu className="size-[18px]" aria-hidden />} tone={ov.data.outdated ? "sun" : "brand"} to="/admin/parc" />
          {billing && <Kpi label="Revenu mensuel" value={fmt.num(ov.data.mrr)} unit="FCFA" sub={`${ov.data.openInvoices} factures ouvertes, ${ov.data.overdue} en retard`} icon={<ReceiptText className="size-[18px]" aria-hidden />} tone={ov.data.overdue ? "danger" : "brand"} to="/admin/facturation" />}
          <Kpi label="SMS ce mois" value={fmt.num(ov.data.smsMonth)} sub="alertes, invitations, relances" icon={billing ? <MessageSquareText className="size-[18px]" aria-hidden /> : <Coins className="size-[18px]" aria-hidden />} />
        </div>
      )}
      <QueryView q={q}>
        {(orgs) => (
          <Card as="div" className="overflow-hidden">
            <DataTable caption="Organisations clientes" data={orgs} columns={columns} getRowId={(o) => o.id} onRowClick={(o) => navigate(`/admin/clients/${o.id}`)} />
          </Card>
        )}
      </QueryView>
    </>
  );
}
