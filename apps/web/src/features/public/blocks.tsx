import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { Accordion } from "radix-ui";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronDown, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SignTrace } from "@/components/brand/SignTrace";
import { Photo } from "@/components/ui/photo";
import type { PhotoKey } from "@/assets/photos";
import { EMAIL, TIDIANE, WHATSAPP } from "@/layouts/PublicLayout";
import { cn } from "@/lib/cn";
import { ContactForm } from "./ContactForm";

/* Sections du site public, partagées entre l'accueil, /solutions, /a-propos et /contact. */

export const wrap = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";
/** Surtitre de la charte : Sora SemiBold, capitales, approche +12 %. */
export const eyebrow = "font-display text-[13px] font-semibold uppercase tracking-[0.12em]";
export const h2 = "font-display text-[clamp(30px,3.6vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-balance";
/** Titre de page (pages détaillées). */
export const h1 = "font-display text-[clamp(36px,5vw,60px)] font-bold leading-[1.04] tracking-[-0.035em] text-balance";
/** Grand titre « à la Apple » : quelques mots, très grand. */
export const display = "font-display text-[clamp(40px,6.4vw,84px)] font-bold leading-[1.0] tracking-[-0.04em] text-balance";

/** Fait défiler jusqu'à l'ancre de l'adresse (#contact, #pilote…) une fois la page chargée à la demande. */
export function useHashScroll() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }), 30);
    return () => window.clearTimeout(id);
  }, [hash]);
}

