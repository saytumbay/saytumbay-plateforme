import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { CheckCircle2, Mail, MessageCircle } from "lucide-react";
import { contactSchema } from "@saytumbay/shared";
import { api, ApiError, IS_DEMO } from "@/lib/api";
import { EMAIL, WHATSAPP } from "@/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, Select, Textarea } from "@/components/ui/form";

type Form = z.input<typeof contactSchema>;

const PROFILES: Array<[Form["profile"], string]> = [
  ["cooperative", "Coopérative ou GIE"],
  ["exploitation", "Exploitation horticole"],
  ["stockage", "Magasin de stockage"],
  ["financeur", "Investisseur, bailleur ou incubateur"],
  ["institution", "État, collectivité, ONG ou programme"],
  ["partenaire", "Partenaire technique ou de terrain"],
  ["autre", "Autre"],
];

/** Profil présélectionné par un lien de l'accueil, par exemple « /contact?profil=financeur ». */
const isProfile = (v: string | null): v is Form["profile"] => PROFILES.some(([k]) => k === v);

/**
 * Site vitrine sans serveur : rien n'est stocké. Le message est rédigé à partir du formulaire
 * et ouvert dans WhatsApp ou dans la messagerie du visiteur, qui n'a plus qu'à l'envoyer.
 */
type Channel = "whatsapp" | "email";
function draft(v: Form): { text: string; subject: string } {
  const profile = PROFILES.find(([k]) => k === v.profile)?.[1] ?? "";
  const lines = [`Bonjour SaytuMbay,`, "", v.message.trim(), "", `${v.name.trim()}${v.organization?.trim() ? `, ${v.organization.trim()}` : ""}`, `Profil : ${profile}`];
  if (v.region?.trim()) lines.push(`Localité : ${v.region.trim()}`);
  // Le schéma rend le numéro sans espaces (771234567) : on le remet en groupes lisibles.
  lines.push(`Téléphone : ${v.phone.trim().replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4")}`);
  return { text: lines.join("\n"), subject: `Contact depuis le site : ${v.name.trim()}${v.organization?.trim() ? ` (${v.organization.trim()})` : ""}` };
}
function channelUrl(channel: Channel, v: Form): string {
  const d = draft(v);
  const wa = WHATSAPP.href.split("?")[0];
  return channel === "whatsapp" ? `${wa}?text=${encodeURIComponent(d.text)}` : `mailto:${EMAIL.contact}?subject=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.text)}`;
}

export function ContactForm() {
  const [sent, setSent] = useState<string | null>(null);
  const channel = useRef<Channel>("whatsapp");
  const [drafted, setDrafted] = useState<{ channel: Channel; url: string; name: string } | null>(null);
  const form = useForm<Form>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", organization: "", phone: "", profile: "cooperative", region: "", message: "", consent: false as unknown as true, website: "" },
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const { search } = useLocation();
  useEffect(() => {
    const p = new URLSearchParams(search).get("profil");
    if (isProfile(p)) form.setValue("profile", p);
  }, [search, form]);
  const send = useMutation({ mutationFn: (v: Form) => api.contact(contactSchema.parse(v)), meta: { silent: true }, onSuccess: (_d, v) => setSent(v.name.split(" ")[0] ?? "") });
  const e = form.formState.errors;
  const submit = (v: Form) => {
    if (!IS_DEMO) return send.mutate(v);
    const url = channelUrl(channel.current, v);
    setDrafted({ channel: channel.current, url, name: v.name.split(" ")[0] ?? "" });
    if (channel.current === "whatsapp") window.open(url, "_blank", "noopener");
    else window.location.href = url;
  };
  if (drafted)
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-6">
        <CheckCircle2 className="size-10 text-brand" aria-hidden />
        <h3 className="font-display text-[22px] font-semibold tracking-tight">
          Merci{drafted.name ? ` ${drafted.name}` : ""}, votre message est prêt {drafted.channel === "whatsapp" ? "dans WhatsApp" : "dans votre messagerie"}.
        </h3>
        <p className="text-[15.5px] leading-relaxed text-ink-2">Il ne reste qu’à appuyer sur « Envoyer ». Rien ne s’est ouvert ? Utilisez le bouton ci-dessous.</p>
        <div className="flex flex-wrap gap-3">
          <a href={drafted.url} target={drafted.channel === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-4 font-display text-sm font-semibold text-brand-ink hover:bg-brand-strong">
            {drafted.channel === "whatsapp" ? <MessageCircle className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
            {drafted.channel === "whatsapp" ? "Ouvrir WhatsApp" : "Ouvrir ma messagerie"}
          </a>
          <Button variant="secondary" onClick={() => setDrafted(null)}>
            Modifier le message
          </Button>
        </div>
      </div>
    );
  if (sent !== null)
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-6">
        <CheckCircle2 className="size-10 text-brand" aria-hidden />
        <h3 className="font-display text-[22px] font-semibold tracking-tight">Merci{sent ? ` ${sent}` : ""}, votre message est bien arrivé.</h3>
        <p className="text-[15.5px] leading-relaxed text-ink-2">Nous vous rappelons au numéro indiqué dans les prochains jours. Pour aller plus vite, écrivez-nous aussi sur WhatsApp.</p>
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
    <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit(submit)} aria-label="Formulaire de contact">
      <h3 className="font-display text-[20px] font-semibold tracking-tight">Écrivez-nous</h3>
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
      <Field label="Localité" optional hint="Exemple : Mboro, Potou, Rufisque">
        <Input autoComplete="address-level2" {...form.register("region")} />
      </Field>
      <Field label="Votre message" error={e.message?.message}>
        <Textarea rows={4} placeholder="Votre terrain, votre stock, votre programme… ou ce que vous aimeriez construire avec nous" {...form.register("message")} />
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
                  J’accepte que SaytuMbay utilise ces informations pour me recontacter.{IS_DEMO ? " Le message part depuis votre WhatsApp ou votre messagerie : rien n’est enregistré sur ce site." : ""}{" "}
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
      {IS_DEMO ? (
        <div className="mt-1 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" size="lg" icon={<MessageCircle className="size-[18px]" aria-hidden />} onClick={() => (channel.current = "whatsapp")}>
            Envoyer par WhatsApp
          </Button>
          <Button type="submit" size="lg" variant="secondary" icon={<Mail className="size-[18px]" aria-hidden />} onClick={() => (channel.current = "email")}>
            Envoyer par e-mail
          </Button>
        </div>
      ) : (
        <Button type="submit" size="lg" loading={send.isPending} className="mt-1 w-full sm:w-auto sm:self-start">
          Envoyer la demande
        </Button>
      )}
    </form>
  );
}
