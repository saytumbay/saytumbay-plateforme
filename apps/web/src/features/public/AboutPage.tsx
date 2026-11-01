/** « Notre histoire » : le problème, la méthode, satellite et capteurs, où nous en sommes, l'équipe, le pilote, la FAQ. */
import { usePageTitle } from "@/components/ui/page";
import { useReveal } from "@/lib/reveal";
import { cn } from "@/lib/cn";
import { Context, eyebrow, Faq, h1, Method, SkyAndGround, Status, Team, Together, useHashScroll, wrap } from "./blocks";

export default function AboutPage() {
  usePageTitle("Notre histoire");
  useReveal();
  useHashScroll();
  return (
    <>
      <section className={cn(wrap, "pb-10 pt-12 lg:pb-14 lg:pt-20")} aria-labelledby="histoire-titre">
        <p className={cn(eyebrow, "text-brand")}>Notre histoire</p>
        <h1 id="histoire-titre" className={cn(h1, "mt-3 max-w-[18ch]")}>
          Voir la perte avant qu’elle arrive.
        </h1>
        <p className="mt-5 max-w-[56ch] text-[18px] leading-relaxed text-ink-2">D’où vient SaytuMbay, comment nous travaillons, et où nous en sommes aujourd’hui.</p>
      </section>
      <Context />
      <Method />
      <SkyAndGround />
      <Status />
      <Team />
      <Together />
      <Faq />
    </>
  );
}
