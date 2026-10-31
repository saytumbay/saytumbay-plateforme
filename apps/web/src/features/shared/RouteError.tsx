import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

/** Erreur inattendue : message clair, deux sorties (recharger, revenir à l'accueil), aucun détail technique affiché. */
export function RouteError() {
  const err = useRouteError();
  const chunk = err instanceof Error && /dynamically imported module|Loading chunk|Failed to fetch/i.test(err.message);
  const notFound = isRouteErrorResponse(err) && err.status === 404;
  if (import.meta.env.DEV) console.error(err);
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="max-w-md text-center">
        <LogoMark size={52} className="mx-auto" />
        <h1 className="mt-6 text-2xl font-semibold">{notFound ? "Page introuvable" : chunk ? "Une nouvelle version est disponible" : "Cette page n’a pas pu s’afficher"}</h1>
        <p className="mt-2 text-ink-2">
          {chunk ? "Rechargez la page pour récupérer la dernière version de SaytuMbay." : notFound ? "L’adresse a peut-être changé." : "L’incident a été noté. Rechargez la page ; si le problème continue, revenez à l’accueil."}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => window.location.reload()}>Recharger la page</Button>
          <Link to="/" className="inline-flex h-11 items-center rounded-lg px-4 font-display text-sm font-semibold text-ink-2 hover:bg-surface-2">
            Revenir à l’accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
