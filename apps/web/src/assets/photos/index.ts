/**
 * Photographies du site : vraies photos prises au Sénégal, publiées sur Wikimedia Commons sous licence libre.
 * Elles illustrent le contexte (cultures, récoltes, marchés) ; ce ne sont ni des clients ni des sites SaytuMbay.
 * Licence CC BY-SA : auteur, licence et lien cités dans les mentions légales (rubrique « Crédits ») ; images recadrées
 * et réduites (WebP). Chaque photo du site public n'apparaît qu'une fois, choisie pour le texte qu'elle accompagne.
 * À remplacer par les photos de l'équipe dès qu'elles existent (liste dans docs/PHOTOS.md).
 */
import rangs640 from "./rangs-640.webp";
import rangs1200 from "./rangs-1200.webp";
import rangs1920 from "./rangs-1920.webp";
import sac640 from "./sac-640.webp";
import sac1200 from "./sac-1200.webp";
import sac1920 from "./sac-1920.webp";
import diamniadio640 from "./diamniadio-640.webp";
import diamniadio1200 from "./diamniadio-1200.webp";
import marche640 from "./marche-640.webp";
import marche1200 from "./marche-1200.webp";
import marche1920 from "./marche-1920.webp";
import pompage640 from "./pompage-640.webp";
import pompage1200 from "./pompage-1200.webp";
import pompage1920 from "./pompage-1920.webp";
import tomates640 from "./tomates-640.webp";
import tomates1200 from "./tomates-1200.webp";
import tomates1920 from "./tomates-1920.webp";
import tomateSeche640 from "./tomate-seche-640.webp";
import tomateSeche1200 from "./tomate-seche-1200.webp";
import tomateSeche1920 from "./tomate-seche-1920.webp";
import arrosoirs640 from "./arrosoirs-640.webp";
import arrosoirs1200 from "./arrosoirs-1200.webp";
import goutteLigne640 from "./goutte-ligne-640.webp";
import goutteLigne1200 from "./goutte-ligne-1200.webp";
import goutteLigne1920 from "./goutte-ligne-1920.webp";
import sacsLegumes640 from "./sacs-legumes-640.webp";
import sacsLegumes1200 from "./sacs-legumes-1200.webp";
import sacsLegumes1920 from "./sacs-legumes-1920.webp";
import salade640 from "./salade-telephone-640.webp";
import salade1200 from "./salade-telephone-1200.webp";
import salade1920 from "./salade-telephone-1920.webp";
import visiteNiague640 from "./visite-niague-640.webp";
import visiteNiague1200 from "./visite-niague-1200.webp";
import esp640 from "./esp-640.webp";
import esp1200 from "./esp-1200.webp";
import esp1920 from "./esp-1920.webp";

export interface PhotoAsset {
  /** Fichiers par largeur, en pixels. */
  srcs: Array<[number, string]>;
  width: number;
  height: number;
  /** Lieu et sujet, cités dans les crédits. */
  place: string;
  author: string;
  license: "CC BY-SA 4.0" | "CC BY-SA 3.0";
  licenseUrl: string;
  /** Page de la photo sur Wikimedia Commons. */
  source: string;
}

