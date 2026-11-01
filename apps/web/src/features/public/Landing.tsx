/**
 * Accueil, pensé pour quelqu'un qui n'y connaît rien (un agriculteur d'abord) : peu de mots, des images,
 * trois étapes, et le moyen de nous appeler. Les détails sont sur /agritech, /onion et /a-propos.
 */
import { Link } from "react-router";
import { ArrowRight, Eye, MessageSquareText, Sprout } from "lucide-react";
import { usePageTitle } from "@/components/ui/page";
import { Photo, PhotoCredit } from "@/components/ui/photo";
import type { PhotoKey } from "@/assets/photos";
import { useReveal } from "@/lib/reveal";
import { cn } from "@/lib/cn";
import { Contact, display, Dot, eyebrow, Hero, useHashScroll, wrap } from "./blocks";

export default function Landing() {
  usePageTitle(null);
  useReveal();
  useHashScroll();
  return (
    <>
      <Hero />
      <BigNumber />
      <Steps />
      <ForWhat />
      <Proofs />
      <Contact />
    </>
  );
}

/* ——— Pourquoi : une phrase ——— */

function BigNumber() {
  return (
    <section className="border-y border-line bg-surface" aria-labelledby="chiffre-titre">
      <div className={cn(wrap, "py-20 text-center lg:py-28")} data-reveal>
        <h2 id="chiffre-titre">
          <span className="block font-display text-[clamp(56px,14vw,176px)] font-bold leading-none tracking-[-0.05em] text-sun-ink dark:text-sun">30 à 40 %</span>
          <span className="mx-auto mt-6 block max-w-[22ch] font-display text-[clamp(22px,2.6vw,32px)] font-semibold leading-snug tracking-[-0.02em] text-balance">
            des fruits et légumes du Sénégal se perdent après la récolte.
            <sup className="ml-0.5 align-super text-[0.5em] font-medium text-ink-3">
              <a href="#source-1" aria-describedby="source-1">
                1
              </a>
            </sup>
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-[36ch] text-[19px] leading-relaxed text-ink-2">Souvent, personne ne le voit venir. Nous, si.</p>
        <p id="source-1" className="mx-auto mt-12 max-w-[70ch] text-[12.5px] leading-relaxed text-ink-3">
          1. Estimation des pertes après récolte de la production horticole, relayée par Le Soleil, 17 février 2026 (
          <a href="https://fr.allafrica.com/stories/202602170606.html" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
            AllAfrica
          </a>
          ).
        </p>
      </div>
    </section>
  );
}

/* ——— Comment : trois étapes ——— */

const STEPS = [
  { icon: Sprout, title: "On pose un capteur", text: "Dans votre champ ou dans votre magasin." },
  { icon: Eye, title: "Il surveille", text: "Jour et nuit, à votre place." },
  { icon: MessageSquareText, title: "Vous recevez un SMS", text: "Quand il faut agir, avec quoi faire." },
];

function Steps() {
  return (
    <section className="border-t border-line" aria-labelledby="etapes-titre">
      <div className={cn(wrap, "py-20 lg:py-28")}>
        <h2 id="etapes-titre" className={cn(display, "text-center")} data-reveal>
          Simple comme un SMS.
        </h2>
        <ol className="mx-auto mt-14 grid max-w-[1000px] gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col items-center text-center" data-reveal={i}>
              <span className="relative flex size-24 items-center justify-center rounded-full bg-brand text-brand-ink">
                <s.icon className="size-10" aria-hidden />
                <span className="absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full bg-sun font-display text-[17px] font-bold text-[#0b2e24]" aria-hidden>
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-6 font-display text-[24px] font-semibold tracking-[-0.02em]">
                <span className="sr-only">Étape {i + 1} : </span>
                {s.title}
              </h3>
              <p className="mt-2 text-[17px] leading-relaxed text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ——— Pour quoi : les champs, les stocks ——— */

const TILES: Array<{ to: string; photo: PhotoKey; position: string; alt: string; eyebrow: string; title: string }> = [
  { to: "/agritech", photo: "rangs", position: "50% 60%", alt: "Rangs d’oignons irrigués au goutte-à-goutte à Diamniadio.", eyebrow: "Pour vos champs", title: "Arroser au bon moment." },
  { to: "/onion", photo: "sac", position: "55% 30%", alt: "Une femme porte sur la tête un grand sac d’oignons rouges.", eyebrow: "Pour vos stocks", title: "Garder vos oignons sains." },
];

function ForWhat() {
  return (
    <section className="border-t border-line bg-surface" aria-labelledby="pourquoi-titre">
      <div className={cn(wrap, "py-20 lg:py-28")}>
        <h2 id="pourquoi-titre" className="sr-only">
          Pour vos champs et vos stocks
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {TILES.map((t, i) => (
            <div key={t.to} data-reveal={i}>
              <Link to={t.to} className="group relative block overflow-hidden rounded-[28px]">
                <Photo name={t.photo} caption={false} alt={t.alt} sizes="(min-width: 768px) 580px, 100vw" position={t.position} frameClassName="aspect-[4/5] sm:aspect-[5/6] [&>img]:transition-transform [&>img]:duration-700 group-hover:[&>img]:scale-[1.03] motion-reduce:[&>img]:transition-none" />
                <span className="absolute inset-0 bg-gradient-to-t from-[#0b2e24]/90 via-[#0b2e24]/30 to-transparent" aria-hidden />
                <span className="absolute inset-x-0 bottom-0 p-7 text-[#f4efe6] sm:p-9">
                  <span className={cn(eyebrow, "block text-[#f4efe6]")}>{t.eyebrow}</span>
                  <span className="mt-3 block font-display text-[clamp(32px,4vw,48px)] font-bold leading-[1.02] tracking-[-0.035em]">{t.title}</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-display text-[16px] font-semibold underline-offset-4 group-hover:underline">
                    En savoir plus <ArrowRight className="size-4" aria-hidden />
                  </span>
                </span>
              </Link>
              <PhotoCredit name={t.photo} className="mt-2.5 px-1" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ——— Confiance : une ligne ——— */

const PROOFS = ["Né à l’ESP de Dakar", "Incubé à TÀGGU NDAW ÑI", "Publié au colloque COC’2026", "Présenté au Dakar Night Market 2026"];

function Proofs() {
  return (
    <section className="border-t border-line" aria-labelledby="parcours-titre">
      <div className={cn(wrap, "flex flex-col items-center gap-6 py-14 text-center lg:py-16")} data-reveal>
        <h2 id="parcours-titre" className={cn(eyebrow, "text-ink-3")}>
          Notre parcours
        </h2>
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-display text-[clamp(16px,1.6vw,19px)] font-semibold">
          {PROOFS.map((p) => (
            <li key={p} className="inline-flex items-center gap-2.5">
              <Dot />
              {p}
            </li>
          ))}
        </ul>
        <Link to="/a-propos" className="inline-flex items-center gap-1.5 font-display text-[16px] font-semibold text-brand underline-offset-4 hover:underline">
          Notre histoire <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
