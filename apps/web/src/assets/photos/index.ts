/**
 * Photographies du site : vraies photos prises au Sénégal, publiées sur Wikimedia Commons sous licence libre.
 * Elles illustrent le contexte (cultures, récoltes, marchés) ; ce ne sont ni des clients ni des sites SaytuMbay.
 * Licence CC BY-SA : auteur, licence et lien cités dans les mentions légales (rubrique « Crédits ») ; images recadrées
 * et réduites (WebP). À remplacer par les photos de l'équipe dès qu'elles existent (liste dans docs/PHOTOS.md).
 */
import champ640 from "./champ-goutte-640.webp";
import champ1200 from "./champ-goutte-1200.webp";
import champ1920 from "./champ-goutte-1920.webp";
import rangs640 from "./rangs-640.webp";
import rangs1200 from "./rangs-1200.webp";
import rangs1920 from "./rangs-1920.webp";
import niague640 from "./niague-640.webp";
import niague1200 from "./niague-1200.webp";
import sac640 from "./sac-640.webp";
import sac1200 from "./sac-1200.webp";
import sac1920 from "./sac-1920.webp";
import diamniadio640 from "./diamniadio-640.webp";
import diamniadio1200 from "./diamniadio-1200.webp";
import marche640 from "./marche-640.webp";
import marche1200 from "./marche-1200.webp";
import marche1920 from "./marche-1920.webp";
import goutte640 from "./goutte-640.webp";
import goutte1200 from "./goutte-1200.webp";
import rangees640 from "./rangees-640.webp";
import rangees1200 from "./rangees-1200.webp";
import pompage640 from "./pompage-640.webp";
import pompage1200 from "./pompage-1200.webp";
import pompage1920 from "./pompage-1920.webp";

export interface PhotoAsset {
  /** Fichiers par largeur, en pixels. */
  srcs: Array<[number, string]>;
  width: number;
  height: number;
  /** Lieu et sujet, affichés en légende. */
  place: string;
  author: string;
  license: "CC BY-SA 4.0" | "CC BY-SA 3.0";
  licenseUrl: string;
  /** Page de la photo sur Wikimedia Commons. */
  source: string;
}

const BYSA4 = { license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.fr" } as const;
const BYSA3 = { license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/deed.fr" } as const;

export const PHOTOS = {
  champGoutte: { srcs: [[640, champ640], [1200, champ1200], [1920, champ1920]], width: 3840, height: 2543, place: "Diamniadio · oignon au goutte-à-goutte", author: "Pacocreat", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Ognons_(_s%C3%A9n%C3%A9gal_)_20.jpg" },
  rangs: { srcs: [[640, rangs640], [1200, rangs1200], [1920, rangs1920]], width: 3840, height: 2543, place: "Diamniadio · rangs d’oignon irrigués", author: "Pacocreat", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Ognons_(_s%C3%A9n%C3%A9gal_)_22.jpg" },
  niague: { srcs: [[640, niague640], [1200, niague1200]], width: 3840, height: 2880, place: "Niague Noflaye · champ d’oignons", author: "Zul pro le Geni", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Oignons_%C3%A0_Niague_05.jpg" },
  sac: { srcs: [[640, sac640], [1200, sac1200], [1920, sac1920]], width: 3840, height: 2157, place: "Sénégal · un sac d’oignons vers le marché", author: "Thiam Babel Design", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Un_sac_d%27oignon_sur_la_t%C3%AAte.jpg" },
  diamniadio: { srcs: [[640, diamniadio640], [1200, diamniadio1200]], width: 3024, height: 4032, place: "Diamniadio · parcelle d’oignons", author: "Wuzyprod", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Onions_from_Diamniadio,_Senegal_02.jpg" },
  marche: { srcs: [[640, marche640], [1200, marche1200], [1920, marche1920]], width: 3840, height: 2543, place: "Dakar · marché de Case Ba, Parcelles Assainies", author: "Pacocreat", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Vendeurs_de_L%C3%A9gumes_Parcelle_Case_Ba_(_S%C3%A9n%C3%A9gal_)_03.jpg" },
  goutte: { srcs: [[640, goutte640], [1200, goutte1200]], width: 3264, height: 4928, place: "Sénégal · oignon et goutte-à-goutte", author: "Pacocreat", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Ognons_(_s%C3%A9n%C3%A9gal_)_18.jpg" },
  rangees: { srcs: [[640, rangees640], [1200, rangees1200]], width: 3264, height: 4928, place: "Sénégal · rangées d’oignons", author: "Pacocreat", ...BYSA4, source: "https://commons.wikimedia.org/wiki/File:Ognons_(_s%C3%A9n%C3%A9gal_)_23.jpg" },
  pompage: { srcs: [[640, pompage640], [1200, pompage1200], [1920, pompage1920]], width: 4176, height: 2784, place: "Vallée du fleuve Sénégal · station de pompage pour l’irrigation", author: "Africa Rice Center", ...BYSA3, source: "https://commons.wikimedia.org/wiki/File:Pumping_station_for_rice_and_vegetables_cultivation_in_the_Senegal_River_Valley_-_panoramio.jpg" },
} satisfies Record<string, PhotoAsset>;

export type PhotoKey = keyof typeof PHOTOS;
