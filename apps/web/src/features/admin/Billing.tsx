import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, MessageSquareText, Wallet } from "lucide-react";
import { fmt, markPaidSchema, type BillingState, type Invoice, type PaymentMethod } from "@saytumbay/shared";
import { api, ApiError, IS_DEMO } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView, EmptyState } from "@/components/ui/feedback";
import { FilterChips, Kpi, Meter } from "@/components/ui/data";
import { DataTable } from "@/components/ui/table";
import { InvoiceBadge, Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { Field, FormError, Input, Select } from "@/components/ui/form";
import { MonthLines, monthLong } from "@/components/charts/charts";
import { PLAN } from "./Clients";

export const METHOD: Record<PaymentMethod, string> = { wave: "Wave", orange_money: "Orange Money", free_money: "Free Money", virement: "Virement", especes: "Espèces" };
type Row = BillingState["invoices"][number];
type Filter = "toutes" | "a_encaisser" | "en_retard" | "payees";

const lateDays = (i: Invoice) => Math.floor((Date.now() - new Date(i.dueAt).getTime()) / 86400000);

export default function Billing() {
  const q = useQuery({ queryKey: ["admin", "billing"], queryFn: api.admin.billing });
  const [filter, setFilter] = useState<Filter>("a_encaisser");
  const [paying, setPaying] = useState<Row | null>(null);
  const qc = useQueryClient();
  const remind = useMutation({
    mutationFn: (id: string) => api.admin.remind(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin", "audit"] });
      toast.success(IS_DEMO ? "Relance enregistrée (SMS simulé en démo)." : "Relance envoyée par SMS.", { description: r.sms, duration: 8000 });
    },
  });
  const columns = useMemo<Array<ColumnDef<Row, unknown>>>(
    () => [
      {
        id: "facture",
        header: "Facture",
        accessorKey: "id",
        cell: ({ row: { original: i } }) => (
          <div className="min-w-0 max-w-[12.5rem] max-[720px]:max-w-none">
            <p className="whitespace-nowrap font-display font-semibold tabular">{i.id}</p>
            <p className="font-medium">{i.orgName}</p>
            <p className="truncate text-[12.5px] text-ink-3" title={i.label}>
              {i.label}
            </p>
          </div>
        ),
      },
      {
        id: "montant",
        header: "Montant",
        accessorKey: "amount",
        cell: ({ row: { original: i } }) => (
          <div className="whitespace-nowrap tabular">
            <p>{fmt.fcfa(i.amount)}</p>
            {i.status === "partielle" && <p className="whitespace-nowrap text-[12.5px] text-sun-ink">reste {fmt.fcfa(i.amount - i.paidAmount)}</p>}
          </div>
        ),
      },
      {
        id: "echeance",
        header: "Échéance",
        accessorKey: "dueAt",
        cell: ({ row: { original: i } }) => (
          <div>
            <p className="whitespace-nowrap tabular">{fmt.date(i.dueAt)}</p>
            {i.status === "en_retard" && <p className="whitespace-nowrap text-[12.5px] font-semibold text-danger-ink">{fmt.plural(Math.max(1, lateDays(i)), "jour", "jours")} de retard</p>}
          </div>
        ),
      },
      {
        id: "statut",
        header: "Statut",
        accessorKey: "status",
        cell: ({ row: { original: i } }) => (
          <div>
            <InvoiceBadge status={i.status} />
            {i.method && (
              <p className="mt-1 text-[12.5px] text-ink-3">
                {METHOD[i.method]}
                {i.paidAt ? <span className="block whitespace-nowrap">le {fmt.date(i.paidAt)}</span> : null}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        enableSorting: false,
        cell: ({ row: { original: i } }) =>
          i.status === "payee" || i.status === "annulee" ? null : (
            <div className="flex items-center justify-end gap-1.5">
              {(i.status === "en_retard" || lateDays(i) > -5) && (
                <IconButton label={`Relancer ${i.orgName} par SMS`} loading={remind.isPending && remind.variables === i.id} onClick={() => remind.mutate(i.id)}>
                  <MessageSquareText className="size-[18px]" aria-hidden />
                </IconButton>
              )}
              {/* Libellé masqué entre 721 et 1279 px pour que le tableau tienne dans la carte (infobulle à la place). */}
              <Button size="sm" variant="secondary" icon={<Wallet className="size-4" aria-hidden />} title={`Encaisser ${i.id}`} onClick={() => setPaying(i)}>
                <span className="min-[721px]:max-xl:sr-only">Encaisser</span>
              </Button>
            </div>
          ),
      },
    ],
    [remind],
  );
  return (
    <>
      <PageHeader
        title="Facturation et paiements"
        subtitle="Factures, encaissements Wave, Orange Money et virements, abonnements."
        actions={
          q.data && (
            <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={() => downloadCsv("saytumbay-factures.csv", q.data!.invoices.map((i) => ({ Numéro: i.id, Client: i.orgName, Objet: i.label, Montant: i.amount, Encaissé: i.paidAmount, Émise: i.issuedAt.slice(0, 10), Échéance: i.dueAt.slice(0, 10), Statut: i.status, Mode: i.method ? METHOD[i.method] : "" })))}>
              Exporter
            </Button>
          )
        }
      />
      <QueryView q={q}>
        {(d) => {
          const cur = d.finance[d.finance.length - 1]!;
          const open = d.invoices.filter((i) => i.status === "en_attente" || i.status === "partielle" || i.status === "en_retard");
          const late = d.invoices.filter((i) => i.status === "en_retard");
          const due = open.reduce((a, i) => a + i.amount - i.paidAmount, 0);
          const rate = Math.round((d.finance.reduce((a, m) => a + m.collected, 0) / Math.max(1, d.finance.reduce((a, m) => a + m.billed, 0))) * 100);
          const monthPaid = d.invoices.filter((i) => i.paidAt && i.paidAt.slice(0, 7) === cur.month && i.method);
          const byMethod = (Object.keys(METHOD) as PaymentMethod[]).map((m) => ({ m, n: monthPaid.filter((i) => i.method === m).length, v: monthPaid.filter((i) => i.method === m).reduce((a, i) => a + i.paidAmount, 0) })).filter((x) => x.n || x.m === "wave" || x.m === "orange_money");
          const totalM = byMethod.reduce((a, x) => a + x.v, 0);
          const rows = d.invoices.filter((i) => (filter === "toutes" ? true : filter === "payees" ? i.status === "payee" : filter === "en_retard" ? i.status === "en_retard" : open.includes(i)));
          return (
            <div className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label={`Facturé en ${monthLong(cur.month)}`} value={fmt.num(cur.billed)} unit="FCFA" sub={`revenu mensuel récurrent ${fmt.fcfa(d.mrr)}`} tone="brand" />
                <Kpi label={`Encaissé en ${monthLong(cur.month)}`} value={fmt.num(cur.collected)} unit="FCFA" sub={`${Math.round((cur.collected / Math.max(1, cur.billed)) * 100)} % du facturé`} tone="water" />
                <Kpi label="Reste à encaisser" value={fmt.num(due)} unit="FCFA" sub={fmt.plural(open.length, "facture ouverte", "factures ouvertes")} tone="sun" />
                <Kpi label="En retard" value={late.length} sub={late.length ? `${fmt.fcfa(late.reduce((a, i) => a + i.amount - i.paidAmount, 0))} à relancer` : "aucune facture en retard"} tone={late.length ? "danger" : "brand"} />
              </div>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <Card>
                  <CardHeader title="Facturé et encaissé · 6 mois" subtitle={`Taux d’encaissement sur la période : ${rate} %`} />
                  <CardBody>
                    <MonthLines
                      ariaLabel="Montants facturés et encaissés par mois"
                      unit="FCFA"
                      data={d.finance.map((m) => ({ month: m.month, billed: m.billed, collected: m.collected }))}
                      series={[
                        { key: "billed", name: "Facturé" },
                        { key: "collected", name: "Encaissé", color: "var(--series-3)" },
                      ]}
                    />
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader title={`Moyens de paiement en ${monthLong(cur.month)}`} subtitle={totalM ? `${fmt.fcfa(totalM)} encaissés` : "Aucun encaissement ce mois-ci"} />
                  <CardBody>
                    <ul className="flex flex-col gap-4">
                      {byMethod.map((x) => (
                        <li key={x.m}>
                          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-medium">{METHOD[x.m]}</span>
                            <span className="tabular text-ink-2">
                              {fmt.fcfa(x.v)} <span className="text-ink-3">· {fmt.plural(x.n, "paiement", "paiements")}</span>
                            </span>
                          </div>
                          <Meter value={x.v} max={Math.max(1, totalM)} tone="water" label={`Part ${METHOD[x.m]}`} />
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 text-[13px] text-ink-3">Les paiements mobiles sont rapprochés à la main depuis le relevé Wave ou Orange Money. Le rapprochement automatique arrive avec l’API marchand.</p>
                  </CardBody>
                </Card>
              </div>
              <Card>
                <CardHeader title="Factures" actions={<FilterChips label="Filtrer les factures" value={filter} onChange={setFilter} options={[{ value: "a_encaisser", label: "À encaisser", count: open.length }, { value: "en_retard", label: "En retard", count: late.length }, { value: "payees", label: "Payées", count: d.invoices.filter((i) => i.status === "payee").length }, { value: "toutes", label: "Toutes", count: d.invoices.length }]} />} />
                <div className="border-t border-line">
                  <DataTable caption="Factures" data={rows} columns={columns} getRowId={(i) => i.id} rowClassName={(i) => (i.status === "en_retard" ? "bg-danger-soft/40" : undefined)} empty={<EmptyState className="m-5" title="Aucune facture dans ce filtre" />} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Abonnements" subtitle="Forfait de base plus un montant par capteur et par mois." />
                <CardBody className="pt-2">
                  <ul className="divide-y divide-line">
                    {d.subscriptions.map((s) => (
                      <li key={s.orgId} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-3.5">
                        <div className="min-w-[200px] flex-1">
                          <p className="font-display font-semibold">{s.orgName}</p>
                          <p className="text-[13px] text-ink-3">{s.baseFcfa ? `${fmt.fcfa(s.baseFcfa)} + ${fmt.fcfa(s.perSensorFcfa)} par capteur` : s.note}</p>
                        </div>
                        <Badge tone={s.plan === "pro" ? "brand" : s.plan === "essai" ? "water" : "neutral"}>{PLAN[s.plan]}</Badge>
                        <span className="w-24 text-sm tabular text-ink-2">{fmt.plural(s.sensors, "capteur", "capteurs")}</span>
                        <span className="w-28 text-right font-display font-semibold tabular">{s.baseFcfa ? fmt.fcfa(s.baseFcfa + s.perSensorFcfa * s.sensors) : "—"}</span>
                        <span className="w-full text-[13px] text-ink-3 sm:w-48 sm:text-right">prochaine facture le {fmt.date(s.nextBillingAt)}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>
          );
        }}
      </QueryView>
      {paying && <PaySheet invoice={paying} onClose={() => setPaying(null)} />}
    </>
  );
}

function PaySheet({ invoice, onClose }: { invoice: Row; onClose: () => void }) {
  const qc = useQueryClient();
  const rest = invoice.amount - invoice.paidAmount;
  const form = useForm<z.input<typeof markPaidSchema>>({ resolver: zodResolver(markPaidSchema), defaultValues: { method: "wave", amount: rest } });
  const pay = useMutation({
    mutationFn: (v: z.input<typeof markPaidSchema>) => api.admin.markPaid(invoice.id, v.method, v.amount),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success(v.amount >= rest ? `Facture ${invoice.id} payée.` : `Paiement partiel enregistré sur ${invoice.id}.`);
      onClose();
    },
  });
  const e = form.formState.errors;
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Encaisser ${invoice.id}`}
      description={`${invoice.orgName} · ${invoice.label}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form="form-pay" loading={pay.isPending}>
            Enregistrer le paiement
          </Button>
        </>
      }
    >
      <form id="form-pay" noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => pay.mutate(v))}>
        <FormError>{pay.isError && !(pay.error instanceof ApiError && pay.error.status === 422) ? pay.error.message : null}</FormError>
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-surface-2 p-4 text-sm">
          <div>
            <dt className="text-ink-3">Montant de la facture</dt>
            <dd className="font-display font-semibold tabular">{fmt.fcfa(invoice.amount)}</dd>
          </div>
          <div>
            <dt className="text-ink-3">Reste à encaisser</dt>
            <dd className="font-display font-semibold tabular">{fmt.fcfa(rest)}</dd>
          </div>
        </dl>
        <Field label="Moyen de paiement" error={e.method?.message}>
          <Select {...form.register("method")}>
            {(Object.keys(METHOD) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>
                {METHOD[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Montant reçu" hint="Un montant inférieur enregistre un paiement partiel." error={e.amount?.message ? "Indiquez un montant en FCFA" : undefined}>
          <Input type="number" inputMode="numeric" min={1} max={rest} step={500} suffix="FCFA" {...form.register("amount", { valueAsNumber: true, max: rest })} />
        </Field>
      </form>
    </Sheet>
  );
}
