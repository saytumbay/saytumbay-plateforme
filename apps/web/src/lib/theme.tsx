import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePref = "clair" | "sombre" | "systeme";
const KEY = "saytumbay:theme";

/** Seuls l'espace client et la console suivent le thème choisi ; le site public reste clair (même règle que public/theme-init.js). */
export const isThemable = (pathname: string) => /^\/(app|admin)(\/|$)/.test(pathname);

const Ctx = createContext<{ pref: ThemePref; dark: boolean; setPref: (p: ThemePref) => void }>({ pref: "systeme", dark: false, setPref: () => {} });

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "clair" || v === "sombre" ? v : "systeme";
  } catch {
    return "systeme";
  }
}

/** `subscribe` : prévient le fournisseur à chaque changement de page (branché sur le routeur dans main.tsx). */
export function ThemeProvider({ children, subscribe }: { children: ReactNode; subscribe: (onPath: (pathname: string) => void) => () => void }) {
  const [pref, setPrefState] = useState<ThemePref>(read);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const [themable, setThemable] = useState(() => isThemable(window.location.pathname));
  useEffect(() => subscribe((p) => setThemable(isThemable(p))), [subscribe]);
  const dark = themable && (pref === "sombre" || (pref === "systeme" && systemDark));
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute("content", dark ? "#08231B" : "#0F5A44");
  }, [dark]);
  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    try {
      if (p === "systeme") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, p);
    } catch {
      /* stockage indisponible */
    }
  }, []);
  return <Ctx.Provider value={{ pref, dark, setPref }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
