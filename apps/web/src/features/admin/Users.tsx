import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { fmt, ORG_ROLE_LABEL, PLATFORM_ROLE_LABEL, type AdminUserRow, type OrgRole } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { QueryView, EmptyState } from "@/components/ui/feedback";
import { Avatar, DataTable, FilterChips } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/form";

type Filter = "tous" | "equipe" | "sans2fa";
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export default function Users() {
  const q = useQuery({ queryKey: ["admin", "users"], queryFn: api.admin.users });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("tous");
  const columns = useMemo<Array<ColumnDef<AdminUserRow, unknown>>>(
    () => [
      {
        id: "nom",
        header: "Utilisateur",
        accessorFn: (r) => `${r.user.lastName} ${r.user.firstName}`,
        cell: ({ row: { original: r } }) => (
          <div className="flex items-center gap-3">
            <Avatar name={`${r.user.firstName} ${r.user.lastName}`} size={34} />
            <div className="min-w-0">
              <p className="font-display font-semibold">
                {r.user.firstName} {r.user.lastName}
              </p>
              <p className="truncate text-[12.5px] text-ink-3">{r.user.email}</p>
            </div>
          </div>
        ),
      },
      { id: "tel", header: "Téléphone", accessorFn: (r) => r.user.phone, cell: ({ row: { original: r } }) => <span className="whitespace-nowrap text-[13px] tabular">{fmt.phone(r.user.phone)}</span> },
      {
        id: "orgs",
        header: "Organisations",
        accessorFn: (r) => r.orgs.map((o) => o.name).join(),
        cell: ({ row: { original: r } }) =>
          r.orgs.length ? (
            <ul className="flex flex-col gap-0.5 text-[13px]">
              {r.orgs.map((o) => (
                <li key={o.id}>
                  {o.name} <span className="text-ink-3">· {ORG_ROLE_LABEL[o.role as OrgRole] ?? o.role}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-ink-3">—</span>
          ),
      },
      { id: "plateforme", header: "Accès console", accessorFn: (r) => r.user.platformRole, cell: ({ row: { original: r } }) => (r.user.platformRole === "aucun" ? <span className="text-ink-3">—</span> : <Badge tone={r.user.platformRole === "admin" ? "onion" : "water"}>{PLATFORM_ROLE_LABEL[r.user.platformRole]}</Badge>) },
      {
        id: "2fa",
        header: "Double facteur",
        accessorFn: (r) => (r.user.twoFactorEnabled ? 1 : 0),
        cell: ({ row: { original: r } }) =>
          r.user.twoFactorEnabled ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-brand-strong dark:text-brand">
              <ShieldCheck className="size-4" aria-hidden /> Activé
            </span>
          ) : (
            <span className={r.user.platformRole !== "aucun" ? "inline-flex items-center gap-1.5 text-[13px] font-semibold text-danger-ink" : "inline-flex items-center gap-1.5 text-[13px] text-ink-3"}>
              <ShieldAlert className="size-4" aria-hidden /> Non activé
            </span>
          ),
      },
      { id: "vu", header: "Dernière connexion", accessorFn: (r) => r.user.lastSeenAt ?? "", cell: ({ row: { original: r } }) => <span className="text-[13px] text-ink-3">{r.user.lastSeenAt ? fmt.ago(r.user.lastSeenAt) : "jamais"}</span> },
    ],
    [],
  );
  return (
    <>
      <PageHeader title="Utilisateurs" subtitle="Tous les comptes, leurs organisations et leur niveau de sécurité. Les rôles se gèrent dans chaque organisation." />
      <QueryView q={q}>
        {(users) => {
          const s = norm(search.trim());
          const rows = users.filter((r) => (filter === "equipe" ? r.user.platformRole !== "aucun" : filter === "sans2fa" ? !r.user.twoFactorEnabled : true) && (!s || norm(`${r.user.firstName} ${r.user.lastName} ${r.user.email} ${r.user.phone} ${r.orgs.map((o) => o.name).join(" ")}`).includes(s)));
          return (
            <Card as="div" className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
                <FilterChips label="Filtrer les utilisateurs" value={filter} onChange={setFilter} options={[{ value: "tous", label: "Tous", count: users.length }, { value: "equipe", label: "Équipe saytumbay", count: users.filter((r) => r.user.platformRole !== "aucun").length }, { value: "sans2fa", label: "Sans double facteur", count: users.filter((r) => !r.user.twoFactorEnabled).length }]} />
                <label className="relative block md:w-72">
                  <span className="sr-only">Rechercher un utilisateur</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                  <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, téléphone, organisation" className="pl-9" />
                </label>
              </div>
              <DataTable caption="Utilisateurs" data={rows} columns={columns} getRowId={(r) => r.user.id} empty={<EmptyState className="m-5" title="Aucun utilisateur ne correspond" />} />
            </Card>
          );
        }}
      </QueryView>
    </>
  );
}
