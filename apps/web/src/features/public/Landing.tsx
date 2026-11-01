import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Accordion } from "radix-ui";
import { ArrowRight, ArrowUpRight, BellRing, BookOpen, ChevronDown, ClipboardCheck, Droplets, Ear, FileBarChart2, FileCheck2, Gauge, MessageCircle, Radio, Scale, Signal, SlidersHorizontal, Smartphone, Sprout, Sun, ThermometerSun, Wallet, Warehouse, Waves, Wind, Zap } from "lucide-react";
import { api, IS_DEMO } from "@/lib/api";
import { homeFor, useSetSession } from "@/lib/auth";
import { usePageTitle } from "@/components/ui/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { SignTrace } from "@/components/brand/SignTrace";
import { Photo } from "@/components/ui/photo";
import { useReveal } from "@/lib/reveal";
import { EMAIL, TIDIANE, WHATSAPP } from "@/layouts/PublicLayout";
import { cn } from "@/lib/cn";
import { ContactForm } from "./ContactForm";

const wrap = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";
/** Surtitre de la charte : Sora SemiBold, capitales, approche +12 %. */
const eyebrow = "font-display text-[13px] font-semibold uppercase tracking-[0.12em]";
const h2 = "font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance";

export default function Landing() {
  usePageTitle(null);
  useReveal();
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }), 30);
    return () => window.clearTimeout(id);
  }, [hash]);
  return (
    <>
      <Hero />
      <Context />
      <InAction />
      <Method />
      <Equipment />
      <AgriTech />
      <Onion />
      <Beyond />
      <Status />
      <FieldToMarket />
      <Together />
      <Team />
      <Faq />
      <Contact />
    </>
  );
}

/** La pastille de la charte : reprise du capteur, sert de puce et d'indicateur d'état. */
function Dot({ tone = "sun", className }: { tone?: "sun" | "brand" | "ink"; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", { sun: "bg-sun", brand: "bg-brand", ink: "bg-ink-3" }[tone], className)} aria-hidden />;
}

/* ——— Héros ——— */

function Hero() {
  const navigate = useNavigate();
  const setSession = useSetSession();
  const demo = useMutation({
    mutationFn: () => api.auth.demo("responsable"),
    onSuccess: (s) => {
      setSession(s);
      navigate(homeFor(s));
    },
  });
  return (
    <section className={cn(wrap, "grid items-center gap-10 pb-16 pt-8 sm:pt-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 lg:pb-24 lg:pt-16")} aria-labelledby="hero-titre">
      <div className="max-w-[580px]">
        <p className="inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13.5px] font-semibold text-ink-2">
          <Dot />
          Plateforme prête · premiers sites pilotes en préparation
        </p>
        <h1 id="hero-titre" className="mt-6 font-display text-[clamp(40px,5.6vw,66px)] font-bold leading-[1.02] tracking-[-0.035em] text-balance">
          Voir la perte avant qu’elle arrive.
        </h1>
        <p className="mt-6 text-[clamp(17px,1.5vw,19px)] leading-relaxed text-ink-2 text-pretty">
          Un sol qui s’assèche, un tas d’oignons qui chauffe, une chambre froide qui décroche : SaytuMbay place des capteurs là où personne ne regarde, et prévient la bonne personne par SMS, avec une consigne simple, au bon moment.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/?profil=cooperative#contact" size="lg">
            Devenir site pilote
          </ButtonLink>
          {IS_DEMO ? (
            <Button variant="secondary" size="lg" loading={demo.isPending} onClick={() => demo.mutate()}>
              Essayer la démo
            </Button>
          ) : (
            <ButtonLink to="/connexion" variant="secondary" size="lg">
              Se connecter
            </ButtonLink>
          )}
        </div>
        <Link to="/#ensemble" className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand underline-offset-4 hover:underline">
          Investisseur, partenaire ou institution ? Parlons-en <ArrowRight className="size-4" aria-hidden />
        </Link>
        <p className="mt-8 text-[14.5px] leading-relaxed text-ink-3">
          <span lang="wo" className="font-semibold text-ink-2">
            Saytu mbay
          </span>
          , en wolof : veiller sur l’agriculture.
        </p>
      </div>
      <HeroPhoto />
    </section>
  );
}

/** Une vraie parcelle, et ce que SaytuMbay y ajoute : une mesure et une alerte au bon moment. */
function HeroPhoto() {
  return (
    <Photo
      name="champGoutte"
      priority
      alt="Main d’un maraîcher qui sort un oignon rouge de la terre, à côté d’un tuyau de goutte-à-goutte."
      sizes="(min-width: 1024px) 620px, 100vw"
      position="40% 55%"
      frameClassName="hero-photo aspect-[4/5] rounded-[28px] sm:aspect-[5/4] lg:aspect-[4/5]"
    >
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0b2e24]/70 to-transparent" aria-hidden />
      <p className="anim-chip absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-[#f4efe6] px-3.5 py-2 font-mono text-[13px] font-medium text-[#0b2e24] shadow-2 sm:right-5 sm:top-5">
        <span className="size-2 rounded-full bg-[#ef6a22]" aria-hidden />
        Sol · 18 % · sous le seuil
      </p>
      <div className="anim-sms absolute inset-x-4 bottom-4 rounded-2xl bg-[#f4efe6] p-4 text-[#0b2e24] shadow-3 sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-[340px]">
        <p className="flex items-center justify-between font-mono text-[11.5px] text-[#5b6660]">
          <span>SMS · SaytuMbay</span>
          <span>09:45</span>
        </p>
        <p className="mt-1.5 text-[14.5px] leading-snug">
          <span className="font-semibold">Coop. Thiès : Parcelle B est sèche (18 %).</span> Lancer une irrigation ou vérifier que la règle automatique est active.
        </p>
        <p className="mt-2 text-[11.5px] text-[#5b6660]">Exemple d’alerte, texte réel de la plateforme.</p>
      </div>
    </Photo>
  );
}

