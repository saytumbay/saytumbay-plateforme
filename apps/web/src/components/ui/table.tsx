/** Tableau triable (TanStack Table) ; en cartes sous 720 px. Fichier séparé : la bibliothèque ne charge qu'avec les pages qui l'utilisent. */
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { cn } from "@/lib/cn";

export function DataTable<T>({ data, columns, onRowClick, getRowId, empty, caption, initialSort, rowClassName }: { data: T[]; columns: Array<ColumnDef<T, unknown>>; onRowClick?: (row: T) => void; getRowId?: (row: T) => string; empty?: ReactNode; caption: string; initialSort?: SortingState; rowClassName?: (row: T) => string | undefined }) {
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const table = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getRowId });
  if (!data.length && empty) return <>{empty}</>;
  return (
    <div className="w-full">
      <table className="w-full border-collapse text-sm max-[720px]:block">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-[720px]:sr-only">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-line">
              {hg.headers.map((h) => {
                const sortable = h.column.getCanSort();
                const dir = h.column.getIsSorted();
                return (
                  <th key={h.id} scope="col" aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined} className="px-4 py-2.5 text-left align-bottom font-display text-[12.5px] font-semibold text-ink-3" style={{ width: h.column.columnDef.size !== 150 ? h.column.columnDef.size : undefined }}>
                    {sortable ? (
                      <button type="button" onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 hover:text-ink">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {dir === "asc" ? <ArrowUp className="size-3.5" aria-hidden /> : dir === "desc" ? <ArrowDown className="size-3.5" aria-hidden /> : <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="max-[720px]:flex max-[720px]:flex-col max-[720px]:gap-3">
          {table.getRowModel().rows.map((r) => (
            <tr
              key={r.id}
              onClick={onRowClick ? () => onRowClick(r.original) : undefined}
              onKeyDown={onRowClick ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onRowClick(r.original)) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                "border-b border-line last:border-b-0 max-[720px]:grid max-[720px]:grid-cols-2 max-[720px]:gap-x-4 max-[720px]:gap-y-2 max-[720px]:rounded-xl max-[720px]:border max-[720px]:p-4",
                onRowClick && "cursor-pointer hover:bg-surface-2/60 focus-visible:bg-surface-2/60",
                rowClassName?.(r.original),
              )}
            >
              {r.getVisibleCells().map((c, i) => (
                <td key={c.id} className={cn("px-4 py-3 align-middle max-[720px]:p-0", i === 0 && "max-[720px]:col-span-2")}>
                  {i > 0 && (
                    <span className="mb-0.5 hidden text-[11.5px] font-semibold text-ink-3 max-[720px]:block" aria-hidden>
                      {typeof c.column.columnDef.header === "string" ? c.column.columnDef.header : ""}
                    </span>
                  )}
                  {flexRender(c.column.columnDef.cell, c.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
