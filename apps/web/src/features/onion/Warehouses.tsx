import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { fmt, type WarehouseSnapshot } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { LIVE_MS } from "@/lib/hooks";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView } from "@/components/ui/feedback";
import { DataTable } from "@/components/ui/table";
import { RiskBadge } from "@/components/ui/badge";
import { PRODUCT_LABEL, STORAGE_LABEL, ZoneStrip } from "./shared";

export default function Warehouses() {
  const q = useQuery({ queryKey: ["warehouses"], queryFn: api.warehouses.list, refetchInterval: LIVE_MS });
  const navigate = useNavigate();
  const columns = useMemo<Array<ColumnDef<WarehouseSnapshot, unknown>>>(
    () => [
      {
        id: "nom",
        header: "Entrepôt",
        accessorFn: (w) => w.warehouse.name,
        cell: ({ row: { original: w } }) => (
          <div>
            <p className="font-display font-semibold">{w.warehouse.name}</p>
            <p className="text-[13px] text-ink-3">{STORAGE_LABEL[w.warehouse.storageType]}</p>
          </div>
        ),
      },
      { id: "produit", header: "Produit", accessorFn: (w) => w.warehouse.product, cell: ({ row: { original: w } }) => `${PRODUCT_LABEL[w.warehouse.product]} ${w.warehouse.variety}` },
      { id: "stock", header: "Stock", accessorFn: (w) => w.stockT, cell: ({ row: { original: w } }) => <span className="tabular">{fmt.tonnes(w.stockT)} / {w.warehouse.capacityT} t</span> },
      { id: "temp", header: "Température", accessorFn: (w) => w.temp ?? -99, cell: ({ row: { original: w } }) => <span className="tabular">{fmt.temp(w.temp)}</span> },
      { id: "hum", header: "Humidité", accessorFn: (w) => w.humidity ?? -1, cell: ({ row: { original: w } }) => <span className="tabular">{fmt.pct(w.humidity)}</span> },
      { id: "rangees", header: "Rangées", enableSorting: false, cell: ({ row: { original: w } }) => <div className="w-40"><ZoneStrip w={w} size="sm" /></div> },
      { id: "risque", header: "État", accessorFn: (w) => w.riskScore, cell: ({ row: { original: w } }) => <RiskBadge risk={w.risk} size="sm" /> },
    ],
    [],
  );
  return (
    <>
      <PageHeader title="Entrepôts" subtitle="Température, humidité et risque de pourriture par magasin. Valeurs relevées par les sondes." />
      <QueryView q={q}>
        {(list) => (
          <Card as="div" className="overflow-hidden">
            <DataTable caption="Entrepôts suivis" data={list} columns={columns} getRowId={(w) => w.warehouse.id} onRowClick={(w) => navigate(`/app/onion/entrepots/${w.warehouse.id}`)} initialSort={[{ id: "risque", desc: true }]} />
          </Card>
        )}
      </QueryView>
    </>
  );
}