/* ——— Une journée en quatre images : sans interaction, compréhensible par tous ——— */

const DAY: Array<{ time: string; title: string; text: string; level: number; tone: "brand" | "sun"; icon: typeof Sprout; sms?: boolean }> = [
  { time: "06:00", title: "Le capteur veille", text: "Planté dans la parcelle B, il mesure l’eau du sol toutes les 15 minutes. Tout va bien.", level: 36, tone: "brand", icon: Sprout },
  { time: "13:00", title: "Le sol sèche", text: "Chaleur, vent : l’eau baisse et passe sous le seuil choisi pour la tomate.", level: 29, tone: "sun", icon: Sun },
  { time: "13:01", title: "Awa reçoit un SMS", text: "Sur un simple téléphone, avec la consigne : arroser aujourd’hui.", level: 29, tone: "sun", icon: Smartphone, sms: true },
  { time: "17:00", title: "On arrose, c’est vérifié", text: "Le sol remonte à 38 %. L’alerte se ferme toute seule et tout est noté.", level: 38, tone: "brand", icon: Droplets },
];

/** Jauge « eau dans le sol » : une barre qui se remplit, le seuil marqué d'un trait. Lisible sans légende. */
function SoilLevel({ level, tone }: { level: number; tone: "brand" | "sun" }) {
  const pct = (v: number) => `${Math.min(100, (v / 50) * 100)}%`;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-ink-3">Eau dans le sol</span>
        <span className={cn("font-mono text-[18px] font-medium", tone === "sun" ? "text-sun-ink" : "text-brand-strong dark:text-brand")}>{level} %</span>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-surface-3">
        <div className={cn("h-full rounded-full", tone === "sun" ? "bg-sun" : "bg-brand")} style={{ width: pct(level) }} />
        <span className="absolute -top-1 bottom-[-4px] w-0.5 rounded bg-ink" style={{ left: pct(30) }} aria-hidden />
      </div>
      <p className="mt-1.5 text-[12px] text-ink-3" style={{ paddingLeft: `calc(${pct(30)} - 14px)` }}>
        seuil 30 %
      </p>
    </div>
  );
}

