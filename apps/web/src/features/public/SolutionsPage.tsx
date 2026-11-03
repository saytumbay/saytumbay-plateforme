/** « Nos solutions » : solution 1 pour les champs (#champs), solution 2 pour le stockage (#stockage). */
import { Link } from "react-router";
import { ArrowDown } from "lucide-react";
import { usePageTitle } from "@/components/ui/page";
import { useReveal } from "@/lib/reveal";
import { cn } from "@/lib/cn";
import { AgriTech, CtaBand, Equipment, eyebrow, h1, InAction, Onion, Beyond, useHashScroll, wrap } from "./blocks";

const JUMPS = [
  { to: "#champs", label: "Solution 1 · Les champs" },
  { to: "#stockage", label: "Solution 2 · Le stockage" },
];

export default function SolutionsPage() {
  usePageTitle("Nos solutions");
  useReveal();
  useHashScroll();
  return (
    <>
      <section className={cn(wrap, "pb-10 pt-12 lg:pb-14 lg:pt-20")} aria-labelledby="solutions-titre">
        <p className={cn(eyebrow, "text-brand")}>Solutions</p>
        <h1 id="solutions-titre" className={cn(h1, "mt-3 max-w-[20ch]")}>
          Agir avant que la récolte ne se perde.
        </h1>
        <p className="mt-5 max-w-[52ch] text-[18px] leading-relaxed text-ink-2">Deux solutions, un même principe : un capteur surveille, et vous recevez un SMS quand il faut agir.</p>
        <ul className="mt-8 flex flex-wrap gap-3">
          {JUMPS.map((j) => (
            <li key={j.to}>
              <Link to={j.to} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 font-display text-[15px] font-semibold hover:bg-surface-2">
                {j.label} <ArrowDown className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <AgriTech />
      <InAction />
      <Equipment />
      <Onion />
      <Beyond />
      <CtaBand title="Un champ ou un magasin à surveiller ?" profil="cooperative" />
    </>
  );
}
