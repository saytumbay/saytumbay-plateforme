import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Accordion } from "radix-ui";
import { ArrowUpRight, BellRing, ChevronDown, Droplets, FileBarChart2, Gauge, MessageCircle, SlidersHorizontal, ThermometerSun, Wind, ClipboardCheck, Scale } from "lucide-react";
import { api, IS_DEMO } from "@/lib/api";
import { homeFor, useSetSession } from "@/lib/auth";
import { usePageTitle } from "@/components/ui/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { TIDIANE, WHATSAPP } from "@/layouts/PublicLayout";
import { cn } from "@/lib/cn";
import { HeroField } from "./HeroField";
import { ContactForm } from "./ContactForm";

const wrap = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";

export default function Landing() {
  usePageTitle(null);
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
      <AgriTech />
      <Onion />
      <HowItWorks />
      <ForWhom />
      <Team />
      <Faq />
      <Contact />
    </>
  );
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
      <div className="max-w-[560px]">
        <h1 id="hero-titre" className="font-display text-[clamp(38px,5.4vw,64px)] font-semibold leading-[1.02] tracking-[-0.035em] text-balance">
          Sachez quelle parcelle a soif, avant qu’elle ne souffre.
        </h1>
        <p className="mt-6 text-[clamp(17px,1.5vw,19px)] leading-relaxed text-ink-2 text-pretty">SaytuMbay pose des capteurs dans le sol de vos parcelles et dans vos magasins de stockage. Quand une mesure sort de sa plage, la personne responsable reçoit un SMS qui dit quoi faire.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to="/#contact" size="lg">
            Demander une démonstration
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
        <p className="mt-8 text-[14.5px] leading-relaxed text-ink-3">
          <span lang="wo" className="font-semibold text-ink-2">
            Saytu mbay
          </span>
          , en wolof : veiller sur les cultures.
        </p>
      </div>
      <HeroField />
    </section>
  );
}

/* ——— Contexte chiffré, sourcé ——— */