function InAction() {
  return (
    <section id="en-action" className="scroll-mt-20" aria-labelledby="action-titre">
      <div className={cn(wrap, "py-20 lg:py-28")}>
        <div className="max-w-[60ch]" data-reveal>
          <p className={cn(eyebrow, "text-brand")}>Comment ça marche</p>
          <h2 id="action-titre" className={cn(h2, "mt-3")}>
            Une journée sur une parcelle de tomates.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">Pas besoin d’être connecté ni de regarder un écran : le capteur surveille, et vous prévient quand il faut agir.</p>
        </div>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DAY.map((s, i) => (
            <li key={s.time} className="flex flex-col rounded-[20px] border border-line bg-surface p-5" data-reveal={i}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[15px] font-medium text-ink-2">{s.time}</span>
                <span className={cn("flex size-10 items-center justify-center rounded-full", s.tone === "sun" ? "bg-sun-soft text-sun-ink" : "bg-brand-soft text-brand-strong dark:text-brand")}>
                  <s.icon className="size-5" aria-hidden />
                </span>
              </div>
              <h3 className="mt-4 font-display text-[18px] font-semibold">
                <span className="sr-only">Étape {i + 1} : </span>
                {s.title}
              </h3>
              <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-ink-2">{s.text}</p>
              <div className="mt-5">
                {s.sms ? (
                  <div className="rounded-xl bg-[#0b2e24] p-3 text-[#f4efe6] dark:bg-[#1d4a3b]">
                    <p className="font-mono text-[11px] text-[#aab8b0]">SMS · SaytuMbay</p>
                    <p className="mt-1 text-[13.5px] leading-snug">Parcelle B sèche (29 %). Arroser aujourd’hui.</p>
                  </div>
                ) : (
                  <SoilLevel level={s.level} tone={s.tone} />
                )}
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 font-mono text-[12.5px] text-ink-3">Exemple. Le seuil se règle selon la culture et la parcelle.</p>
      </div>
    </section>
  );
}

/* ——— Le problème, chiffre sourcé ——— */

function Context() {
  return (
    <section className="border-y border-line bg-surface" aria-label="Le problème">
      <div className={cn(wrap, "py-16 lg:py-24")}>
        <p className={cn(eyebrow, "text-brand")}>Le problème</p>
        <p className="mt-4 max-w-[30ch] font-display text-[clamp(26px,3.3vw,42px)] font-semibold leading-[1.15] tracking-[-0.025em] text-balance">
          Au Sénégal, 30 à 40 % de la production horticole se perd après la récolte.
          <sup className="ml-0.5 align-super text-[0.45em] font-medium text-ink-3">
            <a href="#source-1" aria-describedby="source-1">
              1
            </a>
          </sup>
        </p>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
          <div className="flex flex-col gap-6 text-[16.5px] leading-relaxed text-ink-2" data-reveal>
          <p>Une bonne partie se joue sans témoin : une parcelle qui sèche pendant un après-midi d’harmattan, une vanne restée ouverte toute la nuit, un sol qui se charge en sel au fil des saisons.</p>
          <p>Dans les magasins, l’oignon commence à pourrir au cœur des sacs, là où personne ne regarde. Quand l’odeur arrive à la porte, une partie du stock est déjà perdue.</p>
          </div>
          <div data-reveal="1">
            <Photo name="niague" alt="Champ d’oignons à Niague Noflaye, avec des maraîchers au travail au fond de la parcelle." sizes="(min-width: 1024px) 560px, 100vw" position="50% 60%" frameClassName="aspect-[16/10] rounded-[24px]" />
          </div>
        </div>
        <p className="mt-10 max-w-[62ch] border-l-4 border-sun pl-5 font-display text-[clamp(19px,2vw,23px)] font-semibold leading-snug text-ink">Ces pertes préviennent presque toujours. Notre travail : rendre ces signaux visibles assez tôt pour agir.</p>
        <p id="source-1" className="mt-10 max-w-[80ch] text-[13px] text-ink-3">
          1. Estimation publique relayée par Le Soleil lors du lancement du projet national de stockage et de conservation des produits horticoles, Ngomène, 17 février 2026 (
          <a href="https://fr.allafrica.com/stories/202602170606.html" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
            article sur AllAfrica
          </a>
          ). L’auteur du chiffre n’est pas précisé : il s’agit d’une estimation.
        </p>
      </div>
    </section>
  );
}

/* ——— Méthode : les verbes de la charte, dans l'ordre ——— */

const METHOD = [
  { icon: Ear, title: "Écouter", text: "Une visite sur place pour comprendre ce qui vous coûte le plus cher : l’eau, la chaleur, les pertes en stock, une panne de froid." },
  { icon: Gauge, title: "Mesurer", text: "Des capteurs dans le sol, au cœur des sacs, dans la chambre froide ou sur le forage. Sur pile, sans câble." },
  { icon: Radio, title: "Transmettre", text: "Radio longue portée (LoRaWAN) ou réseau mobile selon la zone. Pas besoin d’internet sur la parcelle." },
  { icon: BellRing, title: "Alerter", text: "Un SMS lisible sur n’importe quel téléphone, même à touches, avec une consigne claire. En français, et bientôt en wolof." },
  { icon: FileCheck2, title: "Prouver", text: "Un historique daté de chaque mesure et de chaque action : pour suivre une saison, rassurer un acheteur ou convaincre un financeur." },
];

function Method() {
  return (
    <section id="methode" className="scroll-mt-20" aria-labelledby="methode-titre">
      <div className={cn(wrap, "py-20 lg:py-28")}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div>
            <p className={cn(eyebrow, "text-brand")}>Notre méthode</p>
            <h2 id="methode-titre" className={cn(h2, "mt-3")}>
              On part de votre problème, pas d’un gadget.
            </h2>
          </div>
          <p className="max-w-[56ch] text-[17px] leading-relaxed text-ink-2">Chaque exploitation, chaque magasin a ses pertes, ses contraintes et son budget. Nous commençons par comprendre ce qui vous coûte le plus cher, puis nous assemblons la solution qui y répond, du capteur jusqu’au rapport.</p>
        </div>
        <ol className="relative mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          <span className="absolute left-0 right-0 top-[21px] hidden h-0.5 bg-brand/25 lg:block" aria-hidden />
          {METHOD.map((s, i) => (
            <li key={s.title} className="relative" data-reveal={i}>
              <span className="relative flex size-11 items-center justify-center rounded-full bg-brand text-brand-ink">
                <s.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 flex items-baseline gap-2 font-display text-[19px] font-semibold">
                <span className="font-mono text-[13px] font-medium text-ink-3">0{i + 1}</span>
                {s.title}
              </h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-14 max-w-[80ch] border-t border-line pt-6 text-[14px] leading-relaxed text-ink-3">
          Matériel de référence pour l’irrigation : sondes de sol Dragino LSE01, passerelle Dragino LPS8, serveur réseau ChirpStack. Le matériel est choisi selon le site ; notre travail est de le faire fonctionner ensemble, de l’installer et de le maintenir.
        </p>
      </div>
    </section>
  );
}

/* ——— Le matériel déjà en place, et ce que l'on regarde à la visite ——— */

const VISIT: Array<{ icon: typeof Sprout; title: string; text: string }> = [
  { icon: Waves, title: "La source d’eau", text: "Forage, puits, canal, réseau : débit et heures disponibles." },
  { icon: Droplets, title: "La façon d’arroser", text: "Arrosoir, gravitaire, aspersion, goutte-à-goutte, programmateur." },
  { icon: Zap, title: "L’énergie", text: "Réseau électrique, panneaux solaires ou groupe électrogène." },
  { icon: Signal, title: "Le réseau mobile", text: "4G, 2G ou rien : pour placer la passerelle au bon endroit." },
  { icon: Sprout, title: "Les cultures et le sol", text: "Espèces, saisons, type de sol et salinité, pour régler les seuils." },
  { icon: Warehouse, title: "Le stockage", text: "Magasin, chambre froide, durée de conservation visée." },
  { icon: Smartphone, title: "Qui reçoit les alertes", text: "Type de téléphone, langue, horaires de chacun." },
  { icon: Wallet, title: "Le budget", text: "Ce qui est rentable pour vous, et les aides possibles." },
];

function Equipment() {
  return (
    <section className="border-t border-line bg-surface" aria-labelledby="materiel-titre">
      <div className={cn(wrap, "grid gap-12 py-20 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 lg:py-28")}>
        <div data-reveal>
          <p className={cn(eyebrow, "text-brand")}>Votre installation</p>
          <h2 id="materiel-titre" className={cn(h2, "mt-3")}>
            Vous avez déjà une pompe ou un arrosage automatique ? On part de là.
          </h2>
          <div className="mt-5 flex max-w-[52ch] flex-col gap-4 text-[17px] leading-relaxed text-ink-2">
            <p>Pas besoin de tout changer. Les capteurs s’ajoutent à votre installation, et la plateforme tient compte de la façon dont vous arrosez déjà.</p>
            <p>Quand le matériel le permet, l’arrosage peut ensuite se commander depuis l’application. Sinon, l’alerte dit simplement quoi faire, et vous le faites comme d’habitude.</p>
          </div>
        </div>
        <div data-reveal="1">
          <h3 className="font-display text-[18px] font-semibold">Ce que nous regardons pendant la visite</h3>
          <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {VISIT.map((v) => (
              <li key={v.title} className="flex gap-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong dark:text-brand" aria-hidden>
                  <v.icon className="size-5" />
                </span>
                <span>
                  <span className="block font-display text-[16px] font-semibold">{v.title}</span>
                  <span className="mt-0.5 block text-[15px] leading-relaxed text-ink-2">{v.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ——— AgriTech ——— */

const AGRI_FEATURES = [
  { icon: Droplets, title: "Humidité, température et salinité du sol", text: "Mesurées à 20 cm toutes les 15 minutes. La salinité aide à suivre les sols des Niayes qui se chargent en sel." },
  { icon: SlidersHorizontal, title: "Une plage visée par parcelle", text: "Oignon, tomate, chou ou piment n’ont pas les mêmes besoins. Les seuils se règlent parcelle par parcelle." },
  { icon: BellRing, title: "Alertes par SMS, tâches pour le technicien", text: "Le responsable de la parcelle est prévenu, même sur un téléphone à touches. Un capteur muet devient une tâche de maintenance." },
  { icon: Gauge, title: "Irrigation suivie", text: "Durée conseillée, journal des arrosages et effet mesuré sur le sol. Les vannes connectées se commandent depuis l’application, en option." },
  { icon: FileBarChart2, title: "Rapports de saison", text: "Eau utilisée, jours passés sous le seuil, alertes traitées. Export CSV ou PDF pour la coopérative et ses partenaires." },
];

function AgriTech() {
  return (
    <section id="agritech" className="scroll-mt-20 border-t border-line bg-surface" aria-labelledby="agri-titre">
      <div className={cn(wrap, "grid gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-28")}>
        <div>
          <p className={cn(eyebrow, "text-brand")}>Solution 1 · SaytuMbay AgriTech</p>
          <h2 id="agri-titre" className={cn(h2, "mt-3")}>
            Arroser juste, parcelle par parcelle.
          </h2>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">Pour les coopératives et les exploitations maraîchères qui irriguent : savoir où arroser, combien, et le vérifier. Moins d’eau perdue, moins de cultures stressées.</p>
          <dl className="mt-10 flex flex-col gap-6">
            {AGRI_FEATURES.map((f) => (
              <div key={f.title} className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4">
                <dt className="contents">
                  <span className="row-span-2 flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-strong dark:text-brand" aria-hidden>
                    <f.icon className="size-5" />
                  </span>
                  <span className="font-display text-[16.5px] font-semibold">{f.title}</span>
                </dt>
                <dd className="mt-1 text-[15.5px] leading-relaxed text-ink-2">{f.text}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col gap-6 self-start" data-reveal="1">
          <Photo name="rangs" alt="Rangs d’oignons dans une parcelle de Diamniadio, avec leurs lignes d’irrigation au goutte-à-goutte." sizes="(min-width: 1024px) 560px, 100vw" frameClassName="aspect-[16/9] rounded-[24px]" />
          <ProductPeek />
        </div>
      </div>
    </section>
  );
}

const PEEK = [
  { code: "B", crop: "Tomate", value: 18, state: "À irriguer", tone: "sun", color: "var(--sun)", pts: [36, 35, 33.5, 32, 30, 28, 25.5, 23, 21, 19.5, 18.4] },
  { code: "A", crop: "Oignon", value: 34, state: "Bonne humidité", tone: "brand", color: "var(--brand)", pts: [37, 36.5, 39, 38, 36.5, 35.5, 38.5, 37, 35.5, 34.5, 34] },
  { code: "D", crop: "Piment", value: 48, state: "Trop humide", tone: "water", color: "var(--water)", pts: [44, 45, 47, 49, 50, 49.5, 49, 48.6, 48.4, 48.2, 48] },
] as const;

function MiniSpark({ pts, color }: { pts: readonly number[]; color: string }) {
  const w = 220;
  const h = 56;
  const lo = 14;
  const hi = 54;
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  const d = pts.map((v, i) => `${i ? "L" : "M"}${((i / (pts.length - 1)) * w).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none" aria-hidden>
      <rect x="0" y={y(45)} width={w} height={y(30) - y(45)} fill="var(--brand)" opacity="0.09" />
      <path d={d} fill="none" stroke="var(--ink-2)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={w} cy={y(pts[pts.length - 1]!)} r="4" fill={color} stroke="var(--surface)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function ProductPeek() {
  return (
    <figure className="self-start">
      <div className="rounded-[24px] border border-line bg-surface p-4 shadow-2 sm:p-5">
        <div className="flex items-center justify-between gap-3 px-1 pb-4">
          <div>
            <p className="font-display text-[15px] font-semibold">Exploitation de Mboro</p>
            <p className="text-[13px] text-ink-3">Coopérative de Thiès · 6 parcelles</p>
          </div>
          <span className="rounded-full bg-sun-soft px-2.5 py-1 text-[12.5px] font-semibold text-sun-ink">1 parcelle à irriguer</span>
        </div>
        <div className="mb-3 flex items-start gap-3 rounded-xl border border-sun/35 bg-sun-soft/60 px-3.5 py-3 text-[13.5px]">
          <BellRing className="mt-0.5 size-4 shrink-0 text-sun-ink" aria-hidden />
          <p>
            <span className="font-semibold">Parcelle B est sèche (18 %).</span> <span className="text-ink-2">SMS envoyé à Awa Ndiaye, il y a 4 min.</span>
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {PEEK.map((p) => (
            <li key={p.code} className="rounded-xl border border-line p-3.5">
              <p className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="whitespace-nowrap font-display text-[15px] font-semibold">Parcelle {p.code}</span>
                <span className="text-[12px] text-ink-3">{p.crop}</span>
              </p>
              <p className="mt-2 font-mono text-[26px] font-medium leading-none tabular">
                {p.value}
                <span className="ml-0.5 text-[15px] font-medium text-ink-3">%</span>
              </p>
              <p className={cn("mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold", { sun: "text-sun-ink", brand: "text-brand-strong dark:text-brand", water: "text-water-ink" }[p.tone])}>
                <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
                {p.state}
              </p>
              <div className="mt-2">
                <MiniSpark pts={p.pts} color={p.color} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 px-1 text-[12.5px] text-ink-3">Courbes des 7 derniers jours. La bande verte est la plage visée (30 à 45 %).</p>
      </div>
      <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-3 px-1 text-[14px] text-ink-2">
        <span>Extrait du tableau de bord, données de démonstration.</span>
        <Link to="/connexion" className="inline-flex items-center gap-1 font-semibold text-brand underline-offset-2 hover:underline">
          Ouvrir la démo complète <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </figcaption>
    </figure>
  );
}

/* ——— Onion ——— */

const ONION_FEATURES = [
  { icon: ThermometerSun, title: "Température et humidité au cœur du tas", text: "Une sonde par rangée de sacs. Plages préréglées : oignon 24 à 30 °C et 65 à 72 %, pomme de terre 8 à 14 °C et 85 à 95 %." },
  { icon: Wind, title: "CO₂ et gaz de dégradation", text: "Ils montent quand les bulbes respirent trop ou commencent à pourrir, souvent avant que rien ne se voie." },
  { icon: ClipboardCheck, title: "Lots et contrôles visuels", text: "Chaque lot garde sa date d’entrée, sa durée visée et ses contrôles. Le magasinier sait quoi vendre en premier." },
  { icon: Scale, title: "Des gains mesurés honnêtement", text: "Pendant chaque pilote, un magasin équipé est comparé à un magasin témoin, pesée à l’entrée et à la sortie. Pas de chiffre sans cette comparaison." },
];

function Onion() {
  return (
    <section id="onion" className="scroll-mt-20 border-t border-line" aria-labelledby="onion-titre">
      <div className={cn(wrap, "grid gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-28")}>
        <div className="lg:order-2">
          <p className={cn(eyebrow, "text-onion dark:text-onion-ink")}>Solution 2 · SaytuMbay Onion</p>
          <h2 id="onion-titre" className={cn(h2, "mt-3")}>
            Sauver le stock avant qu’il ne pourrisse.
          </h2>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">Pour les magasins d’oignon et de pomme de terre des coopératives, des GIE et des stockeurs : voir ce qui se passe au cœur des sacs, et vendre en premier ce qui risque de s’abîmer.</p>
          <ul className="mt-10 grid gap-x-8 gap-y-7 sm:grid-cols-2">
            {ONION_FEATURES.map((f) => (
              <li key={f.title}>
                <f.icon className="size-5 text-onion dark:text-onion-ink" aria-hidden />
                <h3 className="mt-3 font-display text-[16px] font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-6 self-start lg:order-1" data-reveal="1">
          <Photo name="sac" alt="Une femme porte sur la tête un grand sac d’oignons rouges." sizes="(min-width: 1024px) 560px, 100vw" position="50% 30%" frameClassName="aspect-[16/10] rounded-[24px]" />
          <div className="rounded-[20px] border border-line bg-surface p-4 sm:p-5">
            <StoreIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}

function StoreIllustration() {
  const rows = [
    { id: "R1", temp: 27, hum: 68, tone: "ok" },
    { id: "R2", temp: 28, hum: 70, tone: "ok" },
    { id: "R3", temp: 31, hum: 74, tone: "hot" },
    { id: "R4", temp: 26, hum: 67, tone: "ok" },
  ] as const;
  return (
    <figure>
      <svg viewBox="0 0 520 330" className="h-auto w-full" role="img" aria-label="Coupe d’un magasin de stockage : quatre rangées de sacs, la rangée 3 chauffe à 31 °C avec 74 % d’humidité.">
        <path d="M20 112 L260 22 L500 112" fill="none" stroke="var(--line-strong)" strokeWidth="2" strokeLinejoin="round" />
        <line x1="40" y1="112" x2="40" y2="292" stroke="var(--line-strong)" strokeWidth="2" />
        <line x1="480" y1="112" x2="480" y2="292" stroke="var(--line-strong)" strokeWidth="2" />
        <line x1="12" y1="292" x2="508" y2="292" stroke="var(--line-strong)" strokeWidth="2" />
        {[0, 1, 2].map((k) => (
          <rect key={k} x={160 + k * 80} y={58 + (k === 1 ? -14 : 0)} width="24" height="10" rx="2" fill="var(--surface-3)" />
        ))}
        {rows.map((r, i) => {
          const x0 = 62 + i * 106;
          const hot = r.tone === "hot";
          return (
            <g key={r.id}>
              {hot && <rect x={x0 - 8} y={128} width={98} height={160} rx={12} fill="var(--sun)" opacity="0.13" />}
              {Array.from({ length: 5 }).map((_, row) =>
                Array.from({ length: 2 }).map((__, col) => (
                  <rect key={`${row}-${col}`} x={x0 + col * 42} y={256 - row * 28} width="40" height="26" rx="9" fill={hot && row >= 1 && row <= 3 ? "color-mix(in oklab, var(--onion) 34%, var(--surface))" : "color-mix(in oklab, var(--onion) 16%, var(--surface))"} stroke="var(--surface)" strokeWidth="2" />
                )),
              )}
              <line x1={x0 + 41} y1={136} x2={x0 + 41} y2={214} stroke="var(--ink-2)" strokeWidth="2" />
              <circle cx={x0 + 41} cy={214} r="5" fill={hot ? "var(--sun)" : "var(--brand)"} stroke="var(--surface)" strokeWidth="2" />
              <text x={x0 + 41} y={124} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="600" fontSize="15" fill={hot ? "var(--sun-ink)" : "var(--ink)"}>
                {r.temp} °C
              </text>
              <text x={x0 + 41} y={312} textAnchor="middle" fontFamily="var(--font-sans)" fontSize="12.5" fill="var(--ink-3)">
                Rangée {i + 1} · {r.hum} %
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 text-[14px] leading-relaxed text-ink-2">
        Magasin de Potou, rangée 3 : 31 °C au cœur des sacs pour une plage visée de 24 à 30 °C. L’alerte propose d’aérer la nuit et de contrôler les sacs de cette rangée.
      </figcaption>
    </figure>
  );
}

/* ——— Au-delà des deux solutions : le périmètre de la charte ——— */

function Beyond() {
  return (
    <section className="border-t border-line bg-surface" aria-labelledby="au-dela-titre">
      <div className={cn(wrap, "grid gap-8 py-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:py-20")}>
        <div>
          <p className={cn(eyebrow, "text-brand")}>Et votre problème ?</p>
          <h2 id="au-dela-titre" className="mt-3 font-display text-[clamp(24px,2.6vw,32px)] font-semibold leading-[1.15] tracking-[-0.02em] text-balance">
            Chambre froide, forage, bidon de lait, pompe isolée : le même socle s’adapte.
          </h2>
          <p className="mt-4 max-w-[64ch] text-[16.5px] leading-relaxed text-ink-2">Mêmes capteurs, même réseau, même plateforme. Décrivez-nous la situation : nous vous dirons franchement si nous pouvons aider, et comment.</p>
        </div>
        <ButtonLink to="/?profil=autre#contact" size="lg" variant="secondary" icon={<ArrowRight className="size-4" aria-hidden />}>
          Nous soumettre un problème
        </ButtonLink>
      </div>
    </section>
  );
}

/* ——— Où nous en sommes : transparence sur le stade du projet ——— */

const STATUS: Array<{ title: string; tone: "brand" | "sun" | "ink"; items: string[] }> = [
  {
    title: "Prêt aujourd’hui",
    tone: "brand",
    items: [
      "Tableau de bord sur ordinateur et sur téléphone, installable comme une application.",
      "Alertes SMS envoyées au bon responsable, selon son rôle.",
      "Suivi de l’irrigation, des magasins, des lots et des tâches ; rapports exportables.",
      "Compatible avec des capteurs LoRaWAN du marché (Dragino, ChirpStack).",
      "Démonstration en ligne, ouverte à tous.",
    ],
  },
  {
    title: "En cours",
    tone: "sun",
    items: [
      "SMS d’alerte en wolof, en relecture.",
      "Intégration du moteur du prototype présenté au COC’2026 : repérage automatique des mesures anormales par apprentissage automatique, et risque de maladies fongiques.",
      "Préparation des premiers sites pilotes avec des coopératives.",
    ],
  },
  {
    title: "Ce que nous cherchons",
    tone: "ink",
    items: ["Des coopératives, GIE et stockeurs pour nos premiers pilotes.", "Des financements pour équiper ces premiers sites.", "Des partenaires techniques et de terrain."],
  },
];

const SUPPORT = ["Incubateur TÀGGU NDAW ÑI, Université Cheikh Anta Diop", "AfriConnect+, programme de soutien à l’Internet des objets en Afrique", "Communication au colloque COC’2026, IUT de l’Université Iba Der Thiam, Thiès", "Dakar Night Market 2026, programme accompagné par l’ADEPME", "2e place, hackathon ISOC ESMT 2026"];

/** Article présenté au COC'2026 et archivé sur HAL (métadonnées vérifiées sur l'archive ouverte). */
const PAPER = {
  title: "SaytuMbay : une plateforme IoT-IA pour l’agriculture de précision au Sénégal",
  /** Forme courte d'usage : la liste complète des auteurs reste sur la notice HAL. */
  authors: "Tidiane Sow, Ibrahima Fall et al.",
  venue: "Colloque sur les Objets et systèmes Connectés COC’2026 · Thiès, 25-26 mars 2026",
  url: "https://hal.science/hal-05571878v1",
};

function Status() {
  return (
    <section id="etat" className="scroll-mt-20 border-t border-line" aria-labelledby="etat-titre">
      <div className={cn(wrap, "py-20 lg:py-28")}>
        <p className={cn(eyebrow, "text-brand")}>Où nous en sommes</p>
        <h2 id="etat-titre" className={cn(h2, "mt-3 max-w-[22ch]")}>
          Une jeune startup, une plateforme déjà construite.
        </h2>
        <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-ink-2">SaytuMbay démarre, et nous préférons le dire clairement : voici ce qui existe aujourd’hui, et ce qui reste à faire avec vous.</p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STATUS.map((c, i) => (
            <div key={c.title} className="rounded-[20px] border border-line bg-surface p-6" data-reveal={i}>
              <h3 className="flex items-center gap-2.5 font-display text-[18px] font-semibold">
                <Dot tone={c.tone} />
                {c.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3 text-[15.5px] leading-relaxed text-ink-2">
                {c.items.map((it) => (
                  <li key={it} className="border-t border-line pt-3 first:border-0 first:pt-0">
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <a href={PAPER.url} target="_blank" rel="noopener noreferrer" className="group mt-5 flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-6 hover:border-brand sm:flex-row sm:items-center sm:justify-between" data-reveal>
          <span className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-strong dark:text-brand">
              <BookOpen className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-mono text-[12.5px] text-ink-3">Publication scientifique · archive ouverte HAL</span>
              <span className="mt-1 block font-display text-[17px] font-semibold leading-snug text-ink">{PAPER.title}</span>
              <span className="mt-1 block text-[14.5px] text-ink-2">{PAPER.authors}</span>
              <span className="mt-0.5 block text-[14px] text-ink-3">{PAPER.venue}</span>
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-display text-[15px] font-semibold text-brand group-hover:underline">
            Lire l’article <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </a>
        <div className="mt-12">
          <h3 className="font-display text-[16px] font-semibold">Accompagnement et distinctions</h3>
          <ul className="mt-4 flex flex-wrap gap-2.5">
            {SUPPORT.map((s) => (
              <li key={s} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[14px] text-ink-2">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ——— Du champ au marché : ce que l'on protège ——— */

function FieldToMarket() {
  return (
    <section className="border-t border-line bg-surface" aria-labelledby="champ-titre">
      <div className={cn(wrap, "py-20 lg:py-28")}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16" data-reveal>
          <div>
            <p className={cn(eyebrow, "text-brand")}>Ce que nous protégeons</p>
            <h2 id="champ-titre" className={cn(h2, "mt-3")}>
              Le travail de toute une saison, du champ jusqu’au marché.
            </h2>
          </div>
          <p className="max-w-[52ch] text-[17px] leading-relaxed text-ink-2">Chaque parcelle bien arrosée, chaque sac qui ne pourrit pas, c’est un revenu qui reste chez le producteur et une récolte qui arrive sur les étals.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-start">
          <div data-reveal>
            <Photo name="diamniadio" alt="Jeunes plants d’oignon alignés dans une parcelle de Diamniadio." sizes="(min-width: 768px) 460px, 100vw" frameClassName="aspect-[4/5] rounded-[24px]" />
          </div>
          <div data-reveal="1">
            <Photo name="marche" alt="Étals de légumes frais et vendeuses au marché de Case Ba, aux Parcelles Assainies, à Dakar." sizes="(min-width: 768px) 700px, 100vw" frameClassName="aspect-[3/2] rounded-[24px]" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ——— Travaillons ensemble : trois publics, trois portes d'entrée ——— */

const AUDIENCES: Array<{ title: string; text: string; cta: string; to: string }> = [
  { title: "Producteurs, coopératives, stockeurs", text: "Devenez l’un de nos premiers sites pilotes : installation, formation et suivi, à prix réduit. Les objectifs sont fixés ensemble avant la pose.", cta: "Proposer mon site", to: "/?profil=cooperative#contact" },
  { title: "Investisseurs, bailleurs, incubateurs", text: "Financez l’équipement des premiers sites et la croissance d’une équipe qui conçoit, installe et maintient ses solutions au Sénégal.", cta: "Recevoir notre présentation", to: "/?profil=financeur#contact" },
  { title: "États, collectivités, ONG, programmes", text: "Équipez un programme de stockage, d’irrigation ou de chaîne du froid, avec des données mesurées sur le terrain plutôt qu’estimées.", cta: "Parler de votre programme", to: "/?profil=institution#contact" },
];

const PILOT = [
  { title: "Visite et cadrage", text: "Sur place, nous choisissons les indicateurs et estimons le gain attendu avec vous." },
  { title: "Objectifs fixés ensemble", text: "Avant la pose, on écrit ce qu’on veut voir à la fin : alertes reçues à temps, arrosages mieux placés, sacs sauvés. Pilote à prix réduit." },
  { title: "Trente jours de test", text: "Capteurs, alertes et accès à la plateforme, avec une formation de l’équipe sur place." },
  { title: "Bilan, puis abonnement", text: "On regarde ensemble si les objectifs sont atteints. Si oui, le service continue : supervision, maintenance et rapports." },
];

function Together() {
  return (
    <section id="ensemble" className="relative scroll-mt-20 overflow-hidden bg-[#0f5a44] text-[#f4efe6]" aria-labelledby="ensemble-titre">
      <SignTrace className="-right-40 -top-24 hidden w-[620px] opacity-70 lg:block" color="#ef6a22" />
      <div className={cn(wrap, "relative py-20 lg:py-28")}>
        <p className={cn(eyebrow, "text-[#f4efe6]")}>Travaillons ensemble</p>
        <h2 id="ensemble-titre" className={cn(h2, "mt-3 max-w-[20ch] text-[#f4efe6]")}>
          Chacun peut nous aider à aller plus loin.
        </h2>
        <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-[#dfe6dc]">Nous cherchons trois types de partenaires. Si vous vous reconnaissez, écrivez-nous : nous répondons à chaque message.</p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {AUDIENCES.map((a, i) => (
            <div key={a.title} className="flex flex-col rounded-[20px] bg-[#f4efe6] p-6 text-[#0b2e24]" data-reveal={i}>
              {/* Couleur fixée : la carte reste sable en thème sombre, le titre ne doit pas prendre l'encre claire du thème. */}
              <h3 className="font-display text-[19px] font-semibold leading-snug text-[#0b2e24]">{a.title}</h3>
              <p className="mt-3 flex-1 text-[15.5px] leading-relaxed text-[#3c4a44]">{a.text}</p>
              <Link to={a.to} className="mt-6 inline-flex items-center gap-1.5 font-display text-[15px] font-semibold text-[#0f5a44] underline-offset-4 hover:underline">
                {a.cta} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-16">
          <h3 className="font-display text-[20px] font-semibold text-[#f4efe6]">Comment se passe un pilote</h3>
          <ol className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {PILOT.map((p, i) => (
              <li key={p.title} className="border-t-2 border-[#ef6a22] pt-4">
                <p className="font-mono text-[13px] text-[#dfe6dc]">Étape {i + 1}</p>
                <p className="mt-1 font-display text-[16.5px] font-semibold">{p.title}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#dfe6dc]">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ——— Équipe et vision ——— */

const TEAM = [
  { name: "Tidiane Sow", role: "Directeur général (CEO)" },
  { name: "Ibrahima Fall", role: "Directeur technique (CTO)" },
];

function Team() {
  return (
    <section id="equipe" className="scroll-mt-20" aria-labelledby="equipe-titre">
      <div className={cn(wrap, "grid gap-14 py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20 lg:py-28")}>
        <div>
          <p className={cn(eyebrow, "text-brand")}>L’équipe</p>
          <h2 id="equipe-titre" className={cn(h2, "mt-3")}>
            Nés à Dakar. Construits pour grandir.
          </h2>
          <div className="mt-5 flex max-w-[58ch] flex-col gap-4 text-[17px] leading-relaxed text-ink-2">
            <p>Réseaux, objets connectés, logiciel : nous concevons la solution, l’installons avec des techniciens partenaires et la maintenons dans la durée.</p>
            <p>Nous nous sommes rencontrés en master à l’École supérieure polytechnique (ESP) de l’Université Cheikh Anta Diop de Dakar, où SaytuMbay est né.</p>
            <p>Nous commençons au Sénégal, avec des organisations d’ici. Mais l’eau qui manque, la chaleur qui abîme et les récoltes qui se perdent sont les mêmes partout où l’on cultive. C’est pour cela que nous construisons une solution capable d’aller bien au-delà.</p>
          </div>
        </div>
        <ul className="flex flex-col gap-4 self-end">
          {TEAM.map((m, i) => (
            <li key={m.name} className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-5" data-reveal={i}>
              <span className={cn("flex size-14 shrink-0 items-center justify-center rounded-full font-display text-[18px] font-semibold", i ? "bg-sun-soft text-sun-ink" : "bg-brand-soft text-brand-strong dark:text-brand")} aria-hidden>
                {m.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </span>
              <span>
                <span className="block font-display text-[17.5px] font-semibold">{m.name}</span>
                <span className="block text-[15px] text-ink-3">{m.role}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ——— Questions fréquentes ——— */

const FAQ = [
  { q: "Où en est SaytuMbay ?", a: "La plateforme est construite et se découvre en démonstration. Le projet a été présenté au colloque COC’2026 à Thiès, et l’article est en accès libre sur HAL. Nous préparons nos premiers sites pilotes avec des coopératives : c’est le bon moment pour nous rejoindre, comme utilisateur, partenaire ou financeur." },
  { q: "J’ai déjà une pompe ou un arrosage automatique. Est-ce utile ?", a: "Oui. Les capteurs s’ajoutent à votre installation sans rien remplacer : ils disent quand arroser et vérifient que l’eau arrive bien dans le sol. Quand le matériel le permet, l’arrosage peut aussi se commander depuis l’application." },
  { q: "Faut-il internet sur la parcelle ?", a: "Non. Les capteurs parlent par radio LoRaWAN à une passerelle installée dans un local proche, qui envoie les mesures par la 4G. Les alertes arrivent par SMS, sans application ni données mobiles." },
  { q: "Qui reçoit les alertes ?", a: "La personne responsable de la parcelle ou du magasin, désignée par votre organisation. Chaque membre voit uniquement ce qui le concerne : un exploitant ses parcelles, un technicien les capteurs, le responsable l’ensemble." },
  { q: "Pour quelles cultures et quels usages ?", a: "Le maraîchage irrigué (oignon, tomate, chou, piment, gombo…) et le stockage d’oignon et de pomme de terre. Pour une chambre froide, un forage ou un autre équipement, parlons-en : le même socle s’adapte." },
  { q: "Et si un capteur tombe en panne ?", a: "La plateforme le signale dès qu’il ne répond plus ou que sa pile faiblit, et crée une tâche pour le technicien. Un capteur remplacé garde l’historique de l’ancien." },
  { q: "À qui appartiennent les données ?", a: "À votre organisation. Vous pouvez les exporter à tout moment. Leur traitement suit la loi sénégalaise n° 2008-12 sur les données personnelles ; le détail est dans notre politique de confidentialité." },
  { q: "Combien ça coûte ?", a: "Cela dépend du nombre de capteurs et du site. Chaque projet commence par une visite, puis un pilote à prix réduit avec des objectifs fixés ensemble. Écrivez-nous pour en parler." },
  { q: "Qui installe et qui forme ?", a: "Notre équipe, avec des techniciens partenaires sur le terrain. La formation se fait sur place, en wolof ou en français." },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line bg-surface" aria-labelledby="faq-titre">
      <div className={cn(wrap, "grid gap-10 py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20 lg:py-28")}>
        <div>
          <h2 id="faq-titre" className={h2}>
            Questions fréquentes
          </h2>
          <p className="mt-5 text-[16.5px] leading-relaxed text-ink-2">
            Une autre question ?{" "}
            <a href={WHATSAPP.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline-offset-2 hover:underline">
              Écrivez-nous sur WhatsApp
            </a>
            .
          </p>
        </div>
        <Accordion.Root type="single" collapsible className="divide-y divide-line border-y border-line">
          {FAQ.map((f, i) => (
            <Accordion.Item key={f.q} value={`q${i}`}>
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left font-display text-[17px] font-semibold hover:text-brand">
                  {f.q}
                  <ChevronDown className="size-5 shrink-0 text-ink-3 transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[acc-up_180ms_ease-in] data-[state=open]:animate-[acc-down_220ms_var(--ease-out)]">
                <p className="max-w-[64ch] pb-6 text-[15.5px] leading-relaxed text-ink-2">{f.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}

/* ——— Contact ——— */

function WhatsAppLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#f4efe6] px-5 font-display text-[15.5px] font-semibold text-[#0b2e24] hover:bg-white">
      <MessageCircle className="size-5 text-[#0f5a44]" aria-hidden /> {children}
    </a>
  );
}

function Contact() {
  return (
    <section id="contact" className="relative scroll-mt-20 overflow-hidden bg-[#0b2e24] text-[#f4efe6]" aria-labelledby="contact-titre">
      <SignTrace className="-bottom-48 -left-40 w-[560px] opacity-60" color="#ef6a22" />
      <div className={cn(wrap, "relative grid gap-12 py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:py-28")}>
        <div>
          <h2 id="contact-titre" className={cn(h2, "text-[#f4efe6]")}>
            Un terrain, un stock, un projet ? Parlons-en.
          </h2>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-[#d6dbd2]">Agriculteur, coopérative, investisseur ou institution : laissez-nous un numéro, nous vous rappelons. Chaque échange nous aide à construire la bonne solution.</p>
          <div className="mt-8 flex flex-col items-start gap-3">
            <WhatsAppLink href={TIDIANE.href}>
              {TIDIANE.name} · <span className="font-mono text-[15px] font-medium">{TIDIANE.display}</span>
            </WhatsAppLink>
            <WhatsAppLink href={WHATSAPP.href}>
              WhatsApp <span className="font-mono text-[15px] font-medium">{WHATSAPP.display}</span>
            </WhatsAppLink>
            <a href={`mailto:${EMAIL.contact}`} className="mt-2 inline-flex items-center gap-2 font-mono text-[15px] text-[#f4efe6] underline underline-offset-4 hover:text-white">
              {EMAIL.contact}
            </a>
          </div>
        </div>
        <div className="rounded-[24px] bg-surface p-5 text-ink shadow-3 sm:p-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
