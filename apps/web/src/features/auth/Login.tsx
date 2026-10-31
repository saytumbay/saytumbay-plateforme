import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowLeft, Building2, HardHat, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { loginSchema, type SessionUser } from "@saytumbay/shared";
import { api, ApiError, IS_DEMO } from "@/lib/api";
import { homeFor, safeNext, useSession, useSetSession } from "@/lib/auth";
import { usePageTitle } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormError, Input, PasswordInput } from "@/components/ui/form";
import { Splash } from "@/components/brand/Splash";
import { AuthLayout, AuthTitle } from "./AuthLayout";

type LoginForm = z.input<typeof loginSchema>;

export default function Login() {
  usePageTitle("Connexion");
  const { data: session, isPending } = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useSetSession();
  const [challenge, setChallenge] = useState<{ id: string; email: string } | null>(null);
  const done = (s: SessionUser) => {
    setSession(s);
    navigate(safeNext(params.get("suite")) ?? homeFor(s), { replace: true });
  };
  if (isPending) return <Splash />;
  if (session && !challenge) return <Navigate to={safeNext(params.get("suite")) ?? homeFor(session)} replace />;
  return (
    <AuthLayout>
      {/* Changement d'étape : courte entrée latérale en CSS (désactivée si l'utilisateur réduit les animations). */}
      {challenge ? (
        <div key="totp" className="animate-step-in">
          <TotpStep challenge={challenge} onBack={() => setChallenge(null)} onDone={done} />
        </div>
      ) : (
        <div key="login" className="animate-step-in">
          <CredentialsStep onTotp={setChallenge} onDone={done} notice={params.get("motif")} />
        </div>
      )}
    </AuthLayout>
  );
}

const NOTICES: Record<string, string> = {
  session: "Votre session a expiré. Reconnectez-vous pour continuer.",
  reinitialise: "Mot de passe modifié. Connectez-vous avec le nouveau.",
  deconnecte: "Vous êtes déconnecté.",
};

function CredentialsStep({ onTotp, onDone, notice }: { onTotp: (c: { id: string; email: string }) => void; onDone: (s: SessionUser) => void; notice: string | null }) {
  const form = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "", remember: false }, mode: "onBlur", reValidateMode: "onChange" });
  const login = useMutation({
    mutationFn: (v: LoginForm) => api.auth.login(loginSchema.parse(v)),
    meta: { silent: true },
    onSuccess: (r, v) => (r.status === "totp" ? onTotp({ id: r.challengeId, email: v.email }) : onDone(r.session)),
    onError: () => form.setFocus("password"),
  });
  const demo = useMutation({ mutationFn: api.auth.demo, meta: { silent: true }, onSuccess: onDone });
  const e = form.formState.errors;
  const err = login.error ?? demo.error;
  return (
    <>
      <AuthTitle title="Se connecter">Retrouvez vos parcelles, vos magasins et vos alertes.</AuthTitle>
      {notice && NOTICES[notice] && (
        <p role="status" className="mb-5 rounded-lg bg-brand-soft px-3.5 py-3 text-sm text-brand-strong dark:text-brand">
          {NOTICES[notice]}
        </p>
      )}
      <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((v) => login.mutate(v))}>
        <FormError>{err ? (err instanceof ApiError && err.status >= 500 ? "Le service ne répond pas. Réessayez dans un instant." : err.message) : null}</FormError>
        <Field label="Adresse e-mail" error={e.email?.message}>
          <Input type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} autoFocus {...form.register("email")} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <Field label="Mot de passe" error={e.password?.message}>
            <PasswordInput autoComplete="current-password" {...form.register("password")} />
          </Field>
          <Link to="/mot-de-passe-oublie" className="self-end rounded text-[13px] font-medium text-brand underline-offset-2 hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <Controller control={form.control} name="remember" render={({ field }) => <Checkbox checked={!!field.value} onCheckedChange={field.onChange} label="Rester connecté 30 jours sur cet appareil" />} />
        <Button type="submit" size="lg" className="mt-1 w-full" loading={login.isPending}>
          Se connecter
        </Button>
      </form>

      {IS_DEMO && (
        <section aria-labelledby="demo-title" className="mt-9 border-t border-line pt-7">
          <h2 id="demo-title" className="font-display text-[15px] font-semibold">
            Explorer la démo sans compte
          </h2>
          <p className="mt-1 text-[13.5px] text-ink-3">Données simulées. Choisissez un point de vue :</p>
          <div className="mt-4 grid gap-2">
            {(
              [
                ["responsable", Building2, "Responsable de coopérative", "Awa Ndiaye, Coopérative de Thiès"],
                ["technicien", HardHat, "Technicien terrain", "Ibou Faye, capteurs et maintenance"],
                ["admin", ShieldCheck, "Équipe SaytuMbay", "Console : clients, parc, facturation"],
              ] as const
            ).map(([p, Icon, t, s]) => (
              <button key={p} type="button" disabled={demo.isPending} onClick={() => demo.mutate(p)} className="group flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 text-left transition-colors hover:border-brand/50 hover:bg-brand-soft/50 disabled:opacity-60">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2 group-hover:bg-surface group-hover:text-brand">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-semibold">{t}</span>
                  <span className="block truncate text-[12.5px] text-ink-3">{s}</span>
                </span>
              </button>
            ))}
          </div>
          <details className="mt-4 text-[13px] text-ink-3">
            <summary className="cursor-pointer rounded font-medium text-ink-2 hover:text-ink">Tester le formulaire et la double authentification</summary>
            <p className="mt-2 leading-relaxed">
              Tout compte en <code className="rounded bg-surface-2 px-1">@demo.saytumbay.com</code> (par exemple <code className="rounded bg-surface-2 px-1">mame.sow@demo.saytumbay.com</code>) avec le mot de passe <code className="rounded bg-surface-2 px-1">Demo-SaytuMbay-2026</code>. Code à 6 chiffres : <code className="rounded bg-surface-2 px-1">246810</code>. Cinq erreurs bloquent le compte 15 minutes.
            </p>
          </details>
        </section>
      )}
      <p className="mt-8 text-sm text-ink-2">
        Pas encore client ?{" "}
        <Link to="/#contact" className="font-semibold text-brand underline-offset-2 hover:underline">
          Demander une démonstration sur le terrain
        </Link>
      </p>
    </>
  );
}

