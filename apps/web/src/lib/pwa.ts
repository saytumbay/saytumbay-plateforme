import { toast } from "sonner";

/** Application installable et consultable hors ligne. Une nouvelle version est proposée, jamais imposée. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const update = registerSW({
        onNeedRefresh() {
          toast("Une nouvelle version de SaytuMbay est disponible.", {
            duration: Infinity,
            action: { label: "Mettre à jour", onClick: () => update(true) },
          });
        },
        onOfflineReady() {
          // Utile à un membre connecté, sans intérêt pour un visiteur du site public.
          if (/^\/(app|admin)/.test(location.pathname)) toast.success("SaytuMbay est prêt à fonctionner hors ligne.");
        },
      });
    })
    .catch(() => {
      /* pas de service worker : le site fonctionne normalement */
    });
}
