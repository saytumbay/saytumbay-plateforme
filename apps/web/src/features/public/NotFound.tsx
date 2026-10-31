import { Link } from "react-router";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/button";
import { usePageTitle } from "@/components/ui/page";
import { useSession, homeFor } from "@/lib/auth";

export default function NotFound() {
  usePageTitle("Page introuvable");
  const { data } = useSession();
  return (
    <div className="flex min-h-dvh flex-col bg-bg px-5 py-6 sm:px-10">
      <Link to="/" className="self-start rounded-md" aria-label="SaytuMbay, accueil">
        <Logo height={32} />
      </Link>
      <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center py-16">
        <p className="font-display text-[15px] font-semibold text-ink-3">Erreur 404</p>
        <h1 className="mt-2 font-display text-[clamp(32px,5vw,44px)] font-semibold leading-tight tracking-tight">Cette page n’existe pas, ou plus.</h1>
        <p className="mt-4 text-[16.5px] leading-relaxed text-ink-2">Le lien est peut-être incomplet, ou la page a été déplacée. Vérifiez l’adresse, ou repartez d’un endroit connu.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {data ? (
            <ButtonLink to={homeFor(data)} size="lg">
              Ouvrir mon espace
            </ButtonLink>
          ) : (
            <ButtonLink to="/" size="lg">
              Retour à l’accueil
            </ButtonLink>
          )}
          <ButtonLink to={data ? "/" : "/connexion"} variant="secondary" size="lg">
            {data ? "Voir le site" : "Se connecter"}
          </ButtonLink>
        </div>
      </main>
    </div>
  );
}
