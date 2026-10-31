import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { MailX, UsersRound } from "lucide-react";
import { acceptInviteSchema, fmt, ORG_ROLE_HELP, ORG_ROLE_LABEL, type OrgRole } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { homeFor, useSetSession } from "@/lib/auth";
import { usePageTitle } from "@/components/ui/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, PasswordInput, PasswordStrength } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/feedback";
import { AuthLayout, AuthTitle } from "./AuthLayout";

type Form = z.input<typeof acceptInviteSchema>;

export default function Invite() {
  usePageTitle("Invitation");
  const { token = "" } = useParams();
  const q = useQuery({ queryKey: ["invite", token], queryFn: () => api.auth.invite(token), retry: false, enabled: token.length >= 32 });
  if (token.length < 32 || q.isError)
    return (
      <AuthLayout>
        <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-sun-soft text-sun-ink">
          <MailX className="size-6" aria-hidden />
        </div>
        <AuthTitle title="Invitation introuvable">{q.error instanceof ApiError && q.error.status === 404 ? q.error.message : "Ce lien d’invitation est incomplet ou a expiré. Demandez un nouveau lien au responsable de votre organisation."}</AuthTitle>
        <ButtonLink to="/connexion" variant="secondary" size="lg" className="w-full">
          J’ai déjà un compte
        </ButtonLink>
      </AuthLayout>
    );
  return (
    <AuthLayout>
      {q.data ? (
        <InviteForm token={token} invite={q.data} />
      ) : (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement de l’invitation">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      )}
    </AuthLayout>
  );
}

function InviteForm({ token, invite }: { token: string; invite: Awaited<ReturnType<typeof api.auth.invite>> }) {
  const navigate = useNavigate();
  const setSession = useSetSession();
  const role = invite.role as OrgRole;
  const form = useForm<Form>({ resolver: zodResolver(acceptInviteSchema), defaultValues: { token, firstName: invite.firstName, lastName: invite.lastName, password: "", confirm: "", acceptTerms: false as unknown as true }, mode: "onBlur", reValidateMode: "onChange" });
  const accept = useMutation({
    mutationFn: (v: Form) => api.auth.acceptInvite(acceptInviteSchema.parse(v)),
    meta: { silent: true },
    onSuccess: (s) => {
      setSession(s);
      navigate(homeFor(s), { replace: true });
    },
  });
  const e = form.formState.errors;
  return (
    <>
      <AuthTitle title={`Rejoindre ${invite.orgName}`}>{invite.invitedBy} vous invite à suivre les parcelles et les alertes de l’organisation.</AuthTitle>
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-line bg-surface-2/60 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-strong dark:text-brand">
          <UsersRound className="size-[18px]" aria-hidden />
        </span>
        <div className="min-w-0 text-[13.5px]">
          <p className="font-display text-sm font-semibold">Rôle : {ORG_ROLE_LABEL[role] ?? invite.role}</p>
          {ORG_ROLE_HELP[role] && <p className="mt-0.5 text-ink-2">{ORG_ROLE_HELP[role]}</p>}
          <p className="mt-2 text-ink-3">{invite.email}</p>
          <p className="text-ink-3 tabular">{fmt.phone(invite.phone)}</p>
        </div>
      </div>
      <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => accept.mutate(v))}>
        <FormError>{accept.error && !(accept.error instanceof ApiError && accept.error.status === 422) ? accept.error.message : null}</FormError>
        <input type="hidden" {...form.register("token")} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" error={e.firstName ? "Indiquez votre prénom" : undefined}>
            <Input autoComplete="given-name" {...form.register("firstName")} />
          </Field>
          <Field label="Nom" error={e.lastName ? "Indiquez votre nom" : undefined}>
            <Input autoComplete="family-name" {...form.register("lastName")} />
          </Field>
        </div>
        <input type="email" autoComplete="username" value={invite.email} readOnly hidden />
        <Field label="Mot de passe" error={e.password?.message}>
          <PasswordInput autoComplete="new-password" {...form.register("password")} />
        </Field>
        <PasswordStrength value={form.watch("password")} />
        <Field label="Confirmer le mot de passe" error={e.confirm?.message}>
          <PasswordInput autoComplete="new-password" {...form.register("confirm")} />
        </Field>
        <Controller
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <div>
              <Checkbox
                checked={field.value === true}
                onCheckedChange={(v) => field.onChange(v === true)}
                invalid={!!e.acceptTerms}
                label={
                  <>
                    J’accepte les{" "}
                    <Link to="/conditions" target="_blank" className="font-medium text-brand underline underline-offset-2">
                      conditions d’utilisation
                    </Link>{" "}
                    et la{" "}
                    <Link to="/confidentialite" target="_blank" className="font-medium text-brand underline underline-offset-2">
                      politique de confidentialité
                    </Link>
                    .
                  </>
                }
              />
              {e.acceptTerms && <p className="mt-1.5 pl-8 text-[13px] text-danger-ink">{e.acceptTerms.message}</p>}
            </div>
          )}
        />
        <Button type="submit" size="lg" className="mt-1 w-full" loading={accept.isPending}>
          Créer mon compte
        </Button>
      </form>
    </>
  );
}
