/** Contrats des réponses de l'API (identiques en mode démo et en production). */
import type {
  Alert,
  AuditEntry,
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
  MonthlyFinance,
  Organization,
  ParcelSnapshot,
  Pump,
  Rollout,
  SessionUser,
  Subscription,
  Task,
  User,
  Valve,
  WarehouseSnapshot,
  WeatherNow,
} from "./domain/types";

export type LoginResult = { status: "ok"; session: SessionUser } | { status: "totp"; challengeId: string; method: "application" };

export interface DeviceRow extends Device {
  label: string;
  lastValue: { metric: string; value: number | null; unit: string } | null;
}

export interface Overview {
  orgName: string;
  siteLabel: string;
  generatedAt: string;
  parcels: ParcelSnapshot[];
  alerts: Alert[];
  tasks: Task[];
  weather: WeatherNow;
  devices: { total: number; online: number; offline: string[]; lowBattery: string[] };
  water: { monthM3: number; savedPct: number; savedM3: number; months: Array<{ month: string; total: number; byParcel: Record<string, number> }> };
  equipment: { pump: Pump; valves: Valve[] };
  storage: Array<Pick<WarehouseSnapshot, "risk" | "riskScore" | "stockT" | "temp" | "humidity"> & { id: string; name: string; product: string; variety: string; days: number | null }>;
  areaHa: number;
  areaTrendHa: number;
}

export interface ParcelDetail {
  snapshot: ParcelSnapshot;
  devices: DeviceRow[];
  rule: IrrigationRule | null;
  schedules: IrrigationSchedule[];
  events: IrrigationEvent[];
  alerts: Alert[];
  responsible: Pick<User, "id" | "firstName" | "lastName" | "phone"> | null;
  waterByMonth: Array<{ month: string; m3: number }>;
  soil: { ph: number | null; ec: number | null; n: number | null; p: number | null; k: number | null; temp: number | null };
}

export interface IrrigationState {
  pump: Pump;
  valves: Valve[];
  rules: IrrigationRule[];
  schedules: IrrigationSchedule[];
  events: IrrigationEvent[];
  parcels: ParcelSnapshot[];
}

export interface DeviceDetail {
  device: DeviceRow;
  metrics: string[];
  alerts: Alert[];
  history: Array<{ at: string; label: string }>;
}

export interface WarehouseDetail {
  snapshot: WarehouseSnapshot;
  lots: Lot[];
  inspections: Array<Inspection & { byName: string }>;
  devices: DeviceRow[];
  alerts: Alert[];
}

export interface MemberRow {
  user: Pick<User, "id" | "firstName" | "lastName" | "email" | "phone" | "lastSeenAt" | "twoFactorEnabled">;
  membership: Membership;
}

export interface AgriReport {
  season: string;
  seasons: string[];
  waterTotalM3: number;
  savedPct: number;
  daysBelowThreshold: number;
  months: Array<{ month: string; used: number; saved: number }>;
  byParcel: Array<{ parcelId: string; code: string; crop: string; m3: number; avgMoisture: number | null; dryDays: number | null; color: string }>;
  alertsCount: Record<string, number>;
  irrigations: number;
}

export interface OnionReport {
  stockT: number;
  lossesAvoidedT: number | null;
  inspections: number;
  damagedRate: number;
  byWarehouse: Array<{ id: string; name: string; stockT: number; risk: string; daysOverThreshold: number; alerts: number }>;
}

export interface SearchHit {
  type: "parcelle" | "capteur" | "entrepot" | "lot" | "membre" | "alerte" | "page" | "client" | "facture";
  id: string;
  title: string;
  subtitle: string;
  to: string;
}

export interface AdminOverview {
  orgs: number;
  devices: { installed: number; online: number; offline: string[] };
  outdated: number;
  latestFirmware: string;
  mrr: number;
  openInvoices: number;
  overdue: number;
  smsMonth: number;
}

export interface AdminOrgRow extends Organization {
  devices: number;
  offline: number;
  members: number;
  parcels: number;
  warehouses: number;
  mrr: number;
  lastActivityAt: string | null;
}

export interface AdminOrgDetail {
  org: AdminOrgRow;
  subscription: Subscription | null;
  invoices: Invoice[];
  devices: DeviceRow[];
  members: MemberRow[];
}

export interface FirmwareState {
  releases: FirmwareRelease[];
  rollouts: Rollout[];
  devicesByVersion: Array<{ version: string; count: number }>;
  devices: Array<Pick<DeviceRow, "id" | "orgId" | "kind" | "firmware" | "status" | "label">>;
}

export interface BillingState {
  invoices: Array<Invoice & { orgName: string }>;
  subscriptions: Array<Subscription & { orgName: string }>;
  finance: MonthlyFinance[];
  mrr: number;
}

export interface CostsState {
  lines: CostLine[];
  finance: MonthlyFinance[];
  sensorsInstalled: number;
  sensorsPaying: number;
  fixedRevenue: number;
  variablePerSensor: number;
}

export interface AdminUserRow {
  user: User;
  orgs: Array<{ id: string; name: string; role: string }>;
}

export type AuditRow = AuditEntry;

export const MODULES: Record<ModuleKey, { label: string; short: string; tagline: string }> = {
  agritech: { label: "SaytuMbay AgriTech", short: "AgriTech", tagline: "Sols, parcelles, capteurs et irrigation" },
  onion: { label: "SaytuMbay Onion", short: "Onion", tagline: "Stockage des oignons et pommes de terre" },
};
