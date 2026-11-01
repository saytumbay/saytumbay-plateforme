/**
 * Apparition douce au défilement : tout élément `data-reveal` reçoit `data-shown` en entrant dans l'écran
 * (une seule fois). L'effet (fondu + 14 px) est en CSS, et nul si l'utilisateur réduit les animations.
 * `data-reveal="2"` décale l'apparition (×80 ms) pour échelonner une rangée de cartes.
 */
import { useEffect } from "react";
import { useLocation } from "react-router";

export function useReveal() {
  const { pathname } = useLocation();
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-shown])")];
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const el of els) el.dataset.shown = "";
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          const step = Number(el.dataset.reveal) || 0;
          if (step) el.style.transitionDelay = `${step * 80}ms`;
          el.dataset.shown = "";
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [pathname]);
}
