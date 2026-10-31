import { useNavigate, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { LinkIcon } from "lucide-react";
import { resetSchema } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { usePageTitle } from "@/components/ui/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormError, PasswordInput, PasswordStrength } from "@/components/ui/form";
import { AuthLayout, AuthTitle } from "./AuthLayout";

type Form = z.input<typeof resetSchema>;

export default function Reset() {
  usePageTitle("Nouveau mot de passe");
  const [params] = useSearchParams();
  const token = params.get("jeton") ?? "";
  const navigate = useNavigate();
  const form = useForm<Form>({ resolver: zodResolver(resetSchema), defaultValues: { token, password: "", confirm: "" }, mode: "onBlur", reValidateMode: "onChange" });
  const reset = useMutation({
    mutationFn: (v: Form) => api.auth.reset(resetSchema.parse(v)),
    meta: { silent: true },
    onSuccess: () => navigate("/connexion?motif=reinitialise", { replace: true }),
  });
  const pwd = form.watch("password");
  const e = form.formState.errors;
  const invalidLink = token.length < 32 || (reset.error instanceof ApiError && (reset.error.status === 404 || reset.error.status === 410));
  if (invalidLink)
    return (
      <AuthLayout>
        <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-sun-soft text-sun-ink">
          <LinkIcon className="size-6" aria-hidden />
        </div>
        <AuthTitle title="Ce lien n’est plus valable">Les liens de réinitialisation expirent après 30 minutes et ne servent qu’une fois. Demandez-en un nouveau.</AuthTitle>
        <ButtonLink to="/mot-de-passe-oublie" size="lg" className="w-full">
          Demander un nouveau lien
        </ButtonLink>
      </AuthLayout>
    );
  return (
    <AuthLayout>
      <AuthTitle title="Choisir un nouveau mot de passe">Toutes vos autres sessions seront fermées par sécurité.</AuthTitle>
      <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => reset.mutate(v))}>
        <FormError>{reset.error && !(reset.error instanceof ApiError && reset.error.status === 422) ? reset.error.message : null}</FormError>
        <input type="hidden" {...form.register("token")} />
        <Field label="Nouveau mot de passe" error={e.password?.message}>
          <PasswordInput autoComplete="new-password" autoFocus {...form.register("password")} />
        </Field>
        <PasswordStrength value={pwd} />
        <Field label="Confirmer le mot de passe" error={e.confirm?.message}>
          <PasswordInput autoComplete="new-password" {...form.register("confirm")} />
        </Field>
        <Button type="submit" size="lg" className="mt-1 w-full" loading={reset.isPending}>
          Enregistrer le mot de passe
        </Button>
      </form>
    </AuthLayout>
  );
}
