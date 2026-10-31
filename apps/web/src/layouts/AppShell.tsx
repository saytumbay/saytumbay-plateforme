import { Suspense, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useNavigation } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, ChevronDown, LogOut, Menu as MenuIcon, Monitor, Moon, Search, Sun, UserRound, Wifi, WifiOff, RotateCcw, ShieldCheck, Building2 } from "lucide-react";
import { Dialog } from "radix-ui";
import { toast } from "sonner";
import { MODULES, fmt, type Alert, type ModuleKey } from "@saytumbay/shared";
import { api, IS_DEMO } from "@/lib/api";
import { useSession, useSetSession, useActiveMembership } from "@/lib/auth";
import { useTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/cn";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Avatar } from "@/components/ui/data";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/overlay";
import { PageSkeleton } from "@/components/ui/feedback";
import { SeverityBadge } from "@/components/ui/badge";
import { CommandPalette } from "@/features/shared/CommandPalette";
import { ADMIN_NAV, AGRITECH_NAV, ONION_NAV, type NavGroup } from "./nav";

function useOnline() {
  const [on, setOn] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOn(true);
    const down = () => setOn(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return on;
}

export function useOpenAlerts(enabled: boolean) {
  return useQuery({ queryKey: ["alerts", "open"], queryFn: () => api.alerts.list(), enabled, refetchInterval: 30_000, select: (a: Alert[]) => a.filter((x) => x.status !== "resolue") });
}

export function AppShell({ area }: { area: "client" | "admin" }) {
  const loc = useLocation();
  const module: ModuleKey = loc.pathname.startsWith("/app/onion") ? "onion" : "agritech";
  const nav: NavGroup[] = area === "admin" ? ADMIN_NAV : module === "onion" ? ONION_NAV : AGRITECH_NAV;
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const online = useOnline();
  const navigation = useNavigation();
  const alerts = useOpenAlerts(area === "client");
  const count = (m: ModuleKey) => alerts.data?.filter((a) => a.module === m).length ?? 0;

  useEffect(() => setMenuOpen(false), [loc.pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sidebar = <SidebarContent area={area} module={module} nav={nav} count={count} />;

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#contenu" className="skip-link">
        Aller au contenu
      </a>
      {IS_DEMO && <DemoBar />}
      {!online && (
        <div role="status" className="flex items-center justify-center gap-2 bg-offline px-4 py-1.5 text-center text-[13px] font-semibold text-white">
          <WifiOff className="size-4" aria-hidden /> Hors ligne : vous voyez les dernières données reçues. Les actions reprendront avec le réseau.
        </div>
      )}
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-line bg-surface lg:flex" aria-label="Navigation principale">
          {sidebar}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar area={area} module={module} onSearch={() => setSearchOpen(true)} onMenu={() => setMenuOpen(true)} alerts={alerts.data ?? []} />
          <div className={cn("h-0.5 bg-brand transition-opacity", navigation.state === "loading" ? "animate-pulse-soft opacity-100" : "opacity-0")} aria-hidden />
          <main id="contenu" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 pb-28 pt-5 focus:outline-none sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <MobileNav nav={nav} count={count} onMenu={() => setMenuOpen(true)} />
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[#06110d]/45 data-[state=open]:animate-fade-in lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[86vw] max-w-[320px] flex-col bg-surface shadow-3 data-[state=open]:animate-sheet-in lg:hidden" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">Menu</Dialog.Title>
            {sidebar}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} area={area} />
    </div>
  );
}

function DemoBar() {
  return (
    <div className="demo-stripes relative z-40 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-sun/30 bg-sun-soft px-4 py-1.5 text-center text-[13px] text-sun-ink">
      <span>
        <strong className="font-display">Démo</strong> : données simulées, aucun capteur réel n’est relié. Vos actions restent dans ce navigateur.
      </span>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-display font-semibold underline underline-offset-2 hover:no-underline"
        onClick={async () => {
          const m = await import("@/demo/store");
          m.resetDemo(true);
          toast.success("Démo réinitialisée.");
          setTimeout(() => window.location.reload(), 400);
        }}
      >
        <RotateCcw className="size-3.5" aria-hidden /> Réinitialiser
      </button>
    </div>
  );
}

function SidebarContent({ area, module, nav, count }: { area: "client" | "admin"; module: ModuleKey; nav: NavGroup[]; count: (m: ModuleKey) => number }) {
  const membership = useActiveMembership();
  const { data: session } = useSession();
  const modules = membership?.org.modules ?? [];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 pb-4 pt-5">
        <Link to={area === "admin" ? "/admin" : "/app"} className="rounded-md" aria-label="SaytuMbay, accueil de l’espace">
          <Logo height={30} />
        </Link>
        {area === "admin" && <span className="ml-auto rounded-md bg-onion-soft px-1.5 py-0.5 font-display text-[11px] font-bold text-onion-ink">Console</span>}
      </div>
      {area === "client" && (
        <div className="px-3">
          {membership && <OrgSwitcher />}
          <nav aria-label="Modules" className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-surface-2 p-1.5">
            {(["agritech", "onion"] as const).map((m) => {
              const enabled = modules.includes(m);
              const on = module === m;
              return (
                <Link
                  key={m}
                  to={m === "onion" ? "/app/onion" : "/app"}
                  aria-current={on ? "page" : undefined}
                  aria-disabled={!enabled || undefined}
                  onClick={(e) => !enabled && (e.preventDefault(), toast.info(`Le module ${MODULES[m].short} n’est pas inclus dans votre abonnement.`))}
                  className={cn(
                    "flex flex-col rounded-lg px-2.5 py-2 transition-colors",
                    on ? (m === "onion" ? "bg-onion text-white shadow-1 dark:text-[#2b0a19]" : "bg-brand text-brand-ink shadow-1") : "text-ink-2 hover:bg-surface hover:text-ink",
                    !enabled && "opacity-50",
                  )}
                >
                  <span className="font-display text-[13.5px] font-semibold">{MODULES[m].short}</span>
                  <span className={cn("text-[11px] leading-tight", on ? "opacity-90" : "text-ink-3")}>{m === "onion" ? "Stockage" : "Parcelles"}</span>
                  {count(m) > 0 && !on && <span className="sr-only">{count(m)} alertes ouvertes</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
      <nav aria-label="Pages" className="scrollbar-thin mt-4 flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((g, gi) => (
          <div key={gi} className={cn(gi > 0 && "mt-5")}>
            {g.label && <p className="mb-1.5 px-3 text-xs font-semibold text-ink-3">{g.label}</p>}
            <ul className="flex flex-col gap-0.5">
              {g.items.map((it) => {
                const n = it.badge === "alerts-agritech" ? count("agritech") : it.badge === "alerts-onion" ? count("onion") : 0;
                return (
                  <li key={it.to}>
                    <NavLink
                      to={it.to}
                      end={it.end}
                      className={({ isActive }) =>
                        cn(
                          "group relative flex h-10 items-center gap-3 rounded-lg px-3 font-display text-[14px] font-medium transition-colors",
                          isActive ? (module === "onion" && area === "client" ? "bg-onion-soft text-onion-ink" : "bg-brand-soft text-brand-strong dark:text-brand") : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                        )
                      }
                    >
                      <it.icon className="size-[18px] shrink-0" aria-hidden />
                      <span className="truncate">{it.label}</span>
                      {n > 0 && (
                        <span className="ml-auto rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular dark:text-[#2a0a04]" aria-label={`${n} ouvertes`}>
                          {n}
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {area === "admin" && (
          <div className="mt-5 rounded-xl border border-line p-3 text-[13px] text-ink-3">
            <ShieldCheck className="mb-1.5 size-4 text-brand" aria-hidden />
            Console réservée à l’équipe saytumbay. Chaque action est inscrite au journal d’audit.
          </div>
        )}
      </nav>
      {session && (
        <div className="border-t border-line px-5 py-3 text-xs text-ink-3">
          {area === "client" ? "Espace client" : "Console interne"} · v1.0
        </div>
      )}
    </div>
  );
}

function OrgSwitcher() {
  const { data } = useSession();
  const setSession = useSetSession();
  const membership = useActiveMembership();
  const sw = useMutation({ mutationFn: api.auth.switchOrg, onSuccess: (s) => (setSession(s), window.location.assign("/app")) });
  if (!data || !membership) return null;
  if (data.memberships.length < 2)
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5">
        <Building2 className="size-4 shrink-0 text-ink-3" aria-hidden />
        <div className="min-w-0">
          <p className="truncate font-display text-[13.5px] font-semibold">{membership.org.name}</p>
          <p className="text-[11.5px] text-ink-3">{membership.org.status === "essai" ? "Essai gratuit" : "Abonnement actif"}</p>
        </div>
      </div>
    );
  return (
    <Menu
      align="start"
      trigger={
        <button className="flex w-full items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-surface-2">
          <Building2 className="size-4 shrink-0 text-ink-3" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-display text-[13.5px] font-semibold">{membership.org.name}</span>
          <ChevronDown className="size-4 text-ink-3" aria-hidden />
        </button>
      }
    >
      <MenuLabel>Changer d’organisation</MenuLabel>
      {data.memberships.map((m) => (
        <MenuItem key={m.orgId} onSelect={() => sw.mutate(m.orgId)}>
          {m.org.name}
        </MenuItem>
      ))}
    </Menu>
  );
}

function TopBar({ area, module, onSearch, onMenu, alerts }: { area: "client" | "admin"; module: ModuleKey; onSearch: () => void; onMenu: () => void; alerts: Alert[] }) {
  const { data: session } = useSession();
  const membership = useActiveMembership();
  const setSession = useSetSession();
  const navigate = useNavigate();
  const { pref, setPref } = useTheme();
  const logout = useMutation({
    mutationFn: api.auth.logout,
    onSettled: () => {
      setSession(null);
      navigate("/connexion", { replace: true });
      toast.success("Vous êtes déconnecté.");
    },
  });
  const u = session?.user;
  const name = u ? `${u.firstName} ${u.lastName}` : "";
  const roleLabel = area === "admin" ? (u?.platformRole === "admin" ? "Administration saytumbay" : "Support saytumbay") : membership?.org.name;
  const themeIcons: Record<ThemePref, typeof Sun> = { clair: Sun, sombre: Moon, systeme: Monitor };
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 sm:px-6 lg:px-8">
      <button onClick={onMenu} className="-ml-1 rounded-md p-2 text-ink-2 hover:bg-surface-2 lg:hidden" aria-label="Ouvrir le menu">
        <MenuIcon className="size-5" aria-hidden />
      </button>
      <Link to={area === "admin" ? "/admin" : "/app"} className="lg:hidden" aria-label="Accueil">
        <LogoMark size={32} />
      </Link>
      <button
        onClick={onSearch}
        className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface-2/60 px-3 text-left text-sm text-ink-3 transition-colors hover:border-line-strong sm:max-w-md"
        aria-label="Rechercher"
        aria-keyshortcuts="Control+K Meta+K"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{area === "admin" ? "Rechercher un client, une facture…" : module === "onion" ? "Rechercher un entrepôt, un lot, une sonde…" : "Rechercher une parcelle, un capteur…"}</span>
        <kbd className="ml-auto hidden rounded border border-line bg-surface px-1.5 font-sans text-[11px] text-ink-3 sm:inline">Ctrl K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {area === "client" && <NotificationsButton alerts={alerts} />}
        <Menu
          trigger={
            <button className="flex items-center gap-2.5 rounded-lg p-1 pr-2 hover:bg-surface-2" aria-label={`Compte de ${name}`}>
              <Avatar name={name} size={34} />
              <span className="hidden text-left md:block">
                <span className="block font-display text-[13.5px] font-semibold leading-tight">{name}</span>
                <span className="block max-w-[180px] truncate text-[12px] text-ink-3">{roleLabel}</span>
              </span>
              <ChevronDown className="hidden size-4 text-ink-3 md:block" aria-hidden />
            </button>
          }
        >
          <MenuLabel>{u?.email}</MenuLabel>
          <MenuItem icon={<UserRound className="size-4" aria-hidden />} onSelect={() => navigate(area === "admin" ? "/admin/parametres" : "/app/parametres")}>
            Mon compte et sécurité
          </MenuItem>
          {u && u.platformRole !== "aucun" && area === "client" && (
            <MenuItem icon={<ShieldCheck className="size-4" aria-hidden />} onSelect={() => navigate("/admin")}>
              Console saytumbay
            </MenuItem>
          )}
          {area === "admin" && session?.memberships.length ? (
            <MenuItem icon={<Building2 className="size-4" aria-hidden />} onSelect={() => navigate("/app")}>
              Espace client
            </MenuItem>
          ) : null}
          <MenuSeparator />
          <MenuLabel>Apparence</MenuLabel>
          {(["clair", "sombre", "systeme"] as const).map((p) => {
            const I = themeIcons[p];
            return (
              <MenuItem key={p} icon={<I className="size-4" aria-hidden />} onSelect={() => setPref(p)}>
                {p === "clair" ? "Clair" : p === "sombre" ? "Sombre" : "Comme l’appareil"}
                {pref === p && <span className="ml-auto text-brand" aria-label="sélectionné">✓</span>}
              </MenuItem>
            );
          })}
          <MenuSeparator />
          <MenuItem icon={<LogOut className="size-4" aria-hidden />} tone="danger" onSelect={() => logout.mutate()}>
            Se déconnecter
          </MenuItem>
        </Menu>
      </div>
    </header>
  );
}

function NotificationsButton({ alerts }: { alerts: Alert[] }) {
  const navigate = useNavigate();
  const n = alerts.length;
  return (
    <Menu
      trigger={
        <button className="relative rounded-lg p-2.5 text-ink-2 hover:bg-surface-2 hover:text-ink" aria-label={n ? `Alertes : ${n} ouvertes` : "Alertes : aucune"}>
          <Bell className="size-5" aria-hidden />
          {n > 0 && <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white tabular dark:text-[#2a0a04]">{n}</span>}
        </button>
      }
    >
      <div className="w-[min(92vw,380px)]">
        <MenuLabel>Alertes ouvertes</MenuLabel>
        {n === 0 && <p className="px-2.5 py-3 text-sm text-ink-3">Rien à signaler. Les capteurs veillent.</p>}
        {alerts.slice(0, 6).map((a) => (
          <MenuItem key={a.id} onSelect={() => navigate(a.module === "onion" ? "/app/onion/alertes" : "/app/alertes")}>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={a.severity} size="sm" />
                <span className="text-[11.5px] text-ink-3">{fmt.ago(a.createdAt)}</span>
              </div>
              <span className="text-[13.5px] font-medium leading-snug">{a.title}</span>
            </div>
          </MenuItem>
        ))}
        {n > 0 && (
          <>
            <MenuSeparator />
            <MenuItem onSelect={() => navigate("/app/alertes")}>Voir toutes les alertes</MenuItem>
          </>
        )}
      </div>
    </Menu>
  );
}

function MobileNav({ nav, count, onMenu }: { nav: NavGroup[]; count: (m: ModuleKey) => number; onMenu: () => void }) {
  const items = nav.flatMap((g) => g.items).filter((i) => i.mobile).slice(0, 4);
  return (
    <nav aria-label="Navigation rapide" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const n = it.badge === "alerts-agritech" ? count("agritech") : it.badge === "alerts-onion" ? count("onion") : 0;
          return (
            <li key={it.to}>
              <NavLink to={it.to} end={it.end} className={({ isActive }) => cn("relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", isActive ? "text-brand" : "text-ink-3")}>
                <it.icon className="size-[22px]" aria-hidden />
                <span className="max-w-full truncate px-1">{it.label.replace("Carte des parcelles", "Carte").replace("Tableau de bord", "Accueil").replace("Vue d’ensemble", "Accueil")}</span>
                {n > 0 && <span className="absolute right-[22%] top-2 rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white dark:text-[#2a0a04]">{n}</span>}
              </NavLink>
            </li>
          );
        })}
        <li>
          <button onClick={onMenu} className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-ink-3">
            <MenuIcon className="size-[22px]" aria-hidden />
            Menu
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function SyncStatus({ at, live = true }: { at?: string; live?: boolean }) {
  const online = navigator.onLine;
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-ink-3">
      {online ? <Wifi className="size-4 text-brand" aria-hidden /> : <WifiOff className="size-4" aria-hidden />}
      {IS_DEMO ? "Mesures simulées" : live ? "En direct" : "Mis à jour"}
      {at ? ` · ${fmt.hm(at)}` : ""}
    </span>
  );
}