function Context() {
  return (
    <section className="border-y border-line bg-surface" aria-label="Le problème">
      <div className={cn(wrap, "py-16 lg:py-24")}>
        <p className="max-w-[30ch] font-display text-[clamp(26px,3.3vw,42px)] font-semibold leading-[1.15] tracking-[-0.025em] text-balance">
          Au Sénégal, les pertes après récolte sont estimées entre 30 et 40 % de la production horticole.
          <sup className="ml-0.5 align-super text-[0.45em] font-medium text-ink-3">
            <a href="#source-1" aria-describedby="source-1">
              1
            </a>
          </sup>
        </p>
        <div className="mt-10 grid gap-8 text-[16.5px] leading-relaxed text-ink-2 md:grid-cols-2 md:gap-14">
          <p>Une bonne partie se joue sans témoin : une parcelle qui sèche pendant un après-midi d’harmattan, une vanne restée ouverte toute la nuit, un sol qui se charge en sel au fil des saisons.</p>
          <p>Dans les magasins, l’oignon commence à pourrir au cœur des sacs, là où personne ne regarde. Quand l’odeur arrive à la porte, une partie du stock est déjà perdue.</p>
        </div>
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

/* ——— AgriTech ——— */

const AGRI_FEATURES = [
  { icon: Droplets, title: "Humidité, température et salinité du sol", text: "Mesurées à 20 cm toutes les 15 minutes. La salinité aide à suivre les sols des Niayes qui se chargent en sel." },
  { icon: SlidersHorizontal, title: "Une plage visée par parcelle", text: "Oignon, tomate, chou ou piment n’ont pas les mêmes besoins. Vous réglez les seuils parcelle par parcelle." },
  { icon: BellRing, title: "Alertes par SMS, tâches pour le technicien", text: "Le responsable de la parcelle est prévenu, même sur un téléphone à touches. Un capteur muet devient une tâche de maintenance." },
  { icon: Gauge, title: "Irrigation suivie", text: "Durée conseillée, journal des arrosages et effet mesuré sur le sol. Les vannes connectées se commandent depuis l’application, en option." },
  { icon: FileBarChart2, title: "Rapports de saison", text: "Eau utilisée, jours passés sous le seuil, alertes traitées. Export CSV ou PDF pour la coopérative et ses partenaires." },
];

function AgriTech() {
  return (
    <section id="agritech" className="scroll-mt-20" aria-labelledby="agri-titre">
      <div className={cn(wrap, "grid gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-28")}>
        <div>
          <p className="font-display text-[15px] font-semibold text-brand">SaytuMbay AgriTech</p>
          <h2 id="agri-titre" className="mt-2 font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
            Le sol de chaque parcelle, mesuré en continu.
          </h2>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">Le premier produit de SaytuMbay. Pensé pour les coopératives et les exploitations maraîchères qui irriguent : savoir où arroser, combien, et le vérifier.</p>
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
        <ProductPeek />
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
    <figure className="self-start lg:sticky lg:top-28">
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
              <p className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[15px] font-semibold">Parcelle {p.code}</span>
                <span className="text-[12px] text-ink-3">{p.crop}</span>
              </p>
              <p className="mt-2 font-display text-[28px] font-semibold leading-none tabular">
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
  { icon: ThermometerSun, title: "Température et humidité à plusieurs hauteurs", text: "Une sonde par rangée de sacs, au cœur du tas. Plages préréglées : oignon 24 à 30 °C et 65 à 72 %, pomme de terre 8 à 14 °C et 85 à 95 %." },
  { icon: Wind, title: "CO₂ et gaz de dégradation", text: "Ils montent quand les bulbes respirent trop ou commencent à pourrir, souvent avant que rien ne se voie." },
  { icon: ClipboardCheck, title: "Lots et contrôles visuels", text: "Chaque lot garde sa date d’entrée, sa durée visée et ses contrôles. Le magasinier sait quoi vendre en premier." },
  { icon: Scale, title: "Des pertes mesurées honnêtement", text: "Pendant le pilote, un magasin équipé est comparé à un magasin témoin, pesée à l’entrée et à la sortie. Pas de chiffre sans cette comparaison." },
];

function Onion() {
  return (
    <section id="onion" className="scroll-mt-20 border-y border-line bg-surface" aria-labelledby="onion-titre">
      <div className={cn(wrap, "grid gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 lg:py-28")}>
        <div className="lg:order-2">
          <p className="font-display text-[15px] font-semibold text-onion dark:text-onion-ink">SaytuMbay Onion</p>
          <h2 id="onion-titre" className="mt-2 font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
            Le cœur du tas, surveillé avant qu’il ne pourrisse.
          </h2>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">Le second module, pour les magasins d’oignon et de pomme de terre des coopératives, des GIE et des stockeurs.</p>
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
        <StoreIllustration />
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
    <figure className="self-center lg:order-1">
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

/* ——— Fonctionnement (séquence réelle : numérotée) ——— */

const STEPS = [
  { title: "Pose sur le terrain", text: "Une demi-journée pour une exploitation : sondes enterrées à 20 cm ou glissées dans les sacs, une passerelle LoRaWAN dans un local proche, reliée à internet par la 4G." },
  { title: "Mesure toutes les 15 minutes", text: "Les sondes fonctionnent sur pile, sans câble ni carte SIM. La radio LoRaWAN porte à plusieurs kilomètres en terrain dégagé." },
  { title: "Alerte au bon moment", text: "Une mesure hors plage envoie un SMS au responsable, lisible sur un téléphone à touches, et une notification dans l’application." },
  { title: "Action et suivi", text: "Vous irriguez, aérez ou triez. Tout est consigné : qui a fait quoi, quand, et l’effet sur les mesures dans les heures qui suivent." },
];

function HowItWorks() {
  return (
    <section id="fonctionnement" className="scroll-mt-20" aria-labelledby="fonc-titre">
      <div className={cn(wrap, "py-20 lg:py-28")}>
        <h2 id="fonc-titre" className="max-w-[24ch] font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
          Du capteur au SMS, en quatre étapes.
        </h2>
        <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-8">
          <span className="absolute left-0 right-0 top-[19px] hidden h-px bg-line-strong md:block" aria-hidden />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <span className="relative flex size-10 items-center justify-center rounded-full border-2 border-brand bg-bg font-display text-[15px] font-semibold text-brand">{i + 1}</span>
              <h3 className="mt-5 font-display text-[18px] font-semibold">{s.title}</h3>
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

/* ——— Pour qui, et comment démarrer ——— */

const SEGMENTS = [
  { title: "Coopératives et GIE maraîchers", text: "Plusieurs exploitants, des parcelles dispersées : chacun voit les siennes, le responsable voit tout et reçoit les alertes importantes." },
  { title: "Exploitations horticoles", text: "Forages, vannes, plusieurs cultures en parallèle : arroser juste, au bon endroit, et garder la trace pour la saison suivante." },
  { title: "Magasins de stockage", text: "Oignon de Galmi, pomme de terre : suivre chaque rangée et chaque lot, vendre en premier ce qui risque de s’abîmer." },
];

const PILOT = [
  { title: "Visite et cadrage", text: "Sur place, nous choisissons les indicateurs et estimons le gain attendu avec vous." },
  { title: "Pilote payant, à prix réduit", text: "Les critères de réussite sont écrits avant la pose. Un pilote payé est un pilote suivi des deux côtés." },
  { title: "Trente jours de test", text: "Capteurs, alertes et accès à la plateforme, avec une formation de l’équipe sur place." },
  { title: "Bilan, puis abonnement", text: "Si les critères sont atteints, le service continue : supervision, maintenance et rapports." },
];

function ForWhom() {
  return (
    <section id="clients" className="scroll-mt-20 border-y border-line bg-surface" aria-labelledby="clients-titre">
      <div className={cn(wrap, "grid gap-14 py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20 lg:py-28")}>
        <div>
          <h2 id="clients-titre" className="font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance">
            Pour les organisations qui produisent et qui stockent.
          </h2>
          <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-ink-2">Nous travaillons avec des organisations. Les petits producteurs en profitent par leur coopérative ou leur GIE, sans avoir à acheter de matériel.</p>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {SEGMENTS.map((s) => (
              <li key={s.title} className="grid gap-2 py-6 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-8">
                <h3 className="font-display text-[17px] font-semibold">{s.title}</h3>
                <p className="text-[15.5px] leading-relaxed text-ink-2">{s.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[24px] bg-bg p-6 sm:p-8">
          <h3 className="font-display text-[22px] font-semibold tracking-tight">Comment démarrer</h3>
          <ol className="mt-6 flex flex-col">
            {PILOT.map((p, i) => (
              <li key={p.title} className="relative flex gap-4 pb-7 last:pb-0">
                {i < PILOT.length - 1 && <span className="absolute left-[13px] top-8 bottom-1 w-px bg-line-strong" aria-hidden />}
                <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-brand font-display text-[13px] font-semibold text-brand-ink">{i + 1}</span>
                <div>
                  <p className="font-display text-[16px] font-semibold">{p.title}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <ButtonLink to="/#contact" className="mt-8 w-full" size="lg">
            Parler d’un pilote
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* ——— Équipe ——— */

const TEAM = [
  { name: "Tidiane Sow", role: "Directeur général (CEO)" },
  { name: "Ibrahima Fall", role: "Directeur technique (CTO)" },
];

const SUPPORT = ["Incubateur TÀGGU NDAW ÑI, Université Cheikh Anta Diop", "AfriConnect+, programme de soutien à l’Internet des objets en Afrique", "Dakar Night Market 2026, programme accompagné par l’ADEPME", "2e place, hackathon ISOC ESMT 2026"];

function Team() {
  return (
    <section id="equipe" className="scroll-mt-20" aria-labelledby="equipe-titre">
      <div className={cn(wrap, "grid gap-14 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-20 lg:py-28")}>
        <div>
          <h2 id="equipe-titre" className="font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em]">
            Une équipe de Dakar.
          </h2>
          <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-2">Réseaux, objets connectés, logiciel et produit : nous concevons la solution, l’installons avec des techniciens partenaires et la maintenons dans la durée.</p>
          <ul className="mt-10 grid gap-x-6 gap-y-6 sm:grid-cols-2">
            {TEAM.map((m, i) => (
              <li key={m.name} className="flex items-center gap-4">
                <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full font-display text-[17px] font-semibold", ["bg-brand-soft text-brand-strong dark:text-brand", "bg-water-soft text-water-ink", "bg-sun-soft text-sun-ink", "bg-onion-soft text-onion-ink"][i])} aria-hidden>
                  {m.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span>
                  <span className="block font-display text-[16.5px] font-semibold">{m.name}</span>
                  <span className="block text-[14.5px] text-ink-3">{m.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:pt-3">
          <h3 className="font-display text-[18px] font-semibold">Accompagnement</h3>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {SUPPORT.map((s) => (
              <li key={s} className="py-4 text-[15.5px] text-ink-2">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ——— Questions fréquentes ——— */

const FAQ = [
  { q: "Faut-il internet sur la parcelle ?", a: "Non. Les capteurs parlent par radio LoRaWAN à une passerelle installée dans un local proche, qui envoie les mesures par la 4G. Les alertes arrivent par SMS, sans application ni données mobiles." },
  { q: "Qui reçoit les alertes ?", a: "La personne responsable de la parcelle ou du magasin, désignée par votre organisation. Chaque membre voit uniquement ce qui le concerne : un exploitant ses parcelles, un technicien les capteurs, le responsable l’ensemble." },
  { q: "Pour quelles cultures ?", a: "Le maraîchage irrigué (oignon, tomate, chou, piment, gombo…) et le stockage d’oignon et de pomme de terre. Les seuils se règlent par parcelle ou par magasin." },
  { q: "Et si un capteur tombe en panne ?", a: "La plateforme le signale dès qu’il ne répond plus ou que sa pile faiblit, et crée une tâche pour le technicien. Un capteur remplacé garde l’historique de l’ancien." },
  { q: "À qui appartiennent les données ?", a: "À votre organisation. Vous pouvez les exporter à tout moment. Leur traitement suit la loi sénégalaise n° 2008-12 sur les données personnelles ; le détail est dans notre politique de confidentialité." },
  { q: "Combien ça coûte ?", a: "Cela dépend du nombre de capteurs et du site. Nous commençons toujours par une visite, puis un pilote payant à prix réduit avec des critères de réussite écrits. Écrivez-nous pour en parler." },
  { q: "Qui installe et qui forme ?", a: "Notre équipe, avec des techniciens partenaires sur le terrain. La formation se fait sur place, en wolof ou en français." },
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line bg-surface" aria-labelledby="faq-titre">
      <div className={cn(wrap, "grid gap-10 py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20 lg:py-28")}>
        <div>
          <h2 id="faq-titre" className="font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em]">
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

function Contact() {
  return (
    <section id="contact" className="scroll-mt-20 bg-[#0b1a14] text-[#eaf3ee]" aria-labelledby="contact-titre">
      <div className={cn(wrap, "grid gap-12 py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:py-28")}>
        <div>
          <h2 id="contact-titre" className="font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-white text-balance">
            Venez voir les capteurs sur une de vos parcelles.
          </h2>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-[#c9d8cf]">Laissez-nous un numéro : nous vous rappelons pour organiser une visite et une démonstration sur place.</p>
          <a href={WHATSAPP.href} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#2bd47d] px-5 font-display text-[15.5px] font-semibold text-[#06231a] hover:bg-[#46e290]">
            <MessageCircle className="size-5" aria-hidden /> WhatsApp {WHATSAPP.display}
          </a>
          <p className="mt-4 text-[15.5px] text-[#c9d8cf]">
            Ou appelez {TIDIANE.name}, directeur général, au{" "}
            <a href={TIDIANE.href} className="whitespace-nowrap font-semibold text-white underline underline-offset-2 hover:text-[#2bd47d]">
              {TIDIANE.display}
            </a>
            .
          </p>
        </div>
        <div className="rounded-[24px] bg-surface p-5 text-ink shadow-3 sm:p-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
