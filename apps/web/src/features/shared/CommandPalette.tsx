import { useDeferredValue, useState } from "react";
import { Command } from "cmdk";
import { Dialog } from "radix-ui";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Search, Sprout, RadioTower, Warehouse, Package, UserRound, FileText, Building2, ReceiptText, CornerDownLeft, Loader2 } from "lucide-react";
import type { SearchHit } from "@saytumbay/shared";
import { api } from "@/lib/api";

const PAGES_CLIENT: SearchHit[] = [
  { type: "page", id: "tdb", title: "Tableau de bord", subtitle: "AgriTech", to: "/app" },
  { type: "page", id: "carte", title: "Carte des parcelles", subtitle: "AgriTech", to: "/app/carte" },
  { type: "page", id: "irr", title: "Irrigation", subtitle: "Règles, programmation, journal", to: "/app/irrigation" },
  { type: "page", id: "cap", title: "Capteurs", subtitle: "État, batterie, signal", to: "/app/capteurs" },
  { type: "page", id: "al", title: "Alertes", subtitle: "AgriTech", to: "/app/alertes" },
  { type: "page", id: "tk", title: "Tâches", subtitle: "Organisation", to: "/app/taches" },
  { type: "page", id: "rp", title: "Rapports", subtitle: "Eau, humidité, alertes", to: "/app/rapports" },
  { type: "page", id: "on", title: "Stockage des oignons", subtitle: "Onion", to: "/app/onion" },
  { type: "page", id: "ent", title: "Entrepôts", subtitle: "Onion", to: "/app/onion/entrepots" },
  { type: "page", id: "seuils", title: "Seuils de stockage", subtitle: "Onion", to: "/app/onion/seuils" },
  { type: "page", id: "mb", title: "Membres et rôles", subtitle: "Organisation", to: "/app/membres" },
  { type: "page", id: "pa", title: "Paramètres et sécurité", subtitle: "Mon compte", to: "/app/parametres" },
];
const PAGES_ADMIN: SearchHit[] = [
  { type: "page", id: "cl", title: "Clients", subtitle: "Console", to: "/admin/clients" },
  { type: "page", id: "parc", title: "Parc et mises à jour", subtitle: "Console", to: "/admin/parc" },
  { type: "page", id: "fac", title: "Facturation", subtitle: "Console", to: "/admin/facturation" },
  { type: "page", id: "cou", title: "Coûts et rentabilité", subtitle: "Console", to: "/admin/couts" },
  { type: "page", id: "usr", title: "Utilisateurs", subtitle: "Console", to: "/admin/utilisateurs" },
  { type: "page", id: "jr", title: "Journal d’audit", subtitle: "Console", to: "/admin/journal" },
];

const ICON: Record<SearchHit["type"], typeof Search> = { parcelle: Sprout, capteur: RadioTower, entrepot: Warehouse, lot: Package, membre: UserRound, alerte: FileText, page: FileText, client: Building2, facture: ReceiptText };
const GROUP: Record<SearchHit["type"], string> = { parcelle: "Parcelles", capteur: "Capteurs", entrepot: "Entrepôts", lot: "Lots", membre: "Membres", alerte: "Alertes", page: "Pages", client: "Clients", facture: "Factures" };

export function CommandPalette({ open, onOpenChange, area }: { open: boolean; onOpenChange: (v: boolean) => void; area: "client" | "admin" }) {
  const [q, setQ] = useState("");
  const dq = useDeferredValue(q.trim());
  const navigate = useNavigate();
  const res = useQuery({ queryKey: ["search", dq], queryFn: () => api.search(dq), enabled: open && dq.length > 0, staleTime: 30_000 });
  const pages = area === "admin" ? PAGES_ADMIN : PAGES_CLIENT;
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const pageHits = dq ? pages.filter((p) => norm(`${p.title} ${p.subtitle}`).includes(norm(dq))) : pages.slice(0, 6);
  const all = [...(res.data ?? []), ...pageHits];
  const groups = [...new Set(all.map((h) => GROUP[h.type]))];
  const go = (h: SearchHit) => {
    onOpenChange(false);
    setQ("");
    navigate(h.to);
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#06110d]/45 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-[10vh] z-50 w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-3 data-[state=open]:animate-pop-in" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">Recherche</Dialog.Title>
          <Command shouldFilter={false} label="Recherche globale" className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-line px-4">
              {res.isFetching ? <Loader2 className="size-5 animate-spin text-ink-3" aria-hidden /> : <Search className="size-5 text-ink-3" aria-hidden />}
              <Command.Input value={q} onValueChange={setQ} placeholder={area === "admin" ? "Client, facture, page…" : "Parcelle, capteur, entrepôt, lot, membre…"} className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3" />
              <kbd className="rounded border border-line px-1.5 text-[11px] text-ink-3">Échap</kbd>
            </div>
            <Command.List className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-ink-3">{res.isFetching ? "Recherche…" : `Aucun résultat pour « ${q} ».`}</Command.Empty>
              {groups.map((g) => (
                <Command.Group key={g} heading={g} className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-3">
                  {all
                    .filter((h) => GROUP[h.type] === g)
                    .map((h) => {
                      const I = ICON[h.type];
                      return (
                        <Command.Item key={`${h.type}-${h.id}`} value={`${h.type}-${h.id}`} onSelect={() => go(h)} className="group flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 aria-selected:bg-surface-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-2 group-aria-selected:bg-surface">
                            <I className="size-4" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-display text-sm font-semibold">{h.title}</span>
                            <span className="block truncate text-[12.5px] text-ink-3">{h.subtitle}</span>
                          </span>
                          <CornerDownLeft className="size-4 text-ink-3 opacity-0 group-aria-selected:opacity-100" aria-hidden />
                        </Command.Item>
                      );
                    })}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
