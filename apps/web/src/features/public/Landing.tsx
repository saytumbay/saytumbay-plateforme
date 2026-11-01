/**
 * Accueil : une idée par écran, peu de texte, de grands visuels ; chaque sujet mène à sa page détaillée
 * (/agritech, /onion, /a-propos). Les sections viennent de blocks.tsx.
 */
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { usePageTitle } from "@/components/ui/page";
import { Photo, PhotoCredit } from "@/components/ui/photo";
import type { PhotoKey } from "@/assets/photos";
import { useReveal } from "@/lib/reveal";
import { cn } from "@/lib/cn";
import { Contact, display, Dot, eyebrow, FieldToMarket, Hero, InAction, Together, useHashScroll, wrap } from "./blocks";

export default function Landing() {
  usePageTitle(null);
  useReveal();
  useHashScroll();
  return (
    <>
      <Hero />
      <BigNumber />
      <InAction />
      <ProductTiles />
      <SkyStatement />
      <FieldToMarket />
      <Proofs />
      <Together pilot={false} />
      <Contact />
    </>
  );
}

/** Lien « En savoir plus » : flèche discrète, comme sur les sites produits. */
function More({ to, children, light }: { to: string; children: string; light?: boolean }) {
  return (
    <Link to={to} className={cn("inline-flex items-center gap-1.5 font-display text-[16px] font-semibold underline-offset-4 hover:underline", light ? "text-[#f4efe6]" : "text-brand")}>
      {children} <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

/* ——— Le problème, en un chiffre ——— */

function BigNumber() {
  return (
    <section className="border-y border-line bg-surface" aria-labelledby="chiffre-titre">
      <div className={cn(wrap, "py-20 text-center lg:py-28")} data-reveal>
        <p className={cn(eyebrow, "text-brand")}>Le problème</p>
        <h2 id="chiffre-titre" className="mt-6">
          <span className="block font-display text-[clamp(56px,14vw,176px)] font-bold leading-none tracking-[-0.05em] text-sun-ink dark:text-sun">30 à 40 %</span>
          <span className="mx-auto mt-6 block max-w-[24ch] font-display text-[clamp(22px,2.6vw,32px)] font-semibold leading-snug tracking-[-0.02em] text-balance">
            de la production horticole se perd après la récolte au Sénégal.
            <sup className="ml-0.5 align-super text-[0.5em] font-medium text-ink-3">
              <a href="#source-1" aria-describedby="source-1">
                1
              </a>
            </sup>
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-[44ch] text-[18px] leading-relaxed text-ink-2">La perte commence toujours sans témoin. Nous la rendons visible.</p>
        <p id="source-1" className="mx-auto mt-12 max-w-[70ch] text-[12.5px] leading-relaxed text-ink-3">
          1. Estimation publique relayée par Le Soleil au lancement du projet national de stockage des produits horticoles, Ngomène, 17 février 2026 (
          <a href="https://fr.allafrica.com/stories/202602170606.html" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
            AllAfrica
          </a>
          ). L’auteur du chiffre n’est pas précisé.
        </p>
      </div>
    </section>
  );
}

/* ——— Les deux solutions, en grandes tuiles ——— */

const TILES: Array<{ to: string; photo: PhotoKey; position: string; alt: string; eyebrow: string; title: string; text: string }> = [
  { to: "/agritech", photo: "rangs", position: "50% 60%", alt: "Rangs d’oignons irrigués au goutte-à-goutte à Diamniadio.", eyebrow: "SaytuMbay AgriTech", title: "Arroser juste.", text: "Parcelle par parcelle." },
  { to: "/onion", photo: "sac", position: "55% 30%", alt: "Une femme porte sur la tête un grand sac d’oignons rouges.", eyebrow: "SaytuMbay Onion", title: "Sauver le stock.", text: "Avant qu’il ne pourrisse." },
];

function ProductTiles() {
  return (
    <section className="border-t border-line" aria-labelledby="solutions-titre">
      <div className={cn(wrap, "py-20 lg:py-28")}>
        <h2 id="solutions-titre" className={cn(display, "text-center")} data-reveal>
          Deux solutions. Un même but.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {TILES.map((t, i) => (
            <div key={t.to} data-reveal={i}>
              <Link to={t.to} className="group relative block overflow-hidden rounded-[28px]">
                <Photo name={t.photo} caption={false} alt={t.alt} sizes="(min-width: 768px) 580px, 100vw" position={t.position} frameClassName="aspect-[4/5] sm:aspect-[5/6] [&>img]:transition-transform [&>img]:duration-700 group-hover:[&>img]:scale-[1.03] motion-reduce:[&>img]:transition-none" />
                <span className="absolute inset-0 bg-gradient-to-t from-[#0b2e24]/90 via-[#0b2e24]/35 to-transparent" aria-hidden />
                <span className="absolute inset-x-0 bottom-0 p-7 text-[#f4efe6] sm:p-9">
                  <span className={cn(eyebrow, "block text-[#f4efe6]")}>{t.eyebrow}</span>
                  <span className="mt-3 block font-display text-[clamp(32px,4vw,48px)] font-bold leading-[1.02] tracking-[-0.035em]">{t.title}</span>
                  <span className="mt-1 block font-display text-[clamp(20px,2.2vw,26px)] font-semibold text-[#d6dbd2]">{t.text}</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-display text-[16px] font-semibold underline-offset-4 group-hover:underline">
                    En savoir plus <ArrowRight className="size-4" aria-hidden />
                  </span>
                </span>
              </Link>
              <PhotoCredit name={t.photo} className="mt-2.5 px-1" />
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-[17px] text-ink-2" data-reveal>
          Chambre froide, forage, pompe isolée : le même socle s’adapte.{" "}
          <Link to="/?profil=autre#contact" className="whitespace-nowrap font-semibold text-brand underline-offset-4 hover:underline">
            Parlons-en
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ——— Satellite et capteurs, en une phrase ——— */

function SkyStatement() {
  return (
    <section className="bg-[#0b2e24] text-[#f4efe6]" aria-labelledby="ciel-court">
      <div className={cn(wrap, "py-24 text-center lg:py-32")} data-reveal>
        <h2 id="ciel-court" className={display}>
          <span className="block text-[#f4efe6]">Le satellite voit d’en haut.</span>
          <span className="block text-[#4cc98a]">Nos capteurs voient le reste.</span>
        </h2>
        <p className="mx-auto mt-7 max-w-[40ch] text-[18px] leading-relaxed text-[#c9cec5]">L’eau sous la surface. Le cœur des sacs dans le magasin.</p>
        <div className="mt-8">
          <More to="/a-propos#satellite" light>
            Pourquoi les deux
          </More>
        </div>
      </div>
    </section>
  );
}

/* ——— Le parcours, en une ligne ——— */

const PROOFS = ["Né à l’ESP de Dakar", "Incubé à TÀGGU NDAW ÑI", "Publié au colloque COC’2026", "Présenté au Dakar Night Market 2026"];

function Proofs() {
  return (
    <section className="border-t border-line bg-surface" aria-labelledby="parcours-titre">
      <div className={cn(wrap, "flex flex-col items-center gap-7 py-16 text-center lg:py-20")} data-reveal>
        <h2 id="parcours-titre" className={cn(eyebrow, "text-ink-3")}>
          Notre parcours
        </h2>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-display text-[clamp(17px,1.8vw,21px)] font-semibold">
          {PROOFS.map((p) => (
            <li key={p} className="inline-flex items-center gap-2.5">
              <Dot />
              {p}
            </li>
          ))}
        </ul>
        <More to="/a-propos">Notre histoire</More>
      </div>
    </section>
  );
}
