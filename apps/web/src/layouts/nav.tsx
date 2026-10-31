import {
  LayoutDashboard,
  Map,
  Sprout,
  Droplets,
  RadioTower,
  Bell,
  ListChecks,
  BarChart3,
  Users,
  Settings,
  Warehouse,
  Package,
  SlidersHorizontal,
  Building2,
  Cpu,
  ReceiptText,
  Coins,
  UserCog,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: "alerts-agritech" | "alerts-onion";
  mobile?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const AGRITECH_NAV: NavGroup[] = [
  {
    items: [
      { to: "/app", label: "Tableau de bord", icon: LayoutDashboard, end: true, mobile: true },
      { to: "/app/carte", label: "Carte des parcelles", icon: Map, mobile: true },
      { to: "/app/parcelles", label: "Parcelles", icon: Sprout },
      { to: "/app/irrigation", label: "Irrigation", icon: Droplets, mobile: true },
      { to: "/app/capteurs", label: "Capteurs", icon: RadioTower },
      { to: "/app/alertes", label: "Alertes", icon: Bell, badge: "alerts-agritech", mobile: true },
      { to: "/app/taches", label: "Tâches", icon: ListChecks },
      { to: "/app/rapports", label: "Rapports", icon: BarChart3 },
    ],
  },
  {
    label: "Organisation",
    items: [
      { to: "/app/membres", label: "Membres et rôles", icon: Users },
      { to: "/app/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

export const ONION_NAV: NavGroup[] = [
  {
    items: [
      { to: "/app/onion", label: "Vue d’ensemble", icon: LayoutDashboard, end: true, mobile: true },
      { to: "/app/onion/entrepots", label: "Entrepôts", icon: Warehouse, mobile: true },
      { to: "/app/onion/lots", label: "Lots", icon: Package, mobile: true },
      { to: "/app/onion/capteurs", label: "Sondes", icon: RadioTower },
      { to: "/app/onion/alertes", label: "Alertes", icon: Bell, badge: "alerts-onion", mobile: true },
      { to: "/app/onion/seuils", label: "Seuils", icon: SlidersHorizontal },
      { to: "/app/onion/rapports", label: "Rapports", icon: BarChart3 },
    ],
  },
  {
    label: "Organisation",
    items: [
      { to: "/app/taches", label: "Tâches", icon: ListChecks },
      { to: "/app/membres", label: "Membres et rôles", icon: Users },
      { to: "/app/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { to: "/admin/clients", label: "Clients", icon: Building2, mobile: true },
      { to: "/admin/parc", label: "Parc et mises à jour", icon: Cpu, mobile: true },
      { to: "/admin/facturation", label: "Facturation", icon: ReceiptText, mobile: true },
      { to: "/admin/couts", label: "Coûts et rentabilité", icon: Coins },
      { to: "/admin/utilisateurs", label: "Utilisateurs", icon: UserCog },
      { to: "/admin/journal", label: "Journal d’audit", icon: ScrollText, mobile: true },
    ],
  },
  { label: "Compte", items: [{ to: "/admin/parametres", label: "Paramètres", icon: Settings }] },
];