const BYSA4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.fr" } as const;
const BYSA3 = { license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/deed.fr" } as const;
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const PHOTOS = {
  // Site public
  tomates: { srcs: [[640, tomates640], [1200, tomates1200], [1920, tomates1920]], width: 4928, height: 3264, place: "Sénégal · tomates mûres sur pied", author: "Pacocreat", ...BYSA4, source: commons("Tomates_(_s%C3%A9n%C3%A9gal_)_06.jpg") },
  marche: { srcs: [[640, marche640], [1200, marche1200], [1920, marche1920]], width: 3840, height: 2543, place: "Dakar · marché de Case Ba, Parcelles Assainies", author: "Pacocreat", ...BYSA4, source: commons("Vendeurs_de_L%C3%A9gumes_Parcelle_Case_Ba_(_S%C3%A9n%C3%A9gal_)_03.jpg") },
  arrosoirs: { srcs: [[640, arrosoirs640], [1200, arrosoirs1200]], width: 1440, height: 2960, place: "Région de Ziguinchor · arrosage des légumes", author: "Fatou kine doucoure", ...BYSA4, source: commons("Arrosage_de_l%C3%A9gumes.jpg") },
  sac: { srcs: [[640, sac640], [1200, sac1200], [1920, sac1920]], width: 3840, height: 2157, place: "Sénégal · un sac d’oignons vers le marché", author: "Thiam Babel Design", ...BYSA4, source: commons("Un_sac_d%27oignon_sur_la_t%C3%AAte.jpg") },
  salade: { srcs: [[640, salade640], [1200, salade1200], [1920, salade1920]], width: 4000, height: 2250, place: "Sénégal · champ de salade, téléphone en main", author: "Youfadiarragaye", ...BYSA4, source: commons("Champ_de_salade.jpg") },
  goutteLigne: { srcs: [[640, goutteLigne640], [1200, goutteLigne1200], [1920, goutteLigne1920]], width: 5184, height: 3456, place: "Dakar, Patte d’Oie · goutte-à-goutte", author: "4MAPS", ...BYSA4, source: commons("Arrosage_distribution_06.jpg") },
  sacsLegumes: { srcs: [[640, sacsLegumes640], [1200, sacsLegumes1200], [1920, sacsLegumes1920]], width: 5044, height: 2834, place: "Sénégal · sacs de choux et d’oignons", author: "Thiam Babel Design", ...BYSA4, source: commons("Des_sacs_de_choux_et_d%27oignons.jpg") },
  visiteNiague: { srcs: [[640, visiteNiague640], [1200, visiteNiague1200]], width: 2976, height: 3968, place: "Niague · visite d’un champ", author: "Kikanakana", ...BYSA4, source: commons("Visite_d%27un_champ_agricole_%C3%A0_Niague_au_S%C3%A9n%C3%A9gal.jpg") },
  tomateSeche: { srcs: [[640, tomateSeche640], [1200, tomateSeche1200], [1920, tomateSeche1920]], width: 4928, height: 3264, place: "Sénégal · plant de tomate qui dépérit", author: "Pacocreat", ...BYSA4, source: commons("Tomates_(_s%C3%A9n%C3%A9gal_)_12.jpg") },
  esp: { srcs: [[640, esp640], [1200, esp1200], [1920, esp1920]], width: 2048, height: 1536, place: "Dakar · École supérieure polytechnique (UCAD)", author: "Nathysy", ...BYSA3, source: commons("ESPDakar.jpg") },
  pompage: { srcs: [[640, pompage640], [1200, pompage1200], [1920, pompage1920]], width: 4176, height: 2784, place: "Vallée du fleuve Sénégal · station de pompage pour l’irrigation", author: "Africa Rice Center", ...BYSA3, source: commons("Pumping_station_for_rice_and_vegetables_cultivation_in_the_Senegal_River_Valley_-_panoramio.jpg") },
  // Espace client et connexion
  rangs: { srcs: [[640, rangs640], [1200, rangs1200], [1920, rangs1920]], width: 3840, height: 2543, place: "Diamniadio · rangs d’oignon irrigués", author: "Pacocreat", ...BYSA4, source: commons("Ognons_(_s%C3%A9n%C3%A9gal_)_22.jpg") },
  diamniadio: { srcs: [[640, diamniadio640], [1200, diamniadio1200]], width: 3024, height: 4032, place: "Diamniadio · parcelle d’oignons", author: "Wuzyprod", ...BYSA4, source: commons("Onions_from_Diamniadio,_Senegal_02.jpg") },
} satisfies Record<string, PhotoAsset>;

export type PhotoKey = keyof typeof PHOTOS;
