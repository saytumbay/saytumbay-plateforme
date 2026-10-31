/**
 * Modèle de domaine SaytuMbay, partagé entre l'API, le site et le mode démo.
 * Les identifiants sont des chaînes stables (ex. « AS-0003 » pour un capteur de sol).
 * Les dates sont des chaînes ISO 8601 (UTC) à la frontière réseau.
 */

export type ISODate = string;
export type ModuleKey = "agritech" | "onion";

/* ——— Organisations, comptes, rôles ——— */

export type OrgType = "cooperative" | "gie" | "entreprise" | "exploitation";
export type PlanKey = "essai" | "standard" | "pro";
export type OrgStatus = "actif" | "essai" | "suspendu";

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  region: string;
  locality: string;
  plan: PlanKey;
  status: OrgStatus;
  modules: ModuleKey[];
  createdAt: ISODate;
  trialEndsAt?: ISODate | null;
}

/** Rôle d'un membre dans une organisation cliente. */
export type OrgRole = "proprietaire" | "responsable" | "exploitant" | "technicien" | "lecteur";
/** Rôle sur la plateforme (équipe saytumbay). */
export type PlatformRole = "aucun" | "support" | "admin";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  platformRole: PlatformRole;
  twoFactorEnabled: boolean;
  locale: "fr" | "wo";
  createdAt: ISODate;
  lastSeenAt: ISODate | null;
}

export interface Membership {
  userId: string;
  orgId: string;
  role: OrgRole;
  /** Parcelles suivies par ce membre ; « all » = toutes. */
  parcels: string[] | "all";
  notify: { sms: boolean; email: boolean; push: boolean };
  invitedAt: ISODate;
  status: "actif" | "invite" | "desactive";
}

export interface SessionUser {
  user: Pick<User, "id" | "firstName" | "lastName" | "email" | "phone" | "platformRole" | "twoFactorEnabled" | "locale">;
  memberships: Array<Membership & { org: Pick<Organization, "id" | "name" | "type" | "modules" | "status"> }>;
  activeOrgId: string | null;
}

/* ——— AgriTech : sites, parcelles, capteurs ——— */

export interface Site {
  id: string;
  orgId: string;
  name: string;
  locality: string;
  center: [lat: number, lng: number];
}

export type SoilType = "sableux" | "sablo-argileux" | "argileux" | "limoneux";

export interface Parcel {
  id: string;
  orgId: string;
  siteId: string;
  code: string;
  name: string;
  crop: string;
  variety?: string;
  areaHa: number;
  soil: SoilType;
  plantedAt: ISODate;
  harvestAt: ISODate;
  responsibleId: string;
  sensorIds: string[];
  valveId: string | null;
  /** Contour [lat, lng]. */
  polygon: Array<[number, number]>;
  /** Plage d'humidité du sol visée (%). */
  moisture: { dry: number; wet: number };
  color: string;
}

export type DeviceKind = "sol" | "air" | "stockage" | "passerelle";
export type DeviceStatus = "en_ligne" | "batterie_faible" | "hors_ligne" | "maintenance";

export interface Device {
  id: string;
  orgId: string;
  kind: DeviceKind;
  model: string;
  /** Rattachement : parcelle, entrepôt (+ zone) ou site. */
  parcelId?: string | null;
  warehouseId?: string | null;
  zoneId?: string | null;
  siteId?: string | null;
  battery: number | null;
  signal: 0 | 1 | 2 | 3 | 4;
  rssi: number | null;
  firmware: string;
  status: DeviceStatus;
  lastSeenAt: ISODate | null;
  installedAt: ISODate;
  /** Les valeurs affichées viennent du simulateur (mode démo). */
  simulated: boolean;
}

export type SoilMetric = "soilMoisture" | "soilTemp" | "ec" | "ph" | "n" | "p" | "k";
export type AirMetric = "airTemp" | "airHumidity" | "co2" | "gas";
export type Metric = SoilMetric | AirMetric | "battery";

export interface Measurement {
  deviceId: string;
  ts: ISODate;
  values: Partial<Record<Metric, number>>;
}

/** Série compacte pour les graphiques : horodatages (ms) + valeurs (null = mesure absente). */
export interface Series {
  deviceId: string;
  metric: Metric;
  unit: string;
  points: Array<[ts: number, value: number | null]>;
}

export type MoistureState = "sec" | "optimal" | "humide" | "indisponible";

export interface ParcelSnapshot {
  parcel: Parcel;
  moisture: number | null;
  soilTemp: number | null;
  state: MoistureState;
  lastMeasureAt: ISODate | null;
  irrigating: boolean;
  waterMonthM3: number;
}

/* ——— Irrigation ——— */

export interface Pump {
  id: string;
  orgId: string;
  name: string;
  flowM3h: number;
  running: boolean;
}

export interface Valve {
  id: string;
  orgId: string;
  parcelId: string;
  name: string;
  open: boolean;
}

export interface IrrigationRule {
  parcelId: string;
  mode: "automatique" | "manuel";
  startBelow: number;
  stopAbove: number;
  maxDurationMin: number;
  /** Ne pas arroser si la pluie prévue dépasse ce seuil (mm). */
  skipIfRainMm: number;
}

export interface IrrigationSchedule {
  id: string;
  parcelId: string;
  days: number[]; // 0 = lundi
  time: string; // HH:MM
  durationMin: number;
  enabled: boolean;
}

export interface IrrigationEvent {
  id: string;
  parcelId: string;
  kind: "terminee" | "lancee" | "annulee" | "regle_modifiee";
  trigger: "automatique" | "programmee" | "manuelle" | "systeme";
  at: ISODate;
  durationMin: number | null;
  liters: number | null;
  by: string | null;
  note: string;
}

