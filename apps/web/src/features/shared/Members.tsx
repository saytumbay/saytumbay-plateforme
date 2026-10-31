import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserPlus, ShieldCheck, Trash2, MessageSquareText } from "lucide-react";
import { z } from "zod";
import { canAssignRole, fmt, inviteSchema, ORG_ROLE_HELP, ORG_ROLE_LABEL, type MemberRow, type OrgRole } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { useCan, useRole, useSession } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QueryView } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, Confirm } from "@/components/ui/overlay";
import { Field, Input, Select, FormError } from "@/components/ui/form";

const ROLES: OrgRole[] = ["proprietaire", "responsable", "exploitant", "technicien", "lecteur"];

export default function Members() {
  const q = useQuery({ queryKey: ["members"], queryFn: api.members.list });
  const parcels = useQuery({ queryKey: ["parcels"], queryFn: api.parcels.list });
  const canManage = useCan("membres:gerer");
  const myRole = useRole();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const update = useMutation({
    mutationFn: (v: { userId: string; role: OrgRole }) => api.members.update(v.userId, { role: v.role }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success(`${m.user.firstName} ${m.user.lastName} est maintenant ${ORG_ROLE_LABEL[m.membership.role].toLowerCase()}.`);
    },
  });
  const remove = useMutation({
    mutationFn: api.members.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success("Membre retiré. Son accès est coupé immédiatement.");
    },
  });
  const parcelNames = (m: MemberRow) => (m.membership.parcels === "all" ? "Toutes" : m.membership.parcels.map((id) => parcels.data?.find((p) => p.parcel.id === id)?.parcel.code ?? "?").join(", ") || "Aucune");
  return (
    <>
      <PageHeader
        title="Membres et rôles"
        subtitle="Chaque personne voit et fait uniquement ce que son rôle permet."
        actions={
          canManage && (
            <Button icon={<UserPlus className="size-4" aria-hidden />} onClick={() => setOpen(true)}>
              Inviter un membre
            </Button>
          )
        }
      />
      <QueryView q={q}>
        {(members) => (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Card as="div">
              <ul className="divide-y divide-line">
                {members.map((m) => {
                  const me = m.user.id === session?.user.id;
                  const editable = canManage && !me && myRole && canAssignRole(myRole, m.membership.role);
                  const name = `${m.user.firstName} ${m.user.lastName}`;
                  return (
                    <li key={m.user.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <Avatar name={name} size={42} />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 font-display font-semibold">
                          {name}
                          {me && <Badge size="sm">Vous</Badge>}
                          {m.membership.status === "invite" && <Badge tone="sun" size="sm">Invitation envoyée</Badge>}
                          {m.user.twoFactorEnabled && (
                            <span title="Double authentification activée" className="text-brand">
                              <ShieldCheck className="size-4" aria-label="Double authentification activée" />
                            </span>
                          )}
                        </p>
                        <p className="text-[13px] text-ink-3">
                          {fmt.phone(m.user.phone)} · parcelles : {parcelNames(m)} · {m.user.lastSeenAt ? `vu ${fmt.ago(m.user.lastSeenAt)}` : "jamais connecté"}
                        </p>
                      </div>
                      {editable ? (
                        <select
                          aria-label={`Rôle de ${name}`}
                          value={m.membership.role}
                          onChange={(e) => update.mutate({ userId: m.user.id, role: e.target.value as OrgRole })}
                          className="h-10 rounded-lg border border-line-strong bg-surface px-3 text-sm"
                        >
                          {ROLES.filter((r) => myRole && canAssignRole(myRole, r)).map((r) => (
                            <option key={r} value={r}>
                              {ORG_ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Badge tone={m.membership.role === "proprietaire" || m.membership.role === "responsable" ? "brand" : "neutral"}>{ORG_ROLE_LABEL[m.membership.role]}</Badge>
                      )}
                      {editable && (
                        <Confirm
                          trigger={
                            <button className="rounded-md p-2 text-ink-3 hover:bg-danger-soft hover:text-danger-ink" aria-label={`Retirer ${name}`}>
                              <Trash2 className="size-4" aria-hidden />
                            </button>
                          }
                          title={`Retirer ${name} ?`}
                          description="Cette personne perd l’accès immédiatement et ne reçoit plus les alertes SMS. L’historique de ses actions est conservé."
                          confirmLabel={`Retirer ${m.user.firstName}`}
                          onConfirm={() => remove.mutateAsync(m.user.id)}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Les rôles" subtitle="Un membre ne peut attribuer qu’un rôle égal ou inférieur au sien." />
              <CardBody className="pt-3">
                <dl className="flex flex-col gap-3">
                  {ROLES.map((r) => (
                    <div key={r}>
                      <dt className="font-display text-sm font-semibold">{ORG_ROLE_LABEL[r]}</dt>
                      <dd className="text-[13px] text-ink-3">{ORG_ROLE_HELP[r]}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          </div>
        )}
      </QueryView>
      <InviteSheet open={open} onOpenChange={setOpen} parcels={parcels.data?.map((p) => ({ id: p.parcel.id, label: `${p.parcel.code} · ${p.parcel.crop}` })) ?? []} />
    </>
  );
}

function InviteSheet({ open, onOpenChange, parcels }: { open: boolean; onOpenChange: (v: boolean) => void; parcels: Array<{ id: string; label: string }> }) {
  const qc = useQueryClient();
  const myRole = useRole();
  const [all, setAll] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const form = useForm<z.input<typeof inviteSchema>>({ resolver: zodResolver(inviteSchema), defaultValues: { firstName: "", lastName: "", phone: "", email: "", role: "exploitant", parcels: "all" } });
  const invite = useMutation({
    mutationFn: (v: z.input<typeof inviteSchema>) => api.members.invite({ ...(v as z.infer<typeof inviteSchema>), parcels: all ? "all" : picked }),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["members"] });
      toast.success(`Invitation envoyée par SMS à ${m.user.firstName}.`, { description: "Le lien est valable 7 jours." });
      form.reset();
      onOpenChange(false);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.details && typeof e.details === "object" && "fields" in e.details) for (const [k, v] of Object.entries((e.details as { fields: Record<string, string> }).fields)) form.setError(k as "phone", { message: v });
    },
  });
  const e = form.formState.errors;
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Inviter un membre"
      description="La personne reçoit un SMS avec un lien pour créer son mot de passe."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" form="form-invite" loading={invite.isPending} icon={<MessageSquareText className="size-4" aria-hidden />}>
            Envoyer l’invitation
          </Button>
        </>
      }
    >
      <form id="form-invite" noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => invite.mutate(v))}>
        <FormError>{invite.isError && !(invite.error instanceof ApiError && [409, 422].includes(invite.error.status)) ? invite.error.message : null}</FormError>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" error={e.firstName?.message} required>
            <Input autoComplete="off" {...form.register("firstName")} />
          </Field>
          <Field label="Nom" error={e.lastName?.message} required>
            <Input autoComplete="off" {...form.register("lastName")} />
          </Field>
        </div>
        <Field label="Téléphone" hint="Numéro sénégalais : l’invitation part par SMS" error={e.phone?.message} required>
          <Input type="tel" inputMode="tel" placeholder="+221 77 000 00 00" autoComplete="off" {...form.register("phone")} />
        </Field>
        <Field label="E-mail" optional error={e.email?.message}>
          <Input type="email" autoComplete="off" {...form.register("email")} />
        </Field>
        <Field label="Rôle" hint={ORG_ROLE_HELP[form.watch("role") as OrgRole]}>
          <Select {...form.register("role")}>
            {ROLES.filter((r) => myRole && canAssignRole(myRole, r)).map((r) => (
              <option key={r} value={r}>
                {ORG_ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-1.5 font-display text-[13.5px] font-semibold">Parcelles suivies</legend>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={all} onChange={(ev) => setAll(ev.target.checked)} className="size-4 accent-[var(--brand)]" /> Toutes les parcelles
          </label>
          {!all && (
            <div className="flex flex-wrap gap-1.5">
              {parcels.map((p) => {
                const on = picked.includes(p.id);
                return (
                  <button key={p.id} type="button" aria-pressed={on} onClick={() => setPicked((x) => (on ? x.filter((y) => y !== p.id) : [...x, p.id]))} className="h-9 rounded-full border border-line-strong px-3 text-[13px] font-semibold aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink">
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      </form>
    </Sheet>
  );
}
