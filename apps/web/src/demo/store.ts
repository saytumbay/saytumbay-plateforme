/**
 * État du serveur de démonstration : jeu de données + modifications faites pendant la visite,
 * conservées dans le navigateur (localStorage) pour que la démo garde ses actions d'une page à l'autre.
 */
import { createSeed, initSimulation, type DemoSeed } from "@saytumbay/shared/demo";
import type { Alert } from "@saytumbay/shared";

const KEY = "saytumbay:demo:v1";
const MAX_AGE_MS = 3 * 24 * 3600 * 1000;

export interface DemoState extends DemoSeed {
  alertOverrides: Record<string, Partial<Alert>>;
  sessionUserId: string | null;
  activeOrgId: string | null;
  pendingTotp: { challengeId: string; userId: string } | null;
  sentSms: Array<{ to: string; text: string; at: string }>;
  contactMessages: number;
  /** Capteur remplaçant → capteur remplacé (reprise de l'historique). */
  aliases: Record<string, string>;
  /** Irrigations lancées pendant la démo. */
  runs: Array<{ parcelId: string; startedAt: number; durationMin: number; stoppedAt: number | null; by: string }>;
  loginFailures: Record<string, { count: number; until: number }>;
  /** Codes de secours déjà utilisés (usage unique). */
  usedRecovery?: string[];
}

let state: DemoState | null = null;

function fresh(): DemoState {
  const seed = createSeed(new Date());
  return { ...seed, alertOverrides: {}, sessionUserId: null, activeOrgId: null, pendingTotp: null, sentSms: [], contactMessages: 0, aliases: {}, runs: [], loginFailures: {} };
}

function revive(raw: string): DemoState | null {
  try {
    const parsed = JSON.parse(raw) as DemoState & { now: string };
    const now = new Date(parsed.now);
    if (Number.isNaN(now.getTime()) || Date.now() - now.getTime() > MAX_AGE_MS) return null;
    return { ...parsed, now };
  } catch {
    return null;
  }
}

export function getState(): DemoState {
  if (state) return state;
  let s: DemoState | null = null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = revive(raw);
  } catch {
    /* stockage indisponible (navigation privée) : démo en mémoire */
  }
  if (!s) {
    const session = (() => {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as Partial<DemoState>) : null;
      } catch {
        return null;
      }
    })();
    s = fresh();
    // Une démo expirée garde la personne connectée, avec des données remises à zéro.
    if (session?.sessionUserId) {
      s.sessionUserId = session.sessionUserId;
      s.activeOrgId = session.activeOrgId ?? null;
    }
  }
  initSimulation(s);
  state = s;
  return s;
}

export function save() {
  if (!state) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota dépassé ou stockage bloqué : on continue en mémoire */
  }
}

export function resetDemo(keepSession = true) {
  const prev = state;
  state = fresh();
  if (keepSession && prev) {
    state.sessionUserId = prev.sessionUserId;
    state.activeOrgId = prev.activeOrgId;
  }
  initSimulation(state);
  save();
}