/* ——— Onion : entrepôts, zones, lots, contrôles ——— */

export type StorageProduct = "oignon" | "pomme_de_terre";
export type StorageType = "ventilation_naturelle" | "ventilation_forcee" | "chambre_froide";
export type StorageRisk = "bon" | "surveiller" | "risque" | "pourriture";

export interface StorageThresholds {
  temp: [number, number];
  humidity: [number, number];
  co2: number;
  gas: number;
}

export interface Warehouse {
  id: string;
  orgId: string;
  name: string;
  locality: string;
  product: StorageProduct;
  variety: string;
  capacityT: number;
  storageType: StorageType;
  thresholds: StorageThresholds;
  /** Zones du tas (ex. rangée A, position 1 → « A1 »). */
  zones: Array<{ id: string; label: string; row: number; col: number }>;
  center: [number, number];
}

export interface Lot {
  id: string;
  orgId: string;
  warehouseId: string;
  product: StorageProduct;
  variety: string;
  quantityT: number;
  zoneIds: string[];
  enteredAt: ISODate;
  maxDays: number;
  origin: string;
  status: "en_stock" | "a_vendre" | "vendu";
}

export interface Inspection {
  id: string;
  warehouseId: string;
  zoneId: string;
  lotId: string | null;
  sampled: number;
  damaged: number;
  by: string;
  at: ISODate;
  note: string;
}

export interface ZoneSnapshot {
  zoneId: string;
  temp: number | null;
  humidity: number | null;
  co2: number | null;
  gas: number | null;
  risk: StorageRisk;
  riskScore: number;
  deviceId: string | null;
}

export interface WarehouseSnapshot {
  warehouse: Warehouse;
  temp: number | null;
  humidity: number | null;
  co2: number | null;
  gas: number | null;
  risk: StorageRisk;
  riskScore: number;
  zones: ZoneSnapshot[];
  stockT: number;
  reasons: string[];
  lastMeasureAt: ISODate | null;
}

/* ——— Alertes, tâches, notifications ——— */

export type Severity = "info" | "attention" | "critique";
export type AlertStatus = "ouverte" | "prise_en_charge" | "resolue";
export type AlertKind =
  | "sol_sec"
  | "sol_humide"
  | "capteur_hors_ligne"
  | "batterie_faible"
  | "stock_humidite"
  | "stock_temperature"
  | "stock_co2"
  | "stock_gaz"
  | "stock_controle"
  | "irrigation_annulee";

export interface Alert {
  id: string;
  orgId: string;
  module: ModuleKey;
  kind: AlertKind;
  severity: Severity;
  title: string;
  detail: string;
  advice: string;
  source: { type: "parcelle" | "capteur" | "entrepot" | "zone" | "lot"; id: string; label: string };
  status: AlertStatus;
  createdAt: ISODate;
  acknowledgedBy: string | null;
  acknowledgedAt: ISODate | null;
  resolvedAt: ISODate | null;
  notifications: Array<{ channel: "sms" | "email" | "push"; to: string; at: ISODate; delivered: boolean }>;
}

export type TaskStatus = "a_faire" | "en_cours" | "terminee";

export interface Task {
  id: string;
  orgId: string;
  module: ModuleKey;
  title: string;
  assigneeId: string | null;
  due: ISODate;
  status: TaskStatus;
  link: { type: "parcelle" | "capteur" | "entrepot" | "lot"; id: string } | null;
  createdAt: ISODate;
}

/* ——— Météo ——— */

export interface WeatherNow {
  locality: string;
  temp: number;
  feelsLike: number;
  min: number;
  max: number;
  windKmh: number;
  windDir: string;
  rainTomorrowMm: number;
  et0Mm: number;
  condition: "ensoleille" | "nuageux" | "pluie" | "harmattan";
  simulated: boolean;
}

/* ——— Console admin : facturation, coûts, firmware, audit ——— */

export type InvoiceStatus = "payee" | "en_attente" | "en_retard" | "partielle" | "annulee";
export type PaymentMethod = "wave" | "orange_money" | "virement" | "especes" | "free_money";

export interface Invoice {
  id: string;
  orgId: string;
  label: string;
  amount: number;
  paidAmount: number;
  issuedAt: ISODate;
  dueAt: ISODate;
  status: InvoiceStatus;
  method: PaymentMethod | null;
  paidAt: ISODate | null;
}

export interface Subscription {
  orgId: string;
  plan: PlanKey;
  baseFcfa: number;
  perSensorFcfa: number;
  sensors: number;
  nextBillingAt: ISODate;
  note: string;
}

export interface CostLine {
  id: string;
  month: string; // AAAA-MM
  category: "materiel" | "hebergement" | "sms" | "terrain" | "connectivite" | "autre";
  label: string;
  detail: string;
  amount: number;
}

export interface MonthlyFinance {
  month: string; // AAAA-MM
  billed: number;
  collected: number;
  costs: number;
}

export interface FirmwareRelease {
  version: string;
  releasedAt: ISODate;
  notes: string;
  deviceKinds: DeviceKind[];
}

export interface Rollout {
  id: string;
  version: string;
  startedAt: ISODate;
  status: "en_cours" | "termine" | "en_pause" | "annule";
  targetDeviceIds: string[];
  updatedDeviceIds: string[];
  failedDeviceIds: string[];
  stage: "canari" | "general";
}

export interface AuditEntry {
  id: string;
  at: ISODate;
  actorId: string | null;
  actorLabel: string;
  orgId: string | null;
  action: string;
  target: string;
  ip: string | null;
  outcome: "succes" | "refus" | "echec";
}

/* ——— Pagination et erreurs réseau ——— */

export interface Page<T> {
  items: T[];
  total: number;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
