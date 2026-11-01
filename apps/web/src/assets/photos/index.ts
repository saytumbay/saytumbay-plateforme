/**
 * Photographies du site : vraies photos prises au Sénégal, publiées sur Wikimedia Commons sous licence libre.
 * Elles illustrent le contexte (cultures, récoltes, marchés) ; ce ne sont ni des clients ni des sites SaytuMbay.
 * Licence CC BY-SA : auteur et licence cités sous chaque photo et dans les mentions légales ; images recadrées
 * et réduites (WebP). À remplacer par les photos de l'équipe dès qu'elles existent (liste dans docs/PHOTOS.md).
 */
import champ640 from "./champ-goutte-640.webp";
import champ1200 from "./champ-goutte-1200.webp";
import champ1920 from "./champ-goutte-1920.webp";
import rangs640 from "./rangs-640.webp";
import rangs1200 from "./rangs-1200.webp";
import rangs1920 from "./rangs-1920.webp";
import recolte640 from "./recolte-640.webp";
import recolte1200 from "./recolte-1200.webp";
import sac640 from "./sac-640.webp";
import sac1200 from "./sac-1200.webp";
import sac1920 from "./sac-1920.webp";
import diamniadio640 from "./diamniadio-640.webp";
import diamniadio1200 from "./diamniadio-1200.webp";
import marche640 from "./marche-640.webp";
import marche1200 from "./marche-1200.webp";
import marche1920 from "./marche-1920.webp";

export interface PhotoAsset {
  /** Fichiers par largeur, en pixels. */
  srcs: Array<[number, string]>;
  width: number;
  height: number;
  /** Lieu et sujet, affichés en légende. */
  place: string;
  author: string;
  license: "CC BY-SA 4.0";
  licenseUrl: string;
  /** Page de la photo sur Wikimedia Commons. */
  source: string;
}

const BYSA4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.fr" } as const;

export const PHOTOS = {
  champGoutte: { srcs: [[640, champ640], [1200, champ1200], [1920, champ1920]], width: 3840, height: 2543, place: "Diamniadio · oignon au goutte-à-goutte", author: "Pacocreat", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Ognons_(_s%C3%A9n%C3%A9gal_)_20.jpg" },
  rangs: { srcs: [[640, rangs640], [1200, rangs1200], [1920, rangs1920]], width: 3840, height: 2543, place: "Diamniadio · rangs d’oignon irrigués", author: "Pacocreat", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Ognons_(_s%C3%A9n%C3%A9gal_)_22.jpg" },
  recolte: { srcs: [[640, recolte640], [1200, recolte1200]], width: 3113, height: 4552, place: "Sénégal · récolte d’oignons", author: "NoahElhardt", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Joy_of_the_onion_harvest.jpg" },
  sac: { srcs: [[640, sac640], [1200, sac1200], [1920, sac1920]], width: 3840, height: 2157, place: "Sénégal · un sac d’oignons vers le marché", author: "Thiam Babel Design", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Un_sac_d%27oignon_sur_la_t%C3%AAte.jpg" },
  diamniadio: { srcs: [[640, diamniadio640], [1200, diamniadio1200]], width: 3024, height: 4032, place: "Diamniadio · parcelle d’oignons", author: "Wuzyprod", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Onions_from_Diamniadio,_Senegal_02.jpg" },
  marche: { srcs: [[640, marche640], [1200, marche1200], [1920, marche1920]], width: 3840, height: 2543, place: "Dakar · marché de Case Ba, Parcelles Assainies", author: "Pacocreat", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Vendeurs_de_L%C3%A9gumes_Parcelle_Case_Ba_(_S%C3%A9n%C3%A9gal_)_03.jpg" },
} satisfies Record<string, PhotoAsset>;

export type PhotoKey = keyof typeof PHOTOS;