/** La pastille de la charte : reprise du capteur, sert de puce et d'indicateur d'état. */
export function Dot({ tone = "sun", className }: { tone?: "sun" | "brand" | "ink"; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", { sun: "bg-sun", brand: "bg-brand", ink: "bg-ink-3" }[tone], className)} aria-hidden />;
}

/* ——— En-tête des pages intérieures : quelques mots à gauche, une photo à droite ——— */

export function PageHeader({ id, label, title, text, photo, position, alt, children }: { id: string; label: string; title: string; text?: string; photo: PhotoKey; position?: string; alt: string; children?: ReactNode }) {
  return (
    <section className={cn(wrap, "grid items-center gap-10 pb-14 pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:pb-20 lg:pt-16")} aria-labelledby={id}>
      <div className="anim-rise">
        <p className={cn(eyebrow, "text-brand")}>{label}</p>
        <h1 id={id} className={cn(h1, "mt-3 max-w-[18ch]")}>
          {title}
        </h1>
        {text && <p className="mt-5 max-w-[48ch] text-[18px] leading-relaxed text-ink-2">{text}</p>}
        {children}
      </div>
      <Photo name={photo} priority alt={alt} sizes="(min-width: 1024px) 520px, 100vw" position={position} frameClassName="hero-photo aspect-[16/10] rounded-[28px] lg:aspect-[5/4]" />
    </section>
  );
}

/* ——— Le chiffre des pertes et ses sources (vérifiées en novembre 2026) ——— */

/** Étude de terrain au Sénégal (oignon, tomate, piment), indexée par la FAO dans AGRIS. */
export const LOSS_STUDY = { url: "https://agris.fao.org/search/en/records/6748cf147625988a3720f93b", label: "Beye et Komarek, Université de Bonn (ZEF), 2020" };
/** Indicateur ODD 12.3.1 de la FAO : 25,4 % des fruits et légumes perdus entre la récolte et la vente au détail en 2023. */
export const LOSS_FAO = { url: "https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/1231-global-food-losses", label: "FAO, indicateur ODD 12.3.1, 2023" };

export function LossSources({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const a = cn("underline underline-offset-2", linkClassName);
  return (
    <p className={className}>
      Sources : au Sénégal, étude sur l’oignon, la tomate et le piment (
      <a href={LOSS_STUDY.url} target="_blank" rel="noopener noreferrer" className={a}>
        {LOSS_STUDY.label}
      </a>
      ). Dans le monde, 25 % des fruits et légumes se perdent entre la récolte et la vente (
      <a href={LOSS_FAO.url} target="_blank" rel="noopener noreferrer" className={a}>
        {LOSS_FAO.label}
      </a>
      ).
    </p>
  );
}

/* ——— Notre mission (À propos) : le pourquoi, sans redire le problème déjà chiffré sur l'accueil ——— */

export const PRINCIPLES = [
  { title: "Simple", text: "Un SMS clair plutôt qu’une application de plus. Le wolof arrive : les messages sont en relecture." },
  { title: "Honnête", text: "Nous disons ce qui est prêt et ce qui reste à faire, sans promettre de chiffres que nous n’avons pas mesurés." },
  { title: "Pensé pour le monde", text: "Nous commençons au Sénégal. Mais l’eau qui manque et les récoltes qui pourrissent sont les mêmes partout : nous construisons pour aller bien au-delà." },
];

export function Mission() {
  return (
    <section className="relative isolate overflow-hidden bg-[#0b2e24] text-[#f4efe6]" aria-labelledby="mission-titre">
      {/* Des planches de salade en fond, sous un voile vert : le texte reste lisible, clair comme sombre. */}
      <Photo name="saladesRangs" alt="" sizes="100vw" position="50% 50%" className="absolute inset-0 -z-10" frameClassName="h-full" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b2e24]/85 via-[#0b2e24]/65 to-[#0b2e24]/90" aria-hidden />
      <div className={cn(wrap, "py-24 lg:py-32")}>
        <p className={cn(eyebrow, "text-[#f4efe6]")} data-reveal>
          Notre mission
        </p>
        <h2 id="mission-titre" className="mt-4 max-w-[26ch] font-display text-[clamp(28px,3.6vw,46px)] font-semibold leading-[1.12] tracking-[-0.03em] text-balance text-[#f4efe6]" data-reveal>
          Que chaque producteur, au Sénégal comme partout dans le monde, ait la bonne information au bon moment.
        </h2>
        <ul className="mt-14 grid gap-4 md:grid-cols-3 md:gap-5">
          {PRINCIPLES.map((p, i) => (
            <li key={p.title} className="rounded-[20px] border border-[#f4efe6]/20 bg-[#0b2e24]/55 p-6 backdrop-blur-sm" data-reveal={i}>
              <span className="block h-1 w-10 rounded-full bg-[#ef6a22]" aria-hidden />
              <h3 className="mt-4 font-display text-[20px] font-semibold text-[#f4efe6]">{p.title}</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-[#dfe6dc]">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ——— Où nous en sommes : transparence sur le stade du projet ——— */

export const STATUS: Array<{ title: string; tone: "brand" | "sun" | "ink"; items: string[] }> = [
  {
    title: "Prêt aujourd’hui",
    tone: "brand",
    items: [
      "Le tableau de bord, sur ordinateur et sur téléphone.",
      "Les alertes SMS, envoyées à la bonne personne.",
      "Le suivi des champs et des magasins.",
    ],
  },
  {
    title: "En cours",
    tone: "sun",
    items: [
      "Les SMS en wolof.",
      "Une alerte automatique dès qu’une mesure est anormale.",
      "Les premiers sites pilotes, avec des coopératives.",
    ],
  },
  {
    title: "Ce que nous cherchons",
    tone: "ink",
    items: ["Des coopératives, GIE et stockeurs pour nos premiers pilotes.", "Des financements pour équiper ces premiers sites.", "Des partenaires techniques et de terrain."],
  },
];

export const SUPPORT = ["Incubé à TÀGGU NDAW ÑI, l’incubateur de l’Université Cheikh Anta Diop", "Né à l’ESP de Dakar dans le programme AfriConnect+, soutien à l’Internet des objets en Afrique", "Projet présenté et publié au colloque COC’2026, IUT de l’Université Iba Der Thiam, Thiès", "Projet présenté au Dakar Night Market 2026", "2e place, hackathon ISOC ESMT 2026"];

/** Article présenté au COC'2026 et archivé sur HAL (métadonnées vérifiées sur l'archive ouverte). */
export const PAPER = {
  title: "SaytuMbay : une plateforme IoT-IA pour l’agriculture de précision au Sénégal",
  /** Forme courte d'usage : la liste complète des auteurs reste sur la notice HAL. */
  authors: "Tidiane Sow, Ibrahima Fall et al.",
  venue: "Colloque sur les Objets et systèmes Connectés COC’2026 · Thiès, 25-26 mars 2026",
  url: "https://hal.science/hal-05571878v1",
};

export function Status() {
  return (
    <section id="etat" className="scroll-mt-20 border-t border-line" aria-labelledby="etat-titre">
      <div className={cn(wrap, "pb-8 pt-20 lg:pb-8 lg:pt-28")}>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-16">
          <div data-reveal>
            <p className={cn(eyebrow, "text-brand")}>Où nous en sommes</p>
            <h2 id="etat-titre" className={cn(h2, "mt-3 max-w-[22ch]")}>
              Une jeune startup, une plateforme déjà construite.
            </h2>
            <p className="mt-5 max-w-[60ch] text-[17px] leading-relaxed text-ink-2">SaytuMbay démarre, et nous préférons le dire clairement : voici ce qui existe aujourd’hui, et ce qui reste à faire avec vous.</p>
          </div>
          <div data-reveal="1">
            <Photo name="aubergines" alt="Des aubergines qui mûrissent sur pied, dans un champ au Sénégal." sizes="(min-width: 1024px) 440px, 100vw" position="50% 50%" frameClassName="aspect-[16/10] rounded-[24px] lg:aspect-[4/3]" />
          </div>
        </div>
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

/* ——— Travaillons ensemble : trois publics, trois portes d'entrée ——— */

export const AUDIENCES: Array<{ title: string; text: string; cta: string; to: string }> = [
  { title: "Producteurs, coopératives, stockeurs", text: "Devenez l’un de nos premiers sites pilotes, à prix réduit.", cta: "Proposer mon site", to: "/contact?profil=cooperative#contact" },
  { title: "Investisseurs, bailleurs, incubateurs", text: "Financez les premiers sites et une équipe qui construit au Sénégal.", cta: "Recevoir notre présentation", to: "/contact?profil=financeur#contact" },
  { title: "États, collectivités, ONG, programmes", text: "Équipez un programme avec des données mesurées, pas estimées.", cta: "Parler de votre programme", to: "/contact?profil=institution#contact" },
];


/** `level={1}` : titre de la page /contact. */
export function Together({ level = 2 }: { level?: 1 | 2 }) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <section id="ensemble" className="relative isolate scroll-mt-20 overflow-hidden bg-[#0f5a44] text-[#f4efe6]" aria-labelledby="ensemble-titre">
      {/* Une visite de champ en groupe, sous un voile vert : le texte reste lisible. */}
      <Photo name="visiteGroupe" alt="" sizes="100vw" position="50% 55%" className="absolute inset-0 -z-10" frameClassName="h-full" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0f5a44]/92 via-[#0f5a44]/85 to-[#0b2e24]/95" aria-hidden />
      <SignTrace className="-right-40 -top-24 hidden w-[620px] opacity-50 lg:block" color="#ef6a22" />
      <div className={cn(wrap, "relative py-20 lg:py-28")}>
        <p className={cn(eyebrow, "text-[#f4efe6]")} data-reveal>
          {level === 1 ? "Contact" : "Travaillons ensemble"}
        </p>
        <H id="ensemble-titre" className={cn(level === 1 ? h1 : h2, "mt-3 max-w-[20ch] text-[#f4efe6]")} data-reveal>
          {level === 1 ? "Travaillons ensemble." : "Chacun peut nous aider à aller plus loin."}
        </H>
        <p className="mt-5 max-w-[56ch] text-[17px] leading-relaxed text-[#dfe6dc]" data-reveal>
          Choisissez ce qui vous ressemble : le formulaire se remplit avec votre profil.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {AUDIENCES.map((a, i) => (
            <div key={a.title} className="lift flex flex-col rounded-[20px] bg-[#f4efe6] p-6 text-[#0b2e24]" data-reveal={i}>
              {/* Couleur fixée : la carte reste sable en thème sombre, le titre ne doit pas prendre l'encre claire du thème. */}
              <h3 className="font-display text-[19px] font-semibold leading-snug text-[#0b2e24]">{a.title}</h3>
              <p className="mt-3 flex-1 text-[15.5px] leading-relaxed text-[#3c4a44]">{a.text}</p>
              <Link to={a.to} className="mt-6 inline-flex items-center gap-1.5 font-display text-[15px] font-semibold text-[#0f5a44] underline-offset-4 hover:underline">
                {a.cta} <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ——— Équipe et vision ——— */

export const TEAM = [
  { name: "Tidiane Sow", role: "Directeur général (CEO)" },
  { name: "Ibrahima Fall", role: "Directeur technique (CTO)" },
];

export function Team() {
  return (
    <section id="equipe" className="scroll-mt-20" aria-labelledby="equipe-titre">
      {/* Texte et fondateurs à gauche, photo de l'ESP sur toute la hauteur à droite : pas de vide sous l'une des colonnes. */}
      <div className={cn(wrap, "grid gap-10 pb-16 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:pb-20 lg:pt-8")}>
        <div data-reveal>
          <p className={cn(eyebrow, "text-brand")}>L’équipe</p>
          <h2 id="equipe-titre" className={cn(h2, "mt-3")}>
            Nés à Dakar. Construits pour grandir.
          </h2>
          <div className="mt-5 flex max-w-[58ch] flex-col gap-4 text-[17px] leading-relaxed text-ink-2">
            <p>Réseaux, objets connectés, logiciel : nous maîtrisons toute la chaîne, du capteur planté dans le sol jusqu’au SMS sur votre téléphone.</p>
            <p>Nous nous sommes rencontrés en master à l’École supérieure polytechnique (ESP) de l’Université Cheikh Anta Diop de Dakar, où SaytuMbay est né.</p>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {TEAM.map((m, i) => (
              <li key={m.name} className="flex items-center gap-4 rounded-[20px] border border-line bg-surface p-5">
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
        <div data-reveal="1">
          <Photo name="esp" alt="L’entrée de l’École supérieure polytechnique de Dakar, où SaytuMbay est né." sizes="(min-width: 1024px) 480px, 100vw" position="50% 40%" className="lg:h-full" frameClassName="aspect-[16/10] rounded-[24px] lg:aspect-auto lg:h-full" />
        </div>
      </div>
    </section>
  );
}

/* ——— Questions fréquentes ——— */

export const FAQ = [
  { q: "Utilisez-vous les images satellites ?", a: "Pas encore dans la plateforme. Les images satellites gratuites montrent la santé des cultures vue d’en haut, sur de grandes surfaces ; nos capteurs mesurent ce qu’elles ne voient pas, l’eau du sol et l’intérieur des magasins. Combiner les deux est la direction que nous prenons, seuls ou avec des partenaires." },
  { q: "J’ai déjà une pompe ou un arrosage automatique. Est-ce utile ?", a: "Oui. Les capteurs s’ajoutent à votre installation sans rien remplacer : ils disent quand arroser et vérifient que l’eau arrive bien dans le sol. Quand le matériel le permet, l’arrosage peut aussi se commander depuis l’application." },
  { q: "Faut-il internet sur la parcelle ?", a: "Non. Les capteurs parlent par radio LoRaWAN à une passerelle installée dans un local proche, qui envoie les mesures par la 4G. Les alertes arrivent par SMS, sans application ni données mobiles." },
  { q: "Qui reçoit les alertes ?", a: "La personne responsable de la parcelle ou du magasin, désignée par votre organisation. Chaque membre voit uniquement ce qui le concerne : un exploitant ses parcelles, un technicien les capteurs, le responsable l’ensemble." },
  { q: "Pour quelles cultures et quels usages ?", a: "Le maraîchage irrigué (oignon, tomate, chou, piment, gombo…) et le stockage d’oignon et de pomme de terre. Pour une chambre froide, un forage ou un autre équipement, parlons-en : le même socle s’adapte." },
  { q: "Et si un capteur tombe en panne ?", a: "La plateforme le signale dès qu’il ne répond plus ou que sa pile faiblit, et crée une tâche pour le technicien. Un capteur remplacé garde l’historique de l’ancien." },
  { q: "À qui appartiennent les données ?", a: "À votre organisation. Vous pouvez les exporter à tout moment. Leur traitement suit la loi sénégalaise n° 2008-12 sur les données personnelles ; le détail est dans notre politique de confidentialité." },
  { q: "Combien ça coûte ?", a: "Cela dépend du nombre de capteurs et du site. Chaque projet commence par une visite, puis un pilote à prix réduit avec des objectifs fixés ensemble. Écrivez-nous pour en parler." },
  { q: "Qui installe et qui forme ?", a: "Notre équipe, avec des techniciens partenaires sur le terrain. La formation se fait sur place, en wolof ou en français." },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 border-t border-line bg-surface" aria-labelledby="faq-titre">
      <div className={cn(wrap, "grid gap-10 py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20 lg:py-28")}>
        <div className="lg:sticky lg:top-28 lg:self-start" data-reveal>
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
          <Photo name="pompage" alt="Station de pompage pour l’irrigation des cultures dans la vallée du fleuve Sénégal." sizes="(min-width: 1024px) 440px, 100vw" frameClassName="mt-8 aspect-[4/3] rounded-[24px]" />
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

export function WhatsAppLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#f4efe6] px-5 font-display text-[15.5px] font-semibold text-[#0b2e24] hover:bg-white">
      <MessageCircle className="size-5 text-[#0f5a44]" aria-hidden /> {children}
    </a>
  );
}

/** Bloc de contact ; en titre de page (`level={1}`) sur /contact. */
export function Contact({ level = 2 }: { level?: 1 | 2 }) {
  const H = level === 1 ? "h1" : "h2";
  return (
    <section id="contact" className="relative scroll-mt-20 overflow-hidden bg-[#0b2e24] text-[#f4efe6]" aria-labelledby="contact-titre">
      <SignTrace className="-bottom-48 -left-40 w-[560px] opacity-60" color="#ef6a22" />
      <div className={cn(wrap, "relative grid gap-12 py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:py-28")}>
        <div>
          <H id="contact-titre" className={cn(level === 1 ? h1 : h2, "text-[#f4efe6]")}>
            {level === 1 ? "Parlons-en." : "Écrivez-nous."}
          </H>
          <p className="mt-5 max-w-[46ch] text-[17px] leading-relaxed text-[#d6dbd2]">Un champ, un magasin, un partenariat ? Appelez-nous sur WhatsApp, écrivez-nous, ou laissez votre numéro : nous vous rappelons.</p>
          <div className="mt-8 flex flex-col items-start gap-3">
            <WhatsAppLink href={TIDIANE.href}>
              {TIDIANE.name} · <span className="font-mono text-[15px] font-medium">{TIDIANE.display}</span>
            </WhatsAppLink>
            <WhatsAppLink href={WHATSAPP.href}>
              {WHATSAPP.name} · <span className="font-mono text-[15px] font-medium">{WHATSAPP.display}</span>
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

/* ——— Appel à l'action en bas des pages détaillées ——— */

export function CtaBand({ title = "Un terrain, un stock, un projet ?", profil = "cooperative" }: { title?: string; profil?: string }) {
  return (
    <section className="relative overflow-hidden bg-[#0b2e24] text-[#f4efe6]" aria-labelledby="cta-titre">
      <SignTrace className="-bottom-40 -right-32 w-[460px] opacity-60" color="#ef6a22" />
      <div className={cn(wrap, "relative flex flex-col items-start gap-6 py-16 sm:flex-row sm:items-center sm:justify-between lg:py-20")}>
        <h2 id="cta-titre" className={cn(h2, "max-w-[18ch] text-[#f4efe6]")}>
          {title}
        </h2>
        <ButtonLink to={`/contact?profil=${profil}`} size="lg" className="bg-[#f4efe6] text-[#0b2e24] hover:bg-white">
          Parlons-en
        </ButtonLink>
      </div>
    </section>
  );
}
