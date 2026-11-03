/** « Nos solutions », en peu de mots : solution 1 pour les champs (#champs), solution 2 pour le stockage (#stockage). */
import { Link } from "react-router";
import { ArrowDown, BellRing, Droplets, Package, ThermometerSun, Wrench, type LucideIcon } from "lucide-react";
import { usePageTitle } from "@/components/ui/page";
import { Photo } from "@/components/ui/photo";
import type { PhotoKey } from "@/assets/photos";
import { useReveal } from "@/lib/reveal";
import { cn } from "@/lib/cn";
import { CtaBand, eyebrow, h2, PageHeader, useHashScroll, wrap } from "./blocks";

interface Solution {
  id: string;
  label: string;
  title: string;
  text: string;
  points: Array<{ icon: LucideIcon; text: string }>;
  photo: PhotoKey;
  position: string;
  alt: string;
  /** Exemple de SMS posé sur la photo, en haut ou en bas selon la zone libre de l'image. */
  sms: string;
  smsAt: "top" | "bottom";
}

const SOLUTIONS: Solution[] = [
  {
    id: "champs",
    label: "Solution 1 · Les champs",
    title: "Arroser au bon moment.",
    text: "Un capteur planté dans le sol mesure l’eau, jour et nuit. Quand la terre devient trop sèche, vous recevez un SMS.",
    points: [
      { icon: Droplets, text: "L’eau du sol, mesurée toutes les 15 minutes" },
      { icon: BellRing, text: "Un SMS quand il faut arroser, même sur un petit téléphone" },
      { icon: Wrench, text: "Avec votre pompe ou votre goutte-à-goutte, sans rien changer" },
    ],
    photo: "goutteLigne",
    position: "50% 50%",
    alt: "Une ligne de goutte-à-goutte au pied des cultures, à Dakar.",
    sms: "Parcelle B : le sol est sec. Arrosez aujourd’hui.",
    smsAt: "top",
  },
  {
    id: "stockage",
    label: "Solution 2 · Le stockage",
    title: "Garder vos oignons sains.",
    text: "Un capteur au cœur des sacs surveille la chaleur et l’humidité. Au premier signe de pourriture, vous êtes prévenu.",
    points: [
      { icon: ThermometerSun, text: "Chaleur, humidité et gaz de pourriture, au cœur des sacs" },
      { icon: BellRing, text: "Un SMS avant que le stock ne s’abîme" },
      { icon: Package, text: "Vous savez quels sacs vendre en premier" },
    ],
    photo: "sacsLegumes",
    position: "50% 40%",
    alt: "Des sacs de choux et d’oignons chargés pour le marché.",
    sms: "Magasin : la rangée 3 chauffe. Aérez cette nuit.",
    smsAt: "bottom",
  },
];

export default function SolutionsPage() {
  usePageTitle("Nos solutions");
  useReveal();
  useHashScroll();
  return (
    <>
      <PageHeader
        id="solutions-titre"
        label="Solutions"
        title="Agir avant que la récolte ne se perde."
        photo="salade"
        position="40% 50%"
        alt="Dans un champ de salade, une main tient un téléphone."
      >
        <ul className="mt-8 flex flex-wrap gap-3">
          {SOLUTIONS.map((s) => (
            <li key={s.id}>
              <Link to={`#${s.id}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 font-display text-[15px] font-semibold transition-colors hover:border-brand hover:bg-brand hover:text-brand-ink">
                {s.label} <ArrowDown className="size-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </PageHeader>
      {SOLUTIONS.map((s, i) => (
        <SolutionBlock key={s.id} s={s} flip={i % 2 === 1} />
      ))}
      <CtaBand title="Un champ ou un magasin à surveiller ?" profil="cooperative" />
    </>
  );
}

function SolutionBlock({ s, flip }: { s: Solution; flip: boolean }) {
  return (
    <section id={s.id} className={cn("scroll-mt-20 border-t border-line", flip ? "bg-bg" : "bg-surface")} aria-labelledby={`${s.id}-titre`}>
      <div className={cn(wrap, "grid items-center gap-10 py-20 lg:grid-cols-2 lg:gap-16 lg:py-24")}>
        <div className={cn(flip && "lg:order-2")} data-reveal>
          <p className={cn(eyebrow, "text-brand")}>{s.label}</p>
          <h2 id={`${s.id}-titre`} className={cn(h2, "mt-3")}>
            {s.title}
          </h2>
          <p className="mt-5 max-w-[46ch] text-[18px] leading-relaxed text-ink-2">{s.text}</p>
          <ul className="mt-8 flex flex-col gap-4">
            {s.points.map((p) => (
              <li key={p.text} className="flex items-center gap-3.5 text-[16.5px] font-medium">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong dark:text-brand" aria-hidden>
                  <p.icon className="size-5" />
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <div className={cn(flip && "lg:order-1")} data-reveal="1">
          <Photo name={s.photo} alt={s.alt} sizes="(min-width: 1024px) 560px, 100vw" position={s.position} frameClassName="aspect-[4/3] rounded-[28px]">
            <div className={cn("absolute inset-x-4 rounded-2xl bg-[#f4efe6]/95 p-4 text-[#0b2e24] shadow-3 sm:inset-x-auto sm:left-5 sm:max-w-[320px]", s.smsAt === "top" ? "top-4 sm:top-5" : "bottom-4 sm:bottom-5")}>
              <p className="text-[12.5px] font-semibold text-[#5b6660]">Exemple de SMS</p>
              <p className="mt-1 text-[16.5px] font-semibold leading-snug">{s.sms}</p>
            </div>
          </Photo>
        </div>
      </div>
    </section>
  );
}
