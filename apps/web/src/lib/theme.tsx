import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePref = "clair" | "sombre" | "systeme";
const KEY = "saytumbay:theme";

const Ctx = createContext<{ pref: ThemePref; dark: boolean; setPref: (p: ThemePref) => void }>({ pref: "systeme", dark: false, setPref: () => {} });

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "clair" || v === "sombre" ? v : "systeme";
  } catch {
    return "systeme";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(read);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const dark = pref === "sombre" || (pref === "systeme" && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute("content", dark ? "#0A1612" : "#0F6B45");
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