function TotpStep({ challenge, onBack, onDone }: { challenge: { id: string; email: string }; onBack: () => void; onDone: (s: SessionUser) => void }) {
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const verify = useMutation({
    mutationFn: (c: string) => api.auth.totp({ challengeId: challenge.id, code: c }),
    meta: { silent: true },
    onSuccess: onDone,
    onError: () => {
      setCode("");
      ref.current?.focus();
    },
  });
  useEffect(() => ref.current?.focus(), [recovery]);
  const valid = recovery ? /^\d{4}-\d{4}$/.test(code) : /^\d{6}$/.test(code);
  const submit = (c: string) => (recovery ? /^\d{4}-\d{4}$/.test(c) : /^\d{6}$/.test(c)) && !verify.isPending && verify.mutate(c);
  const onChange = (raw: string) => {
    if (recovery) {
      const d = raw.replace(/\D/g, "").slice(0, 8);
      setCode(d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d);
      return;
    }
    const v = raw.replace(/\D/g, "").slice(0, 6);
    setCode(v);
    if (v.length === 6) submit(v);
  };
  return (
    <>
      <button type="button" onClick={onBack} className="-ml-2 mb-6 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Changer de compte
      </button>
      <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand-strong dark:text-brand">
        {recovery ? <KeyRound className="size-6" aria-hidden /> : <Smartphone className="size-6" aria-hidden />}
      </div>
      <AuthTitle title={recovery ? "Code de secours" : "Vérification en deux étapes"}>
        {recovery ? (
          <>Saisissez un des codes de secours notés lors de l’activation. Chaque code ne sert qu’une fois.</>
        ) : (
          <>
            Saisissez le code à 6 chiffres affiché par votre application d’authentification pour <strong className="font-semibold text-ink">{challenge.email}</strong>.
          </>
        )}
      </AuthTitle>
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          submit(code);
        }}
      >
        <FormError>{verify.error?.message}</FormError>
        <Field label={recovery ? "Code de secours" : "Code de vérification"} hint={recovery ? "Format 1234-5678" : IS_DEMO ? "Démo : 246810" : "Le code change toutes les 30 secondes."}>
          <Input
            key={recovery ? "r" : "t"}
            ref={ref}
            value={code}
            onChange={(ev) => onChange(ev.target.value)}
            inputMode="numeric"
            autoComplete={recovery ? "off" : "one-time-code"}
            maxLength={recovery ? 9 : 6}
            className="h-14 text-center font-display text-[26px] font-semibold tracking-[0.4em] tabular"
          />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={verify.isPending} disabled={!valid}>
          Vérifier
        </Button>
      </form>
      <button
        type="button"
        onClick={() => {
          setRecovery((r) => !r);
          setCode("");
          verify.reset();
        }}
        className="mt-5 rounded text-sm font-medium text-brand underline-offset-2 hover:underline"
      >
        {recovery ? "Utiliser l’application d’authentification" : "Téléphone indisponible ? Utiliser un code de secours"}
      </button>
      <p className="mt-4 text-[13.5px] leading-relaxed text-ink-3">Plus de codes de secours ? L’équipe SaytuMbay vérifie votre identité au 77 833 57 81 avant de réinitialiser la double authentification.</p>
    </>
  );
}
