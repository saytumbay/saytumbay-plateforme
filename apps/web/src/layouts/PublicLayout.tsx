import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { Mail, Menu, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { SocialLinks } from "@/components/brand/SocialIcons";
import { Sheet } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";

/** Numéro WhatsApp principal du site (celui d'Ibrahima Fall, directeur technique). */
export const WHATSAPP = { name: "Ibrahima Fall", display: "77 833 57 81", href: "https://wa.me/221778335781?text=" + encodeURIComponent("Bonjour SaytuMbay, je souhaite en savoir plus sur vos capteurs.") };
/** Adresses e-mail de l'équipe (actives). */
export const EMAIL = { contact: "contact@saytumbay.com", tidiane: "tidianesow@saytumbay.com", ibrahima: "ibrahimafall@saytumbay.com" };
/** Ligne directe de Tidiane Sow, directeur général (WhatsApp). */
export const TIDIANE = { name: "Tidiane Sow", display: "77 088 94 08", href: "https://wa.me/221770889408?text=" + encodeURIComponent("Bonjour Tidiane, je souhaite en savoir plus sur les capteurs SaytuMbay.") };
/** Comptes officiels sur les réseaux sociaux (confirmés par l'équipe ; sur Instagram, l'identifiant est saytumbay.officiel). */
export const SOCIAL = [
  { name: "LinkedIn", href: "https://www.linkedin.com/company/saytumbay/" },
  { name: "Instagram", href: "https://www.instagram.com/saytumbay.officiel" },
  { name: "TikTok", href: "https://www.tiktok.com/@saytumbay" },
  { name: "X", href: "https://x.com/SaytuMbay" },
];

const NAV = [
  { to: "/", label: "Accueil", end: true },
  { to: "/solutions", label: "Solutions" },
  { to: "/a-propos", label: "À propos" },
  { to: "/contact", label: "Contact" },
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
    // Nouvelle page : on repart du haut sans animation (le défilement doux est réservé aux ancres).
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [hash, pathname]);
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>
      <PublicHeader />
      <main id="contenu" className="flex-1">
        {/* Changement de page : fondu court (rien si les animations sont réduites). */}
        <div key={pathname} className="page-in">
          <Outlet />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [loc.pathname, loc.hash]);
  return (
    <header className={cn("sticky top-0 z-40 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out", scrolled ? "border-b border-line bg-surface/85 backdrop-blur-md" : "border-b border-transparent bg-bg")}>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 sm:px-6 lg:h-[72px]">
        <Link to="/" className="rounded-md" aria-label="SaytuMbay, accueil">
          <Logo height={46} />
        </Link>
        <nav aria-label="Navigation principale" className="ml-auto hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => cn("rounded-md px-3.5 py-2 text-[15px] font-medium hover:bg-surface-2 hover:text-ink", isActive ? "font-semibold text-ink" : "text-ink-2")}
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button type="button" onClick={() => setOpen(true)} className="ml-auto flex size-10 items-center justify-center rounded-lg text-ink hover:bg-surface-2 md:hidden" aria-label="Ouvrir le menu" aria-expanded={open}>
          <Menu className="size-5" aria-hidden />
        </button>
      </div>
      <Sheet open={open} onOpenChange={setOpen} title="Menu">
        <nav aria-label="Navigation mobile">
          <ul className="flex flex-col">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end} className="block rounded-lg px-3 py-3 font-display text-lg font-semibold hover:bg-surface-2 aria-[current=page]:text-brand">
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-6">
          {[TIDIANE, WHATSAPP].map((c) => (
            <a key={c.display} href={c.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-[15px] font-semibold text-brand hover:bg-brand-soft">
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
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Logo height={44} tagline />
          <p className="mt-4 text-[14px] text-ink-3">Dakar, Sénégal</p>
          <h2 className="mt-8 font-display text-[14px] font-semibold">Suivez-nous</h2>
          <SocialLinks links={SOCIAL} className="mt-3" />
        </div>
        <FooterCol
          title="Solutions"
          links={[
            { to: "/solutions#champs", label: "Solution 1 · Les champs" },
            { to: "/solutions#stockage", label: "Solution 2 · Le stockage" },
            { to: "/a-propos", label: "À propos" },
            { to: "/a-propos#faq", label: "Questions fréquentes" },
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
          <h2 className="font-display text-[14px] font-semibold">Nous contacter</h2>
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
              <Link to="/contact" className="hover:text-ink">
                Formulaire de contact
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-5 text-[13px] text-ink-3 sm:px-6">
          <p>© {new Date().getFullYear()} SaytuMbay. Tous droits réservés.</p>
          <p>Conçu à Dakar, Sénégal</p>
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
