import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { forgotSchema } from "@saytumbay/shared";
import { api, IS_DEMO } from "@/lib/api";
import { usePageTitle } from "@/components/ui/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { AuthLayout, AuthTitle } from "./AuthLayout";

/** Jeton de démonstration (le vrai jeton arrive par SMS, 32 octets aléatoires, valable 30 minutes). */
export const DEMO_RESET_TOKEN = "demo-reinitialisation-0000000000000000";

export default function Forgot() {
  usePageTitle("Mot de passe oublié");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<z.input<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" }, mode: "onBlur", reValidateMode: "onChange" });
  const send = useMutation({ mutationFn: (v: z.input<typeof forgotSchema>) => api.auth.forgot(forgotSchema.parse(v).email), meta: { silent: true }, onSuccess: (_d, v) => setSentTo(v.email.trim().toLowerCase()) });
  return (
    <AuthLayout>
      <Link to="/connexion" className="-ml-2 mb-6 inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Retour à la connexion
      </Link>
      {sentTo ? (
        <div role="status">
          <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand-strong dark:text-brand">
            <MessageSquareText className="size-6" aria-hidden />
          </div>
          <AuthTitle title="Vérifiez vos SMS">
            Si un compte existe pour <strong className="font-semibold text-ink">{sentTo}</strong>, un lien pour choisir un nouveau mot de passe vient d’être envoyé par SMS au numéro du compte. Il reste valable 30 minutes.
          </AuthTitle>
          <ul className="flex flex-col gap-2 text-[14px] leading-relaxed text-ink-2">
            <li>Rien reçu ? Vérifiez que votre téléphone capte, puis réessayez dans quelques minutes.</li>
            <li>Nouveau numéro ? Le responsable de votre organisation peut le corriger et vous renvoyer une invitation.</li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-2">
            {IS_DEMO && <ButtonLink to={`/reinitialiser?jeton=${DEMO_RESET_TOKEN}`}>Ouvrir le lien de démonstration</ButtonLink>}
            <Button variant="secondary" onClick={() => (setSentTo(null), send.reset())}>
              Utiliser une autre adresse
            </Button>
          </div>
        </div>
      ) : (
        <>
          <AuthTitle title="Mot de passe oublié">Indiquez l’adresse e-mail de votre compte. Nous envoyons un lien par SMS au numéro associé pour choisir un nouveau mot de passe.</AuthTitle>
          <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => send.mutate(v))}>
            <FormError>{send.error?.message}</FormError>
            <Field label="Adresse e-mail" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} autoFocus {...form.register("email")} />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={send.isPending}>
              Envoyer le lien
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
