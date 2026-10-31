/**
 * Droits d'accès. Deux axes :
 *  - le rôle dans l'organisation cliente (propriétaire → lecteur) ;
 *  - le rôle plateforme de l'équipe saytumbay (support, admin), pour la console interne.
 * Le serveur applique ces règles sur chaque route ; l'interface s'en sert seulement pour
 * masquer les actions impossibles (jamais comme seule protection).
 */
import type { OrgRole, PlatformRole } from "./types";

export type Permission =
  | "parcelles:lire"
  | "parcelles:modifier"
  | "capteurs:lire"
  | "capteurs:gerer"
  | "irrigation:lire"
  | "irrigation:commander"
  | "irrigation:regles"
  | "stock:lire"
  | "stock:controler"
  | "stock:seuils"
  | "alertes:lire"
  | "alertes:traiter"
  | "taches:lire"
  | "taches:gerer"
  | "membres:lire"
  | "membres:gerer"
  | "rapports:lire"
  | "rapports:exporter"
  | "organisation:parametres"
  | "admin:clients"
  | "admin:facturation"
  | "admin:couts"
  | "admin:firmware"
  | "admin:utilisateurs"
  | "admin:audit";

const ALL_ORG: Permission[] = [
  "parcelles:lire",
  "parcelles:modifier",
  "capteurs:lire",
  "capteurs:gerer",
  "irrigation:lire",
  "irrigation:commander",
  "irrigation:regles",
  "stock:lire",
  "stock:controler",
  "stock:seuils",
  "alertes:lire",
  "alertes:traiter",
  "taches:lire",
  "taches:gerer",
  "membres:lire",
  "membres:gerer",
  "rapports:lire",
  "rapports:exporter",
  "organisation:parametres",
];

const READ: Permission[] = ["parcelles:lire", "capteurs:lire", "irrigation:lire", "stock:lire", "alertes:lire", "taches:lire", "membres:lire", "rapports:lire"];

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  proprietaire: ALL_ORG,
  responsable: ALL_ORG.filter((p) => p !== "organisation:parametres"),
  exploitant: [...READ, "irrigation:commander", "stock:controler", "alertes:traiter", "taches:gerer", "rapports:exporter"],
  technicien: [...READ, "capteurs:gerer", "alertes:traiter", "taches:gerer"],
  lecteur: READ,
};

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, Permission[]> = {
  aucun: [],
  support: ["admin:clients", "admin:firmware", "admin:audit"],
  admin: ["admin:clients", "admin:facturation", "admin:couts", "admin:firmware", "admin:utilisateurs", "admin:audit"],
};

export const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  proprietaire: "Propriétaire",
  responsable: "Responsable",
  exploitant: "Exploitant",
  technicien: "Technicien",
  lecteur: "Lecture seule",
};

export const ORG_ROLE_HELP: Record<OrgRole, string> = {
  proprietaire: "Tous les droits, y compris les paramètres de l’organisation et la facturation.",
  responsable: "Gère les parcelles, l’irrigation, les stocks, les seuils et les membres.",
  exploitant: "Suit ses parcelles, lance l’irrigation, saisit les contrôles et traite les alertes.",
  technicien: "Installe et entretient les capteurs, traite les alertes techniques.",
  lecteur: "Consulte les tableaux de bord et les rapports, sans rien modifier.",
};

export const PLATFORM_ROLE_LABEL: Record<PlatformRole, string> = { aucun: "—", support: "Support saytumbay", admin: "Administration saytumbay" };

export function can(
  perm: Permission,
  ctx: { orgRole?: OrgRole | null; platformRole?: PlatformRole | null },
): boolean {
  if (perm.startsWith("admin:")) return PLATFORM_ROLE_PERMISSIONS[ctx.platformRole ?? "aucun"].includes(perm);
  return ctx.orgRole ? ORG_ROLE_PERMISSIONS[ctx.orgRole].includes(perm) : false;
}

/** Un membre ne peut attribuer que des rôles inférieurs ou égaux au sien. */
const RANK: Record<OrgRole, number> = { proprietaire: 5, responsable: 4, exploitant: 3, technicien: 2, lecteur: 1 };
export function canAssignRole(actor: OrgRole, target: OrgRole): boolean {
  return RANK[actor] >= 4 && RANK[target] <= RANK[actor] && !(actor === "responsable" && target === "proprietaire");
}
