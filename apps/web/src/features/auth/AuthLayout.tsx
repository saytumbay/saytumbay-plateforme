import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo } from "@/components/brand/Logo";
import { FieldPlan, DEMO_PLAN } from "@/components/brand/FieldPlan";
import { IS_DEMO } from "@/lib/api";

/**
 * Gabarit des pages d'accès : formulaire à gauche, plan de l'exploitation à droite (écrans larges).
 * Sur téléphone, seul le formulaire reste : rien ne doit retarder la connexion sur une 3G de bord de champ.
 */
export function AuthLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <a href="#contenu" className="skip-link">
        Aller au formulaire
      </a>
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <Link to="/" className="rounded-md" aria-label="SaytuMbay, retour à l’accueil">
            <Logo height={34} />
          </Link>
          <Link to="/" className="rounded-md px-2 py-1.5 text-sm font-medium text-ink-2 hover:text-ink">
            Retour au site
          </Link>
        </header>
        <main id="contenu" className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          {children}
        </main>
        <footer className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-3">
          <Link to="/confidentialite" className="hover:text-ink">
            Confidentialité
          </Link>
          <Link to="/securite" className="hover:text-ink">
            Sécurité
          </Link>
          <Link to="/conditions" className="hover:text-ink">
            Conditions
          </Link>
          <span className="ml-auto">© {new Date().getFullYear()} SaytuMbay, Dakar</span>
        </footer>
      </div>
      <aside className="relative hidden overflow-hidden bg-[#0b1a14] text-[#eaf3ee] lg:flex lg:flex-col" aria-label="Aperçu de l’exploitation de démonstration">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_60%_45%,rgba(43,212,125,0.10),transparent_70%)]" aria-hidden />
        {aside ?? <PlanAside />}
      </aside>
    </div>
  );
}

function PlanAside() {
  return (
    <div className="relative flex flex-1 flex-col justify-between gap-8 p-12 xl:p-16">
      <div className="flex items-center gap-3 text-[13px] text-[#a9bdb2]">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#2bd47d] opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-[#2bd47d]" />
        </span>
        Exploitation de Mboro · 6 parcelles · relevé toutes les 15 minutes{IS_DEMO ? " (simulé)" : ""}
      </div>
      <div className="mx-auto w-full max-w-[560px]">
        <FieldPlan parcels={DEMO_PLAN} palette="night" />
      </div>
      <div className="max-w-[460px]">
        <p className="font-display text-[22px] font-semibold leading-snug tracking-tight text-white">La parcelle B est à 18 %. Le SMS est déjà parti.</p>
        <p className="mt-3 text-[15px] leading-relaxed text-[#a9bdb2]">Des sondes enterrées à 20 cm mesurent l’humidité du sol. Quand une parcelle passe sous son seuil, la personne responsable reçoit une alerte, même sans internet.</p>
        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-[#c9d8cf]" aria-label="Légende">
          <Legend color="#f0b642" label="À irriguer" />
          <Legend color="#2bd47d" label="Bonne humidité" />
          <Legend color="#4fd8ef" label="Trop humide" />
          <Legend color="#8c968f" label="Capteur hors ligne" dashed />
        </ul>
      </div>
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <li className="inline-flex items-center gap-2">
      <svg width="14" height="14" aria-hidden>
        <rect x="1" y="1" width="12" height="12" rx="3" fill={color} fillOpacity={dashed ? 0.08 : 0.25} stroke={color} strokeWidth="1.4" strokeDasharray={dashed ? "3 2" : undefined} />
      </svg>
      {label}
    </li>
  );
}

export function AuthTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight">{title}</h1>
      {children && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{children}</p>}
    </div>
  );
}
