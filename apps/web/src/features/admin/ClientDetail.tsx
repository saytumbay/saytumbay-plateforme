import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone } from "lucide-react";
import { fmt, ORG_ROLE_LABEL } from "@saytumbay/shared";
import { api } from "@/lib/api";
import { useCan } from "@/lib/auth";
import { PageHeader, DefinitionList } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView } from "@/components/ui/feedback";
import { DeviceBadge, InvoiceBadge, Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/data";
import { OrgStatus, ORG_TYPE, PLAN } from "./Clients";

export default function ClientDetail() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["admin", "org", id], queryFn: () => api.admin.org(id) });
  const billing = useCan("admin:facturation");
  return (
    <QueryView q={q}>
      {(d) => (
        <>
          <PageHeader crumbs={[{ label: "Clients", to: "/admin/clients" }, { label: d.org.name }]} title={d.org.name} subtitle={`${ORG_TYPE[d.org.type]} · ${d.org.locality}, ${d.org.region} · client depuis le ${fmt.date(d.org.createdAt)}`} meta={<OrgStatus o={d.org} />} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader title="Capteurs" subtitle={`${d.devices.filter((x) => x.kind !== "passerelle").length} capteurs, ${d.devices.filter((x) => x.status === "hors_ligne").length} hors ligne`} />
                <CardBody className="pt-2">
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {d.devices.map((dv) => (
                      <li key={dv.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-semibold tabular">
                            {dv.id} <span className="font-sans text-[12px] font-normal text-ink-3">{dv.firmware}</span>
                          </p>
                          <p className="truncate text-[12.5px] text-ink-3">
                            {dv.label} · {dv.lastSeenAt ? fmt.ago(dv.lastSeenAt) : "jamais vu"}
                          </p>
                        </div>
                        <DeviceBadge status={dv.status} size="sm" />
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Membres" subtitle="Lecture seule depuis la console : les rôles sont gérés par le client." />
                <CardBody className="pt-2">
                  <ul className="divide-y divide-line">
                    {d.members.map((m) => (
                      <li key={m.user.id} className="flex items-center gap-3 py-3">
                        <Avatar name={`${m.user.firstName} ${m.user.lastName}`} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-sm font-semibold">
                            {m.user.firstName} {m.user.lastName}
                          </p>
                          <p className="text-[12.5px] text-ink-3">{m.user.lastSeenAt ? `vu ${fmt.ago(m.user.lastSeenAt)}` : "jamais connecté"}</p>
                        </div>
                        <Badge size="sm">{ORG_ROLE_LABEL[m.membership.role]}</Badge>
                        <a href={`tel:${m.user.phone}`} className="rounded-md p-2 text-ink-3 hover:bg-surface-2" aria-label={`Appeler ${m.user.firstName}`}>
                          <Phone className="size-4" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>
            <div className="flex flex-col gap-6">
              <Card className="p-5">
                <DefinitionList
                  items={[
                    { label: "Offre", value: PLAN[d.org.plan] },
                    { label: "Modules", value: d.org.modules.map((m) => (m === "agritech" ? "AgriTech" : "Onion")).join(", ") },
                    { label: "Parcelles", value: d.org.parcels },
                    { label: "Magasins", value: d.org.warehouses },
                    ...(billing && d.subscription ? [{ label: "Tarif", value: d.subscription.baseFcfa ? `${fmt.fcfa(d.subscription.baseFcfa)} + ${fmt.fcfa(d.subscription.perSensorFcfa)} / capteur` : "Gratuit" }, { label: "Prochaine facture", value: fmt.date(d.subscription.nextBillingAt) }] : []),
                  ]}
                />
                {d.subscription?.note && <p className="mt-4 text-[13px] text-ink-3">{d.subscription.note}</p>}
              </Card>
              {billing && (
                <Card>
                  <CardHeader title="Factures" />
                  <CardBody className="pt-2">
                    <ul className="divide-y divide-line">
                      {d.invoices.map((i) => (
                        <li key={i.id} className="flex items-center gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-sm font-semibold tabular">{i.id}</p>
                            <p className="truncate text-[12.5px] text-ink-3">{i.label}</p>
                          </div>
                          <span className="text-sm tabular">{fmt.fcfa(i.amount)}</span>
                          <InvoiceBadge status={i.status} />
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </QueryView>
  );
}
