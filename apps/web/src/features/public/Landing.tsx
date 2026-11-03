/**
 * Accueil, pensé pour quelqu'un qui n'y connaît rien (un agriculteur d'abord). Une histoire en cinq temps, une idée par écran :
 * la promesse, le problème (seule page où il est chiffré), nos deux solutions, comment ça marche, notre parcours.
 * Le détail est ailleurs, sans redite : /solutions (comment), /a-propos (qui), /contact (agir).
 */
import { Link } from "react-router";
import { ArrowRight, Eye, MessageSquareText, Sprout } from "lucide-react";
import { usePageTitle } from "@/components/ui/page";
import { ButtonLink } from "@/components/ui/button";
import { Photo } from "@/components/ui/photo";
import type { PhotoKey } from "@/assets/photos";
import { useReveal } from "@/lib/reveal";
import { cn } from "@/lib/cn";
import { CtaBand, display, Dot, eyebrow, LossSources, useHashScroll, wrap } from "./blocks";

export default function Landing() {
  usePageTitle(null);
  useReveal();
  useHashScroll();
  return (
    <>
      <Hero />
      <Problem />
      <Solutions />
      <Steps />
      <Proofs />
      <CtaBand title="Vous voulez essayer ? Parlons-en." profil="cooperative" />
    </>
  );
}

/** Texte clair posé sur une photo assombrie : mêmes couleurs dans les deux thèmes. */
const onPhoto = "text-[#f4efe6]";

/* ——— 1. La promesse : une photo, une phrase, un SMS ——— */

