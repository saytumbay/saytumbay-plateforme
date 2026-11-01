import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import QRCode from "qrcode";
import { ShieldCheck, Smartphone, Monitor, Moon, Sun, Download, LogOut, KeyRound } from "lucide-react";
import type { z } from "zod";
import { changePasswordSchema, fmt, profileSchema, ORG_ROLE_LABEL, WOLOF_SMS_RELU } from "@saytumbay/shared";
import { api, ApiError, IS_DEMO } from "@/lib/api";
import { useActiveMembership, useSession, useSetSession } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { PageHeader } from "@/components/ui/page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs, TabPanel } from "@/components/ui/data";
import { Field, Input, PasswordInput, PasswordStrength, Select, Switch, FormError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/feedback";
import { Confirm } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";

function applyFieldErrors<T extends Record<string, unknown>>(e: unknown, set: (k: keyof T & string, m: string) => void) {
  if (e instanceof ApiError && e.details && typeof e.details === "object" && "fields" in e.details) for (const [k, v] of Object.entries((e.details as { fields: Record<string, string> }).fields)) set(k as keyof T & string, v);
}

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("onglet") ?? "profil";
  const admin = useLocation().pathname.startsWith("/admin");
  return (
    <>
      <PageHeader title="Mon compte et sécurité" subtitle="Vos informations, votre mot de passe, vos alertes et vos données personnelles." />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ onglet: v }, { replace: true })}
        items={[
          { value: "profil", label: "Profil" },
          { value: "securite", label: "Sécurité" },
          ...(admin ? [] : [{ value: "alertes", label: "Alertes et SMS" }]),
          { value: "apparence", label: "Apparence" },
          { value: "donnees", label: "Mes données" },
        ]}
      >
        <TabPanel value="profil">
          <Profile />
        </TabPanel>
        <TabPanel value="securite">
          <Security />
        </TabPanel>
        {!admin && (
          <TabPanel value="alertes">
            <Notifications />
          </TabPanel>
        )}
        <TabPanel value="apparence">
          <Appearance />
        </TabPanel>
        <TabPanel value="donnees">
          <DataRights />
        </TabPanel>
      </Tabs>
    </>
  );
}

function Profile() {
  const { data } = useSession();
  const setSession = useSetSession();
  const m = useActiveMembership();
  const u = data!.user;
  const form = useForm<z.input<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { firstName: u.firstName, lastName: u.lastName, phone: fmt.phone(u.phone), locale: u.locale } });
  const save = useMutation({
    mutationFn: (v: z.input<typeof profileSchema>) => api.auth.profile(profileSchema.parse(v)),
    onSuccess: (s) => {
      setSession(s);
      toast.success("Profil enregistré.");
      form.reset(form.getValues());
    },
    onError: (e) => applyFieldErrors(e, (k, msg) => form.setError(k as "phone", { message: msg })),
  });
  const e = form.formState.errors;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader title="Informations personnelles" subtitle="Le numéro de téléphone reçoit les alertes SMS." />
        <CardBody>
          <form noValidate className="grid max-w-xl gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <Field label="Prénom" error={e.firstName?.message} required>
              <Input autoComplete="given-name" {...form.register("firstName")} />
            </Field>
            <Field label="Nom" error={e.lastName?.message} required>
              <Input autoComplete="family-name" {...form.register("lastName")} />
            </Field>
            <Field label="Téléphone" error={e.phone?.message} className="sm:col-span-2" required>
              <Input type="tel" inputMode="tel" autoComplete="tel" {...form.register("phone")} />
            </Field>
            <Field label="E-mail de connexion" hint="Pour changer d’adresse, contactez le responsable de votre organisation." className="sm:col-span-2">
              <Input value={u.email} disabled readOnly />
            </Field>
            <Field label="Langue des SMS d’alerte" hint={WOLOF_SMS_RELU ? "Les alertes vous arrivent par SMS dans cette langue." : "Les SMS en wolof sont en cours de relecture. En attendant, vous les recevez en français."} className="sm:col-span-2">
              <Select {...form.register("locale")}>
                <option value="fr">Français</option>
                <option value="wo">Wolof</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
                Enregistrer le profil
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
      {m && (
        <Card className="h-fit p-5">
          <p className="text-[13px] text-ink-3">Organisation</p>
          <p className="font-display text-lg font-semibold">{m.org.name}</p>
          <p className="mt-1 text-sm text-ink-2">Votre rôle : {ORG_ROLE_LABEL[m.role]}</p>
          <p className="mt-3 text-[13px] text-ink-3">Modules : {m.org.modules.map((x) => (x === "agritech" ? "AgriTech" : "Onion")).join(", ")}</p>
        </Card>
      )}
    </div>
  );
}

