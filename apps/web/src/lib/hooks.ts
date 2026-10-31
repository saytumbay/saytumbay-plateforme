import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Metric, MoistureState, StorageRisk } from "@saytumbay/shared";
import { api } from "./api";

export const LIVE_MS = 30_000;
const DAY = 86400000;

/** Série d'un capteur sur N jours, rafraîchie en direct. */
export function useSeries(deviceId: string | null | undefined, metric: Metric, days: number, live = true) {
  return useQuery({
    queryKey: ["series", deviceId, metric, days],
    queryFn: () => {
      const to = Date.now();
      return api.series(deviceId!, metric, to - days * DAY, to);
    },
    enabled: !!deviceId,
    refetchInterval: live ? 60_000 : false,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

/** Heure courante (rafraîchie chaque minute) pour les « il y a 5 min ». */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

export const MOISTURE_COLOR: Record<MoistureState, string> = {
  sec: "var(--sun)",
  optimal: "var(--brand)",
  humide: "var(--water)",
  indisponible: "var(--offline)",
};

export const RISK_COLOR: Record<StorageRisk, string> = {
  bon: "var(--brand)",
  surveiller: "var(--sun)",
  risque: "var(--danger)",
  pourriture: "var(--danger)",
};

/** Valeurs hexadécimales (pour Leaflet, qui ne lit pas les variables CSS). */
export function moistureHex(state: MoistureState, dark: boolean): string {
  const light = { sec: "#e0a21b", optimal: "#2fbf71", humide: "#4fb3d9", indisponible: "#c8cfca" };
  const night = { sec: "#f0b642", optimal: "#2bd47d", humide: "#4fd8ef", indisponible: "#8c968f" };
  return (dark ? night : light)[state];
}
