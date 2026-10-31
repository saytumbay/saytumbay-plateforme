import { useState, type ReactNode } from "react";
import { Tabs as RTabs } from "radix-ui";
import { Link } from "react-router";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { cn } from "@/lib/cn";

/** Indicateur chiffré. Le chiffre domine, le libellé dit ce qu'il mesure, la ligne du bas dit pourquoi c'est important. */
export function Kpi({ label, value, unit, sub, icon, tone = "neutral", to, className }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; icon?: ReactNode; tone?: "neutral" | "brand" | "water" | "sun" | "danger" | "onion"; to?: string; className?: string }) {
  const iconTone = {
    neutral: "bg-surface-2 text-ink-2",
    brand: "bg-brand-soft text-brand-strong dark:text-brand",
    water: "bg-water-soft text-water-ink",
    sun: "bg-sun-soft text-sun-ink",
    danger: "bg-danger-soft text-danger-ink",
    onion: "bg-onion-soft text-onion-ink",
  }[tone];
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-2">{label}</p>
        {icon && <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", iconTone)}>{icon}</span>}
      </div>
      <p className="mt-2 flex items-baseline gap-1.5 font-display text-[30px] font-semibold leading-none tracking-tight tabular">
        {value}
        {unit && <span className="text-base font-medium text-ink-3">{unit}</span>}
      </p>
      {sub && <p className="mt-2 text-[13px] text-ink-3">{sub}</p>}
    </>
  );
  const cls = cn("block rounded-xl border border-line bg-surface p-4 sm:p-5", to && "transition-colors hover:border-line-strong hover:bg-surface-2/40", className);
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Meter({ value, max = 100, tone = "brand", label, className, band }: { value: number | null; max?: number; tone?: "brand" | "water" | "sun" | "danger" | "offline"; label: string; className?: string; band?: [number, number] }) {
  const bar = { brand: "bg-brand", water: "bg-water", sun: "bg-sun", danger: "bg-danger", offline: "bg-offline" }[tone];
  const pct = value == null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-3", className)} role="meter" aria-label={label} aria-valuenow={value ?? undefined} aria-valuemin={0} aria-valuemax={max}>
      {band && <div className="absolute inset-y-0 bg-brand/15" style={{ left: `${(band[0] / max) * 100}%`, width: `${((band[1] - band[0]) / max) * 100}%` }} aria-hidden />}
      <div className={cn("relative h-full rounded-full transition-[width] duration-500 ease-out", bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Choix exclusif court (2 à 5 options) : groupe de boutons radio, navigable au clavier. */
export function Segmented<T extends string>({ value, onChange, options, label, size = "md", className }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: ReactNode }>; label: string; size?: "sm" | "md"; className?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-lg bg-surface-2 p-1", className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                e.preventDefault();
                const next = options[(i + (e.key === "ArrowRight" ? 1 : options.length - 1)) % options.length]!;
                onChange(next.value);
                (e.currentTarget.parentElement?.children[options.indexOf(next)] as HTMLElement | undefined)?.focus();
              }
            }}
            className={cn(
              "rounded-md font-display font-semibold transition-colors",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[13px]",
              on ? "bg-surface text-ink shadow-1" : "text-ink-3 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs({ value, onValueChange, items, children, className }: { value: string; onValueChange: (v: string) => void; items: Array<{ value: string; label: ReactNode; count?: number }>; children: ReactNode; className?: string }) {
  return (
    <RTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RTabs.List className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
        {items.map((it) => (
          <RTabs.Trigger
            key={it.value}
            value={it.value}
            className="relative -mb-px flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 pb-2.5 pt-2 font-display text-sm font-semibold text-ink-3 transition-colors hover:text-ink data-[state=active]:border-brand data-[state=active]:text-ink"
          >
            {it.label}
            {it.count != null && <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] tabular text-ink-2">{it.count}</span>}
          </RTabs.Trigger>
        ))}
      </RTabs.List>
      {children}
    </RTabs.Root>
  );
}
export const TabPanel = ({ value, children, className }: { value: string; children: ReactNode; className?: string }) => (
  <RTabs.Content value={value} className={cn("pt-5 focus-visible:outline-none", className)}>
    {children}
  </RTabs.Content>
);

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const parts = name.trim().split(/\s+/);
  const ini = `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts[parts.length - 1]![0] : ""}`.toUpperCase();
  const hues = ["bg-brand-soft text-brand-strong dark:text-brand", "bg-water-soft text-water-ink", "bg-sun-soft text-sun-ink", "bg-onion-soft text-onion-ink"];
  const h = hues[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % hues.length];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold", h, className)} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {ini}
    </span>
  );
}

/** Filtres en pastilles avec compteur (ex. « À traiter 3 »). */
export function FilterChips<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<{ value: T; label: string; count?: number }>; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn("inline-flex h-9 items-center gap-2 rounded-full border px-3.5 font-display text-[13px] font-semibold transition-colors", on ? "border-ink bg-ink text-bg" : "border-line-strong bg-surface text-ink hover:bg-surface-2")}
          >
            {o.label}
            {o.count != null && <span className={cn("rounded-full px-1.5 text-[11px] tabular", on ? "bg-bg/20" : "bg-surface-2 text-ink-2")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Tableau triable. Sous 720 px, chaque ligne devient une carte (libellés en tête de valeur)
 * pour rester lisible sur téléphone sans défilement horizontal.
 */
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
