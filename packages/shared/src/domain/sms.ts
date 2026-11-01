/**
 * Textes des SMS d'alerte, en français et en wolof.
 * Le wolof est construit à partir des données de l'alerte (`facts`), pas en traduisant la phrase française.
 */
import { ADVICE, type AlertCandidate, type SmsFacts } from "./rules";
import type { AlertKind } from "./types";

export type SmsLocale = "fr" | "wo";

/**
 * Verrou de relecture : tant qu'il vaut `false`, personne ne reçoit de SMS en wolof (ceux qui l'ont choisi
 * reçoivent le français). Le passer à `true` seulement après relecture des textes ci-dessous par une
 * personne qui parle wolof (docs/SMS-WOLOF.md).
 */
export const WOLOF_SMS_RELU = false;

/** Langue réellement utilisée pour un destinataire, selon sa préférence et le verrou de relecture. */
export function smsLocale(preference: SmsLocale): SmsLocale {
  return preference === "wo" && WOLOF_SMS_RELU ? "wo" : "fr";
}

/**
 * BROUILLON À RELIRE. Une phrase pour le constat, une pour l'action, comme en français.
 * Les alertes sans modèle (contrôle de stock, irrigation annulée) ne partent jamais par SMS.
 */
export const SMS_WOLOF: Partial<Record<AlertKind, (f: SmsFacts) => string>> = {
  sol_sec: (f) => `Toolu ${f.place} dafa wow (${f.value}). Ndoxal ko léegi walla seetal ndoxal bu otomatik bi.`,
  sol_humide: (f) => `Toolu ${f.place} dafa tooy lool (${f.value}). Taxawal ndoxal bi.`,
  capteur_hors_ligne: (f) => `Capteur ${f.place} yónneewul dara. Seetal kuuraŋ bi ak antenn bi.`,
  batterie_faible: (f) => `Pil bu capteur ${f.place} dafa bëgg a jeex (${f.value}). Waajal beneen pil.`,
  stock_humidite: (f) => `Tooy bi bari na ci ${f.place} (${f.value}, ${f.site}). Ubbil palanteer yi guddi te seetal saaku yi.`,
  stock_temperature: (f) => `Tàng bi bari na ci ${f.place} (${f.value}, ${f.site}). Ubbil palanteer yi bu sedde, te bul yokk saaku.`,
  stock_co2: (f) => `CO2 bi bari na ci ${f.place} (${f.value}, ${f.site}). Ubbil palanteer yi te seetal ndax am na soble yu nooy.`,
  stock_gaz: (f) => `Xetu yàqu ci ${f.place} (${f.site}). Génnal saaku yi te tànn leen léegi.`,
};

/** SMS court, lisible sur un téléphone à touches (≤ 160 caractères si possible). */
export function smsText(a: Pick<AlertCandidate, "title" | "kind"> & { facts?: SmsFacts }, orgShort: string, locale: SmsLocale = "fr"): string {
  const wo = locale === "wo" && a.facts ? SMS_WOLOF[a.kind] : undefined;
  const base = wo ? `${orgShort} : ${wo(a.facts!)}` : `${orgShort} : ${a.title}. ${ADVICE[a.kind]}`;
  return base.length <= 160 ? base : base.slice(0, 157) + "…";
}