function Hero() {
  return (
    <section className={cn("relative isolate overflow-hidden bg-[#0b2e24]", onPhoto)} aria-labelledby="hero-titre">
      <Photo
        name="tomates"
        priority
        caption={false}
        alt="Tomates mûres sur un plant, dans un champ au Sénégal."
        sizes="100vw"
        position="60% 50%"
        className="absolute inset-0 -z-10"
        frameClassName="hero-photo h-full"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2e24] via-[#0b2e24]/75 to-[#0b2e24]/15 lg:bg-gradient-to-r lg:from-[#0b2e24]/95 lg:via-[#0b2e24]/55 lg:to-transparent" aria-hidden />
      <div className={cn(wrap, "flex min-h-[calc(100svh-64px)] flex-col justify-between gap-10 pb-8 pt-6 lg:min-h-[calc(100svh-72px)] lg:flex-row lg:items-center lg:justify-between lg:pb-10")}>
        <div className="anim-rise max-w-[640px]">
          <h1 id="hero-titre" className="font-display text-[#f4efe6] text-[clamp(44px,7vw,92px)] font-bold leading-[0.98] tracking-[-0.045em] text-balance">
            <span className="block">Votre champ a soif ?</span>
            <span className="block text-[#ef6a22]">Vous recevez un SMS.</span>
          </h1>
          <p className="mt-6 max-w-[32ch] text-[clamp(18px,1.7vw,22px)] leading-snug text-[#e6e2d8]">De petits capteurs veillent jour et nuit sur vos champs et vos magasins.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/contact?profil=cooperative" size="lg" className="bg-[#f4efe6] text-[#0b2e24] hover:bg-white">
              Je veux essayer
            </ButtonLink>
            <ButtonLink to="/solutions" variant="ghost" size="lg" className="border border-[#f4efe6]/60 text-[#f4efe6] hover:bg-white/10 hover:text-white">
              Nos solutions
            </ButtonLink>
          </div>
        </div>
        <SmsCard />
      </div>
    </section>
  );
}

/** Exemple simplifié pour l'accueil ; les SMS réels de la plateforme sont plus détaillés. */
function SmsCard() {
  return (
    <div className="anim-sms order-first w-full max-w-[340px] self-start lg:order-none rounded-[22px] bg-[#f4efe6]/95 p-4 text-[#0b2e24] shadow-3 lg:self-center">
      <p className="flex items-center gap-2.5 text-[13px] font-semibold text-[#5b6660]">
        <span className="flex size-7 items-center justify-center rounded-lg bg-[#0f5a44] text-[#f4efe6]">
          <MessageSquareText className="size-4" aria-hidden />
        </span>
        SaytuMbay
        <span className="ml-auto font-normal">Exemple de SMS</span>
      </p>
      <p className="mt-2.5 text-[18px] font-semibold leading-snug">Votre parcelle de tomates manque d’eau. Pensez à arroser ce soir.</p>
    </div>
  );
}

/* ——— 2. Le problème : un chiffre sourcé, puis ses deux causes, qui annoncent nos deux solutions ——— */

const CAUSES = [
  { where: "Au champ", text: "La terre manque d’eau, les plants sèchent." },
  { where: "Au magasin", text: "Les oignons pourrissent au fond des sacs." },
];

function Problem() {
  return (
    <section className={cn("relative isolate overflow-hidden bg-[#0b2e24]", onPhoto)} aria-labelledby="chiffre-titre">
      <Photo name="tomateSeche" caption={false} alt="" sizes="100vw" position="50% 50%" className="absolute inset-0 -z-10" frameClassName="h-full" />
      <div className="absolute inset-0 -z-10 bg-[#0b2e24]/82" aria-hidden />
      <div className={cn(wrap, "py-24 text-center lg:py-32")}>
        <p className={cn(eyebrow, "text-[#f4efe6]")} data-reveal>
          Le problème
        </p>
        <h2 id="chiffre-titre" className="mt-4 text-[#f4efe6]" data-reveal>
          <span className="block font-display text-[clamp(64px,15vw,200px)] font-bold leading-none tracking-[-0.05em] text-[#ef6a22]">30 %</span>
          <span className="mx-auto mt-6 block max-w-[22ch] font-display text-[clamp(24px,2.8vw,36px)] font-semibold leading-snug tracking-[-0.02em] text-balance">
            des légumes du Sénégal se perdent avant même d’arriver au marché.
          </span>
        </h2>
        <ul className="mx-auto mt-12 grid max-w-[820px] gap-4 text-left sm:grid-cols-2">
          {CAUSES.map((c, i) => (
            <li key={c.where} className="rounded-[20px] border border-[#f4efe6]/20 bg-[#0b2e24]/50 p-5 backdrop-blur-sm" data-reveal={i}>
              <span className={cn(eyebrow, "block text-[#ef6a22]")}>{c.where}</span>
              <span className="mt-2 block text-[18px] leading-snug text-pretty text-[#f4efe6]">{c.text}</span>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-10 font-display text-[clamp(20px,2vw,26px)] font-semibold text-[#f4efe6]" data-reveal>
          Et souvent, on s’en rend compte trop tard.
        </p>
        <LossSources className="mx-auto mt-12 max-w-[70ch] text-[12.5px] leading-relaxed text-[#d6dbd2]" linkClassName="hover:text-white" />
      </div>
    </section>
  );
}

/* ——— 3. Nos solutions : une par cause. Titres propres à l'accueil, le détail est sur /solutions. ——— */

const TILES: Array<{ to: string; photo: PhotoKey; position: string; alt: string; eyebrow: string; title: string }> = [
  { to: "/solutions#champs", photo: "arrosoirs", position: "50% 70%", alt: "Un maraîcher arrose ses légumes avec deux arrosoirs.", eyebrow: "Solution 1 · Au champ", title: "Un SMS quand il faut arroser." },
  { to: "/solutions#stockage", photo: "sac", position: "55% 30%", alt: "Une femme porte sur la tête un grand sac d’oignons rouges, vers le marché.", eyebrow: "Solution 2 · Au magasin", title: "Des oignons sains jusqu’à la vente." },
];

function Solutions() {
  return (
    <section className="bg-surface" aria-labelledby="solutions-titre">
      <div className={cn(wrap, "pb-12 pt-20 text-center lg:pb-14 lg:pt-28")} data-reveal>
        <p className={cn(eyebrow, "text-brand")}>Nos solutions</p>
        <h2 id="solutions-titre" className={cn(display, "mx-auto mt-3 max-w-[16ch]")}>
          Un SMS vous prévient avant qu’il ne soit trop tard.
        </h2>
      </div>
      <div className="mx-auto w-full max-w-[1440px] px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {TILES.map((t, i) => (
            <div key={t.to} data-reveal={i}>
              <Link to={t.to} className="group relative block overflow-hidden rounded-[28px]">
                <Photo name={t.photo} caption={false} alt={t.alt} sizes="(min-width: 768px) 50vw, 100vw" position={t.position} frameClassName="aspect-[4/5] lg:aspect-[6/7] [&>img]:transition-transform [&>img]:duration-700 group-hover:[&>img]:scale-[1.03] motion-reduce:[&>img]:transition-none" />
                <span className="absolute inset-0 bg-gradient-to-t from-[#0b2e24]/90 via-[#0b2e24]/25 to-transparent" aria-hidden />
                <span className="absolute inset-x-0 bottom-0 p-7 text-[#f4efe6] sm:p-10">
                  <span className={cn(eyebrow, "block text-[#f4efe6]")}>{t.eyebrow}</span>
                  <span className="mt-3 block max-w-[14ch] font-display text-[clamp(32px,3.8vw,52px)] font-bold leading-[1.02] tracking-[-0.035em]">{t.title}</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 font-display text-[16px] font-semibold underline-offset-4 group-hover:underline">
                    Voir la solution <ArrowRight className="size-4" aria-hidden />
                  </span>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ——— 4. Comment ça marche : trois étapes, valables pour les deux solutions ——— */

const STEPS = [
  { icon: Sprout, title: "On pose un capteur", text: "Dans le sol du champ, ou entre les sacs du magasin." },
  { icon: Eye, title: "Il surveille", text: "Jour et nuit, même quand personne n’est là." },
  { icon: MessageSquareText, title: "Vous recevez un SMS", text: "Sur le téléphone que vous avez déjà, sans internet." },
];

function Steps() {
  return (
    <section aria-labelledby="etapes-titre">
      <div className={cn(wrap, "py-24 lg:py-32")}>
        <p className={cn(eyebrow, "text-center text-brand")} data-reveal>
          Comment ça marche
        </p>
        <h2 id="etapes-titre" className={cn(display, "mt-3 text-center")} data-reveal>
          Simple comme un SMS.
        </h2>
        <ol className="relative mx-auto mt-16 grid max-w-[1000px] gap-12 md:grid-cols-3 md:gap-8">
          {/* Le tracé de la charte relie les trois étapes (ordinateur seulement). */}
          <span className="absolute left-[16.6%] right-[16.6%] top-12 hidden border-t-2 border-dashed border-line md:block" aria-hidden />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex flex-col items-center text-center" data-reveal={i}>
              <span className="relative flex size-24 items-center justify-center rounded-full bg-brand text-brand-ink ring-8 ring-bg">
                <s.icon className="size-10" aria-hidden />
                <span className="absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full bg-sun font-display text-[17px] font-bold text-[#0b2e24]" aria-hidden>
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-6 font-display text-[26px] font-semibold tracking-[-0.02em]">
                <span className="sr-only">Étape {i + 1} : </span>
                {s.title}
              </h3>
              <p className="mt-1.5 max-w-[26ch] text-[18px] leading-snug text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ——— 5. Confiance : une ligne ; l'histoire complète est sur /a-propos ——— */

const PROOFS = ["Né à l’ESP de Dakar", "Incubé à TÀGGU NDAW ÑI", "Publié au colloque COC’2026", "2e place au hackathon ISOC ESMT 2026"];

function Proofs() {
  return (
    <section className="border-t border-line" aria-labelledby="parcours-titre">
      <div className={cn(wrap, "flex flex-col items-center gap-6 py-16 text-center lg:py-20")} data-reveal>
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
          Qui sommes-nous ? <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
