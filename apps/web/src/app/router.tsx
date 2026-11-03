import { createBrowserRouter, Navigate, type RouteObject } from "react-router";
import { RequireAuth } from "@/lib/auth";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AppShell } from "@/layouts/AppShell";
import { RouteError } from "@/features/shared/RouteError";
import { Splash } from "@/components/brand/Splash";

type Mod = { default: React.ComponentType };
const page = (load: () => Promise<Mod>) => ({ lazy: () => load().then((m) => ({ Component: m.default })) });

const agritech: RouteObject[] = [
  { index: true, ...page(() => import("@/features/agritech/Dashboard")) },
  { path: "tableau-de-bord", element: <Navigate to="/app" replace /> },
  { path: "carte", ...page(() => import("@/features/agritech/MapPage")) },
  { path: "parcelles", ...page(() => import("@/features/agritech/Parcels")) },
  { path: "parcelles/:id", ...page(() => import("@/features/agritech/ParcelDetail")) },
  { path: "irrigation", ...page(() => import("@/features/agritech/Irrigation")) },
  { path: "capteurs", ...page(() => import("@/features/agritech/Sensors")) },
  { path: "capteurs/:id", ...page(() => import("@/features/shared/SensorDetail")) },
  { path: "alertes", ...page(() => import("@/features/shared/AlertsPage")) },
  { path: "taches", ...page(() => import("@/features/shared/TasksPage")) },
  { path: "membres", ...page(() => import("@/features/shared/Members")) },
  { path: "rapports", ...page(() => import("@/features/agritech/Reports")) },
  { path: "parametres", ...page(() => import("@/features/settings/Settings")) },
  {
    path: "onion",
    children: [
      { index: true, ...page(() => import("@/features/onion/Overview")) },
      { path: "entrepots", ...page(() => import("@/features/onion/Warehouses")) },
      { path: "entrepots/:id", ...page(() => import("@/features/onion/WarehouseDetail")) },
      { path: "lots", ...page(() => import("@/features/onion/Lots")) },
      { path: "capteurs", ...page(() => import("@/features/onion/Sensors")) },
      { path: "capteurs/:id", ...page(() => import("@/features/shared/SensorDetail")) },
      { path: "alertes", ...page(() => import("@/features/shared/AlertsPage")) },
      { path: "seuils", ...page(() => import("@/features/onion/Thresholds")) },
      { path: "rapports", ...page(() => import("@/features/onion/Reports")) },
    ],
  },
];

const admin: RouteObject[] = [
  { index: true, element: <Navigate to="/admin/clients" replace /> },
  { path: "clients", ...page(() => import("@/features/admin/Clients")) },
  { path: "clients/:id", ...page(() => import("@/features/admin/ClientDetail")) },
  { path: "parc", ...page(() => import("@/features/admin/Fleet")) },
  { path: "facturation", ...page(() => import("@/features/admin/Billing")) },
  { path: "couts", ...page(() => import("@/features/admin/Costs")) },
  { path: "utilisateurs", ...page(() => import("@/features/admin/Users")) },
  { path: "journal", ...page(() => import("@/features/admin/Audit")) },
  { path: "parametres", ...page(() => import("@/features/settings/Settings")) },
];

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    hydrateFallbackElement: <Splash />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, ...page(() => import("@/features/public/Landing")) },
          { path: "solutions", ...page(() => import("@/features/public/SolutionsPage")) },
          // Anciennes adresses (déjà partagées) : renvoient vers la bonne partie de « Solutions ».
          { path: "agritech", element: <Navigate to="/solutions#champs" replace /> },
          { path: "onion", element: <Navigate to="/solutions#stockage" replace /> },
          { path: "a-propos", ...page(() => import("@/features/public/AboutPage")) },
          { path: "contact", ...page(() => import("@/features/public/ContactPage")) },
          { path: "mentions-legales", ...page(() => import("@/features/public/legal/MentionsLegales")) },
          { path: "confidentialite", ...page(() => import("@/features/public/legal/Confidentialite")) },
          { path: "conditions", ...page(() => import("@/features/public/legal/Conditions")) },
          { path: "cookies", ...page(() => import("@/features/public/legal/Cookies")) },
          { path: "securite", ...page(() => import("@/features/public/legal/Securite")) },
        ],
      },
      { path: "connexion", ...page(() => import("@/features/auth/Login")) },
      { path: "mot-de-passe-oublie", ...page(() => import("@/features/auth/Forgot")) },
      { path: "reinitialiser", ...page(() => import("@/features/auth/Reset")) },
      { path: "invitation/:token", ...page(() => import("@/features/auth/Invite")) },
      {
        path: "app",
        element: (
          <RequireAuth>
            <AppShell area="client" />
          </RequireAuth>
        ),
        children: agritech,
      },
      {
        path: "admin",
        element: (
          <RequireAuth platform>
            <AppShell area="admin" />
          </RequireAuth>
        ),
        children: admin,
      },
      { path: "*", ...page(() => import("@/features/public/NotFound")) },
    ],
  },
]);
