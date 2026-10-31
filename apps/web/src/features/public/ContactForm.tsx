import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { contactSchema } from "@saytumbay/shared";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";

type Form = z.input<typeof contactSchema>;

const PROFILES: Array<[Form["profile"], string]> = [
  ["cooperative", "Coopérative ou GIE"],
  ["exploitation", "Exploitation horticole"],
  ["stockage", "Magasin de stockage"],
  ["partenaire", "ONG, projet ou institution"],
  ["autre", "Autre"],
];

export function ContactForm() {
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<Form>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", organization: "", phone: "", profile: "cooperative", region: "", message: "", consent: false as unknown as true, website: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const send = useMutation({ mutationFn: (v: Form) => api.contact(contactSchema.parse(v)), meta: { silent: true }, onSuccess: (_d, v) => setSent(v.name.split(" ")[0] ?? "") });
  const e = form.formState.errors;
  if (sent !== null)
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-6">
        <CheckCircle2 className="size-10 text-brand" aria-hidden />
        <h3 className="font-display text-[22px] font-semibold tracking-tight">Merci{sent ? ` ${sent}` : ""}, votre message est bien arrivé.</h3>
        <p className="text-[15.5px] leading-relaxed text-ink-2">Nous vous rappelons au numéro indiqué pour convenir d’une visite. Pour aller plus vite, vous pouvez aussi nous écrire sur WhatsApp.</p>
        <Button
          variant="secondary"
          onClick={() => {
            form.reset();
            setSent(null);
          }}
        >
          Envoyer un autre message
        </Button>
      </div>
    );
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => send.mutate(v))} aria-label="Demande de démonstration">
      <h3 className="font-display text-[20px] font-semibold tracking-tight">Demander une démonstration</h3>
      <FormError>{send.error && !(send.error instanceof ApiError && send.error.status === 422) ? (send.error instanceof ApiError && send.error.status === 429 ? "Trop de messages envoyés depuis cette connexion. Réessayez dans quelques minutes ou écrivez-nous sur WhatsApp." : "L’envoi n’a pas abouti. Vérifiez votre connexion et réessayez, ou écrivez-nous sur WhatsApp.") : null}</FormError>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom et prénom" error={e.name?.message}>
          <Input autoComplete="name" {...form.register("name")} />
        </Field>
        <Field label="Téléphone ou WhatsApp" error={e.phone ? "Numéro sénégalais à 9 chiffres, par exemple 77 123 45 67" : undefined}>
          <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="77 123 45 67" {...form.register("phone")} />
        </Field>
        <Field label="Organisation" optional>
          <Input autoComplete="organization" {...form.register("organization")} />
        </Field>
        <Field label="Vous êtes">
          <Select {...form.register("profile")}>
            {PROFILES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Localité" optional hint="Exemple : Mboro, Potou, Rufisque">
        <Input autoComplete="address-level2" {...form.register("region")} />
      </Field>
      <Field label="Votre besoin" error={e.message?.message}>
        <Textarea rows={4} placeholder="Cultures, nombre de parcelles ou de magasins, ce que vous voulez surveiller" {...form.register("message")} />
      </Field>
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden>
        <label htmlFor="contact-site">Ne pas remplir ce champ</label>
        <input id="contact-site" tabIndex={-1} autoComplete="off" {...form.register("website")} />
      </div>
      <Controller
        control={form.control}
        name="consent"
        render={({ field }) => (
          <div>
            <Checkbox
              checked={field.value === true}
              onCheckedChange={(v) => field.onChange(v === true)}
              invalid={!!e.consent}
              label={
                <>
                  J’accepte que SaytuMbay utilise ces informations pour me recontacter.{" "}
                  <Link to="/confidentialite" className="font-medium text-brand underline underline-offset-2">
                    En savoir plus
                  </Link>
                </>
              }
            />
            {e.consent && <p className="mt-1.5 pl-8 text-[13px] text-danger-ink">{e.consent.message}</p>}
          </div>
        )}
      />
      <Button type="submit" size="lg" loading={send.isPending} className="mt-1 w-full sm:w-auto sm:self-start">
        Envoyer la demande
      </Button>
    </form>
  );
}
