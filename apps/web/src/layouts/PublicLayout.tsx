import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { Mail, Menu, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { useSession, homeFor } from "@/lib/auth";
import { cn } from "@/lib/cn";

/** Numéro WhatsApp principal du site (celui d'Ibrahima Fall, directeur technique). */
export const WHATSAPP = { name: "Ibrahima Fall", display: "77 833 57 81", href: "https://wa.me/221778335781?text=" + encodeURIComponent("Bonjour SaytuMbay, je souhaite en savoir plus sur vos capteurs.") };
/** Adresses e-mail de l'équipe (actives). */
export const EMAIL = { contact: "contact@saytumbay.com", tidiane: "tidianesow@saytumbay.com", ibrahima: "ibrahimafall@saytumbay.com" };
/** Ligne directe de Tidiane Sow, directeur général (WhatsApp). */
export const TIDIANE = { name: "Tidiane Sow", display: "77 088 94 08", href: "https://wa.me/221770889408?text=" + encodeURIComponent("Bonjour Tidiane, je souhaite en savoir plus sur les capteurs SaytuMbay.") };

const NAV = [
  { to: "/#methode", label: "Méthode" },
  { to: "/#agritech", label: "Solutions" },
  { to: "/#etat", label: "Où nous en sommes" },
  { to: "/#ensemble", label: "Partenaires" },
  { to: "/#equipe", label: "Équipe" },
];

export function PublicLayout() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [hash, pathname]);
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>
      <PublicHeader />
      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();
  const loc = useLocation();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [loc.pathname, loc.hash]);
  return (
    <header className={cn("sticky top-0 z-40 transition-[background-color,border-color,box-shadow] duration-200", scrolled ? "border-b border-line bg-surface" : "border-b border-transparent bg-bg")}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6 lg:h-[72px]">
        <Link to="/" className="rounded-md" aria-label="SaytuMbay, accueil">
          <Logo height={32} />
        </Link>
        <nav aria-label="Navigation principale" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="rounded-md px-3 py-2 text-[15px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <ButtonLink to={homeFor(session)} variant="secondary" className="hidden sm:inline-flex">
              Ouvrir mon espace
            </ButtonLink>
          ) : (
            <NavLink to="/connexion" className="hidden rounded-md px-3 py-2 text-[15px] font-semibold text-ink hover:bg-surface-2 sm:block">
              Se connecter
            </NavLink>
          )}
          <ButtonLink to="/#contact" className="hidden sm:inline-flex">
            Nous écrire
          </ButtonLink>
          <button type="button" onClick={() => setOpen(true)} className="flex size-10 items-center justify-center rounded-lg text-ink hover:bg-surface-2 lg:hidden" aria-label="Ouvrir le menu" aria-expanded={open}>
            <Menu className="size-5" aria-hidden />
          </button>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="Menu">
        <nav aria-label="Navigation mobile">
          <ul className="flex flex-col">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="block rounded-lg px-3 py-3 font-display text-lg font-semibold hover:bg-surface-2">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6">
          <ButtonLink to="/#contact" size="lg">
            Nous écrire
          </ButtonLink>
          <ButtonLink to={session ? homeFor(session) : "/connexion"} variant="secondary" size="lg">
            {session ? "Ouvrir mon espace" : "Se connecter"}
          </ButtonLink>
          {[TIDIANE, WHATSAPP].map((c, i) => (
            <a key={c.display} href={c.href} target="_blank" rel="noopener noreferrer" className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-[15px] font-semibold text-brand hover:bg-brand-soft", i === 0 && "mt-2")}>
              <MessageCircle className="size-[18px]" aria-hidden /> {c.name} · <span className="font-mono text-[14px]">{c.display}</span>
            </a>
          ))}
        </div>
      </Sheet>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo height={34} tagline />
          <p className="mt-4 max-w-[34ch] text-[14.5px] leading-relaxed text-ink-2">Capteurs connectés, alertes SMS et tableau de bord pour l’agriculture et le stockage. Startup de Dakar, premiers sites pilotes en préparation.</p>
          <p className="mt-4 text-[14px] text-ink-3">Dakar, Sénégal</p>
        </div>
        <FooterCol
          title="Produit"
          links={[
            { to: "/#agritech", label: "SaytuMbay AgriTech" },
            { to: "/#onion", label: "SaytuMbay Onion" },
            { to: "/#methode", label: "Notre méthode" },
            { to: "/connexion", label: "Se connecter" },
          ]}
        />
        <FooterCol
          title="Informations"
          links={[
            { to: "/mentions-legales", label: "Mentions légales" },
            { to: "/confidentialite", label: "Confidentialité" },
            { to: "/conditions", label: "Conditions d’utilisation" },
            { to: "/cookies", label: "Cookies" },
            { to: "/securite", label: "Sécurité" },
          ]}
        />
        <div>
          <h2 className="font-display text-[14px] font-semibold">Nous joindre</h2>
          <ul className="mt-3 flex flex-col gap-2.5 text-[14.5px] text-ink-2">
            {[TIDIANE, WHATSAPP].map((c) => (
              <li key={c.display}>
                <a href={c.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-ink">
                  <MessageCircle className="size-4 shrink-0" aria-hidden />
                  <span>
                    {c.name} <span className="whitespace-nowrap font-mono text-[13.5px]">{c.display}</span>
                  </span>
                </a>
              </li>
            ))}
            <li>
              <a href={`mailto:${EMAIL.contact}`} className="inline-flex items-center gap-2 hover:text-ink">
                <Mail className="size-4 shrink-0" aria-hidden /> {EMAIL.contact}
              </a>
            </li>
            <li>
              <Link to="/#contact" className="hover:text-ink">
                Formulaire de contact
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-[13px] text-ink-3 sm:px-6">
          <p>© {new Date().getFullYear()} SaytuMbay. Tous droits réservés.</p>
          <p>Conçu et fabriqué à Dakar, Sénégal</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<{ to: string; label: string }> }) {
  return (
    <div>
      <h2 className="font-display text-[14px] font-semibold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2.5 text-[14.5px] text-ink-2">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="hover:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
