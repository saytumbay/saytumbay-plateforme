/**
 * Schéma PostgreSQL.
 *
 * - Comptes, sessions, jetons, mesures, alertes et journal : tables relationnelles classiques.
 * - Agrégats métier (parcelles, capteurs, entrepôts…) : « tables documents » avec colonnes de
 *   cloisonnement indexées (`org_id`, `ref`) et le corps de l'objet en JSONB, au format exact du
 *   contrat partagé. Toute lecture passe par un dépôt qui exige l'organisation : pas de requête
 *   sans `org_id`, donc pas de fuite entre clients par oubli d'un filtre.
 */
import { sql } from "drizzle-orm";
import { bigserial, boolean, index, integer, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type {
  CostLine,
  Device,
  FirmwareRelease,
  Inspection,
  Invoice,
  IrrigationEvent,
  IrrigationRule,
  IrrigationSchedule,
  Lot,
  Membership,
  ModuleKey,
  OrgRole,
  Parcel,
  PlatformRole,
  Pump,
  Rollout,
  Site,
  Subscription,
  Task,
  Valve,
  Warehouse,
  Alert,
} from "@saytumbay/shared";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/* ——— Organisations et comptes ——— */

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<"cooperative" | "gie" | "entreprise" | "exploitation">().notNull(),
  region: text("region").notNull(),
  locality: text("locality").notNull(),
  plan: text("plan").$type<"essai" | "standard" | "pro">().notNull(),
  status: text("status").$type<"actif" | "essai" | "suspendu">().notNull(),
  modules: jsonb("modules").$type<ModuleKey[]>().notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
  trialEndsAt: ts("trial_ends_at"),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    /** Empreinte Argon2id ; null tant que l'invitation n'est pas acceptée. */
    passwordHash: text("password_hash"),
    platformRole: text("platform_role").$type<PlatformRole>().notNull().default("aucun"),
    /** Secret TOTP chiffré (AES-256-GCM), null si la double authentification est désactivée. */
    totpSecret: text("totp_secret"),
    totpPending: text("totp_pending"),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    locale: text("locale").$type<"fr" | "wo">().notNull().default("fr"),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at"),
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`), index("users_phone_idx").on(t.phone)],
);

export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: ts("used_at"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.codeHash] })],
);

export const memberships = pgTable(
  "memberships",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").$type<OrgRole>().notNull(),
    parcels: jsonb("parcels").$type<Membership["parcels"]>().notNull(),
    notify: jsonb("notify").$type<Membership["notify"]>().notNull(),
    invitedAt: ts("invited_at").notNull().defaultNow(),
    status: text("status").$type<Membership["status"]>().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.orgId] }), index("memberships_org_idx").on(t.orgId)],
);

/* ——— Sessions et jetons (seules les empreintes SHA-256 sont stockées) ——— */

export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activeOrgId: text("active_org_id"),
    csrf: text("csrf").notNull(),
    remember: boolean("remember").notNull().default(false),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastSeenAt: ts("last_seen_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginChallenges = pgTable("login_challenges", {
  idHash: text("id_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  remember: boolean("remember").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: ts("expires_at").notNull(),
});

export const loginFailures = pgTable("login_failures", {
  email: text("email").primaryKey(),
  count: integer("count").notNull().default(0),
  lockedUntil: ts("locked_until"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
});

export const invites = pgTable("invites", {
  tokenHash: text("token_hash").primaryKey(),
  orgId: text("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  invitedBy: text("invited_by").notNull(),
  role: text("role").$type<OrgRole>().notNull(),
  expiresAt: ts("expires_at").notNull(),
  acceptedAt: ts("accepted_at"),
});

/* ——— Mesures (série temporelle) ——— */

export const measurements = pgTable(
  "measurements",
  {
    deviceId: text("device_id").notNull(),
    metric: text("metric").notNull(),
    ts: ts("ts").notNull(),
    value: real("value").notNull(),
  },
  (t) => [primaryKey({ columns: [t.deviceId, t.metric, t.ts] })],
);

/* ——— Alertes persistées ——— */

export const alerts = pgTable(
  "alerts",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull(),
    /** Clé stable de la cause (`al-sol_sec-p-b`) : une seule alerte non résolue par cause. */
    key: text("key").notNull(),
    module: text("module").$type<ModuleKey>().notNull(),
    kind: text("kind").$type<Alert["kind"]>().notNull(),
    severity: text("severity").$type<Alert["severity"]>().notNull(),
    status: text("status").$type<Alert["status"]>().notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    source: jsonb("source").$type<Alert["source"]>().notNull(),
    notifications: jsonb("notifications").$type<Alert["notifications"]>().notNull().default([]),
    createdAt: ts("created_at").notNull().defaultNow(),
    acknowledgedBy: text("acknowledged_by"),
    acknowledgedAt: ts("acknowledged_at"),
    resolvedAt: ts("resolved_at"),
  },
  (t) => [index("alerts_org_idx").on(t.orgId, t.status), uniqueIndex("alerts_open_key_uq").on(t.orgId, t.key).where(sql`${t.status} <> 'resolue'`)],
);

/* ——— Journal d'audit, contacts, SMS ——— */

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    at: ts("at").notNull().defaultNow(),
    actorId: text("actor_id"),
    actorLabel: text("actor_label").notNull(),
    orgId: text("org_id"),
    action: text("action").notNull(),
    target: text("target").notNull(),
    ip: text("ip"),
    outcome: text("outcome").$type<"succes" | "refus" | "echec">().notNull(),
  },
  (t) => [index("audit_at_idx").on(t.at), index("audit_org_idx").on(t.orgId)],
);

export const contactMessages = pgTable("contact_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  at: ts("at").notNull().defaultNow(),
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  phone: text("phone").notNull(),
  profile: text("profile").notNull(),
  region: text("region").notNull(),
  message: text("message").notNull(),
  ip: text("ip"),
});

export const smsLog = pgTable("sms_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  at: ts("at").notNull().defaultNow(),
  orgId: text("org_id"),
  to: text("to").notNull(),
  text: text("text").notNull(),
  provider: text("provider").notNull(),
  delivered: boolean("delivered").notNull(),
  error: text("error"),
});

/** Réglages internes (instant d'ancrage de la démo, version du jeu de données). */
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

/* ——— Tables documents ——— */

function doc<T>(name: string) {
  return pgTable(
    name,
    {
      id: text("id").primaryKey(),
      orgId: text("org_id").notNull(),
      /** Parent : parcelle (règles, programmations, irrigations), entrepôt (lots, contrôles), DevEUI (capteurs). */
      ref: text("ref"),
      data: jsonb("data").$type<T>().notNull(),
      updatedAt: ts("updated_at").notNull().defaultNow(),
    },
    (t) => [index(`${name}_org_idx`).on(t.orgId), index(`${name}_ref_idx`).on(t.ref)],
  );
}

export const sites = doc<Site>("sites");
export const parcels = doc<Parcel>("parcels");
export const devices = doc<Device & { devEui?: string | null; replaces?: string | null }>("devices");
export const pumps = doc<Pump>("pumps");
export const valves = doc<Valve>("valves");
export const irrigationRules = doc<IrrigationRule>("irrigation_rules");
export const irrigationSchedules = doc<IrrigationSchedule>("irrigation_schedules");
export const irrigationRuns = doc<{ id: string; parcelId: string; startedAt: string; durationMin: number; stoppedAt: string | null; by: string }>("irrigation_runs");
export const irrigationEvents = doc<IrrigationEvent>("irrigation_events");
export const warehouses = doc<Warehouse>("warehouses");
export const lots = doc<Lot>("lots");
export const inspections = doc<Inspection>("inspections");
export const tasks = doc<Task>("tasks");
export const invoices = doc<Invoice>("invoices");
export const subscriptions = doc<Subscription>("subscriptions");
export const costLines = doc<CostLine>("cost_lines");
export const firmwareReleases = doc<FirmwareRelease>("firmware_releases");
export const rollouts = doc<Rollout>("rollouts");

export type DocTable =
  | typeof sites
  | typeof parcels
  | typeof devices
  | typeof pumps
  | typeof valves
  | typeof irrigationRules
  | typeof irrigationSchedules
  | typeof irrigationRuns
  | typeof irrigationEvents
  | typeof warehouses
  | typeof lots
  | typeof inspections
  | typeof tasks
  | typeof invoices
  | typeof subscriptions
  | typeof costLines
  | typeof firmwareReleases
  | typeof rollouts;

/** Organisation fictive qui porte les données propres à la plateforme (firmware, coûts). */
export const PLATFORM = "platform";