function Security() {
  const { data } = useSession();
  const qc = useQueryClient();
  const form = useForm<z.input<typeof changePasswordSchema>>({ resolver: zodResolver(changePasswordSchema), defaultValues: { current: "", password: "", confirm: "" } });
  const pw = form.watch("password");
  const change = useMutation({
    mutationFn: api.auth.password,
    onSuccess: () => {
      toast.success("Mot de passe modifié. Vos autres appareils devront se reconnecter.");
      form.reset();
    },
    onError: (e) => applyFieldErrors(e, (k, m) => form.setError(k as "current", { message: m })),
  });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: api.auth.sessions });
  const revoke = useMutation({
    mutationFn: api.auth.revokeSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Appareil déconnecté.");
    },
  });
  const e = form.formState.errors;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader title="Mot de passe" subtitle="12 caractères au moins. Une phrase facile à retenir fonctionne très bien." />
        <CardBody>
          <form noValidate className="flex max-w-md flex-col gap-4" onSubmit={form.handleSubmit((v) => change.mutate(v as z.infer<typeof changePasswordSchema>))}>
            <FormError>{change.isError && !(change.error instanceof ApiError && change.error.status === 422) ? change.error.message : null}</FormError>
            <Field label="Mot de passe actuel" error={e.current?.message} hint={IS_DEMO ? "Démo : Demo-SaytuMbay-2026" : undefined}>
              <PasswordInput autoComplete="current-password" {...form.register("current")} />
            </Field>
            <Field label="Nouveau mot de passe" error={e.password?.message}>
              <PasswordInput autoComplete="new-password" {...form.register("password")} />
            </Field>
            <PasswordStrength value={pw} />
            <Field label="Confirmer le nouveau mot de passe" error={e.confirm?.message}>
              <PasswordInput autoComplete="new-password" {...form.register("confirm")} />
            </Field>
            <Button type="submit" loading={change.isPending} icon={<KeyRound className="size-4" aria-hidden />} className="self-start">
              Changer le mot de passe
            </Button>
          </form>
        </CardBody>
      </Card>
      <div className="flex flex-col gap-6">
        <TwoFactor enabled={!!data?.user.twoFactorEnabled} required={data?.user.platformRole !== "aucun"} />
        <Card>
          <CardHeader title="Appareils connectés" subtitle="Déconnectez un appareil perdu ou partagé." />
          <CardBody className="pt-2">
            <ul className="divide-y divide-line">
              {sessions.data?.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  {s.device.includes("Téléphone") ? <Smartphone className="size-5 text-ink-3" aria-hidden /> : <Monitor className="size-5 text-ink-3" aria-hidden />}
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold">
                      {s.device} {s.current && <span className="ml-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] text-brand-strong dark:text-brand">Cet appareil</span>}
                    </p>
                    <p className="text-[12.5px] text-ink-3">
                      {s.ip} · actif {fmt.ago(s.lastSeenAt)}
                    </p>
                  </div>
                  {!s.current && (
                    <Button size="sm" variant="ghost" icon={<LogOut className="size-4" aria-hidden />} loading={revoke.isPending} onClick={() => revoke.mutate(s.id)}>
                      Déconnecter
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function TwoFactor({ enabled, required }: { enabled: boolean; required: boolean }) {
  const qc = useQueryClient();
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const start = useMutation({ mutationFn: api.auth.totpSetup, onSuccess: setSetup });
  const enable = useMutation({
    mutationFn: () => api.auth.totpEnable(code),
    onSuccess: (r) => {
      setCodes(r.recoveryCodes);
      setSetup(null);
      qc.invalidateQueries({ queryKey: ["session"] });
      toast.success("Double authentification activée.");
    },
  });
  useEffect(() => {
    if (setup) QRCode.toDataURL(setup.otpauth, { margin: 1, width: 200, color: { dark: "#0e1f18", light: "#ffffff" } }).then(setQr);
  }, [setup]);
  return (
    <Card>
      <CardHeader title="Double authentification" subtitle="Un code à 6 chiffres depuis une application (Google Authenticator, Aegis…) en plus du mot de passe." />
      <CardBody className="flex flex-col gap-4">
        {enabled && !codes && (
          <Callout tone="success" icon={<ShieldCheck className="size-4" aria-hidden />} title="Activée">
            Un code vous est demandé à chaque nouvelle connexion.
          </Callout>
        )}
        {!enabled && required && <Callout tone="warn">Obligatoire pour l’équipe saytumbay : la console donne accès aux données de tous les clients.</Callout>}
        {!enabled && !setup && (
          <Button className="self-start" loading={start.isPending} icon={<ShieldCheck className="size-4" aria-hidden />} onClick={() => start.mutate()}>
            Activer la double authentification
          </Button>
        )}
        {setup && (
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="shrink-0 rounded-xl border border-line bg-white p-2">{qr ? <img src={qr} alt="QR code à scanner avec l’application d’authentification" width={180} height={180} /> : <div className="size-[180px]" />}</div>
            <div className="flex flex-col gap-3">
              <ol className="list-decimal pl-5 text-sm text-ink-2">
                <li>Scannez le QR code avec l’application.</li>
                <li>Ou saisissez la clé : <code className="rounded bg-surface-2 px-1.5 py-0.5 text-[13px]">{setup.secret}</code></li>
                <li>Entrez le code affiché.</li>
              </ol>
              <Field label="Code à 6 chiffres" hint={IS_DEMO ? "Démo : 246810" : undefined} error={enable.isError ? (enable.error instanceof ApiError ? "Code incorrect" : enable.error.message) : undefined}>
                <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="max-w-40 tracking-[0.3em]" />
              </Field>
              <Button className="self-start" disabled={code.length !== 6} loading={enable.isPending} onClick={() => enable.mutate()}>
                Confirmer et activer
              </Button>
            </div>
          </div>
        )}
        {codes && (
          <div>
            <Callout tone="warn" title="Notez ces codes de secours maintenant">
              Chacun permet une connexion si vous perdez votre téléphone. Ils ne seront plus affichés.
            </Callout>
            <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
              {codes.map((c) => (
                <li key={c} className="rounded-md bg-surface-2 px-3 py-1.5 text-center tabular">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Notifications() {
  const m = useActiveMembership();
  const [n, setN] = useState(m?.notify ?? { sms: true, email: false, push: true });
  const save = useMutation({ mutationFn: api.auth.notifications, onSuccess: () => toast.success("Préférences d’alerte enregistrées.") });
  const set = (k: keyof typeof n, v: boolean) => {
    const next = { ...n, [k]: v };
    setN(next);
    save.mutate(next);
  };
  return (
    <Card className="max-w-2xl">
      <CardHeader title="Comment être prévenu" subtitle="Les alertes critiques partent toujours par SMS au responsable, même si vous désactivez ce canal pour vous." />
      <CardBody className="flex flex-col gap-5">
        <Switch label="SMS" description="Fonctionne sur un téléphone simple, sans internet. Recommandé." checked={n.sms} onCheckedChange={(v) => set("sms", v)} />
        <Switch label="E-mail" description="Récapitulatif des alertes et des rapports, dès que l’envoi d’e-mails sera activé pour votre organisation." checked={n.email} onCheckedChange={(v) => set("email", v)} />
        <Switch label="Notifications de l’application" description="Sur ce téléphone, si l’application est installée." checked={n.push} onCheckedChange={(v) => set("push", v)} />
      </CardBody>
    </Card>
  );
}

function Appearance() {
  const { pref, setPref } = useTheme();
  const opts = [
    { v: "clair" as const, l: "Clair", d: "Lisible en plein soleil", I: Sun },
    { v: "sombre" as const, l: "Sombre", d: "Confortable la nuit, au magasin", I: Moon },
    { v: "systeme" as const, l: "Comme l’appareil", d: "Suit le réglage du téléphone", I: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label="Thème" className="grid max-w-3xl gap-3 sm:grid-cols-3">
      {opts.map((o) => (
        <button key={o.v} role="radio" aria-checked={pref === o.v} onClick={() => setPref(o.v)} className={cn("flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-colors", pref === o.v ? "border-brand bg-brand-soft/50" : "border-line hover:border-line-strong")}>
          <o.I className="size-5" aria-hidden />
          <span className="font-display font-semibold">{o.l}</span>
          <span className="text-[13px] text-ink-3">{o.d}</span>
        </button>
      ))}
    </div>
  );
}

function DataRights() {
  const { data } = useSession();
  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exporteLe: new Date().toISOString(), compte: data?.user, organisations: data?.memberships.map((m) => ({ organisation: m.org.name, role: m.role, notifications: m.notify })) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mes-donnees-saytumbay.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader title="Vos droits" subtitle="Loi sénégalaise n° 2008-12 sur la protection des données personnelles." />
        <CardBody className="flex flex-col gap-4 text-sm text-ink-2">
          <p>Vous pouvez consulter, corriger, exporter ou faire supprimer vos données personnelles. Les mesures des capteurs appartiennent à votre organisation et restent dans son espace.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Download className="size-4" aria-hidden />} onClick={exportData}>
              Télécharger mes données
            </Button>
            <Confirm
              trigger={<Button variant="ghost">Demander la suppression de mon compte</Button>}
              title="Demander la suppression de votre compte ?"
              description="Votre demande est transmise à saytumbay. Le compte est supprimé sous 30 jours ; l’historique des actions de votre organisation est anonymisé."
              confirmLabel="Envoyer la demande"
              onConfirm={() => {
                toast.success("Demande envoyée. Vous recevrez une confirmation par SMS.");
              }}
            />
          </div>
          <p className="text-[13px] text-ink-3">
            Une question ? Écrivez à <a className="text-brand hover:underline" href="mailto:donnees@saytumbay.com">donnees@saytumbay.com</a>. Détails dans la{" "}
            <a className="text-brand hover:underline" href="/confidentialite">
              politique de confidentialité
            </a>
            .
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
