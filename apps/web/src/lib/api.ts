/**
 * Client de l'API SaytuMbay. Deux transports, même contrat :
 *  - « api » : appels HTTP vers le serveur (cookie de session httpOnly + jeton CSRF en double envoi) ;
 *  - « demo » : serveur simulé dans le navigateur, chargé à la demande (aucun réseau nécessaire).
 */
import type {
  AdminOrgDetail,
  AdminOrgRow,
  AdminOverview,
  AdminUserRow,
  AgriReport,
  Alert,
  AuditRow,
  BillingState,
  ContactInput,
  CostsState,
  DeviceDetail,
  DeviceRow,
  FirmwareState,
  InspectionInput,
  IrrigationRuleInput,
  IrrigationState,
  LoginResult,
  Lot,
  LotInput,
  MemberRow,
  OnionReport,
  Overview,
  ParcelDetail,
  ParcelInput,
  ParcelSnapshot,
  ScheduleInput,
  SearchHit,
  Series,
  SessionUser,
  Task,
  TaskInput,
  ThresholdsInput,
  WarehouseDetail,
  WarehouseSnapshot,
  WeatherNow,
  InviteInput,
  Metric,
} from "@saytumbay/shared";

export const API_MODE: "demo" | "api" = import.meta.env.VITE_API_MODE === "api" ? "api" : "demo";
export const IS_DEMO = API_MODE === "demo";
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Query = Record<string, string | number | boolean | undefined | null>;

function qs(q?: Query) {
  if (!q) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : null;
}

async function httpRequest<T>(method: Method, path: string, body?: unknown, query?: Query): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const csrf = readCookie("sb_csrf");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}${qs(query)}`, {
      method,
      headers,
      credentials: "include",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "reseau", "Connexion impossible. Vérifiez votre accès à internet.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(res.status, err?.code ?? "erreur", err?.message ?? "Le serveur n’a pas pu traiter la demande.", err?.details);
  }
  return data as T;
}

let demoModule: Promise<typeof import("../demo/backend")> | null = null;
async function demoRequest<T>(method: Method, path: string, body?: unknown, query?: Query): Promise<T> {
  demoModule ??= import("../demo/backend");
  const mod = await demoModule;
  return mod.handle(method, path, body, query) as Promise<T>;
}

export function request<T>(method: Method, path: string, body?: unknown, query?: Query): Promise<T> {
  return IS_DEMO ? demoRequest<T>(method, path, body, query) : httpRequest<T>(method, path, body, query);
}

const get = <T>(p: string, q?: Query) => request<T>("GET", p, undefined, q);
const post = <T>(p: string, b?: unknown) => request<T>("POST", p, b ?? {});
const put = <T>(p: string, b?: unknown) => request<T>("PUT", p, b ?? {});
const patch = <T>(p: string, b?: unknown) => request<T>("PATCH", p, b ?? {});
const del = <T>(p: string) => request<T>("DELETE", p);

export const api = {
  auth: {
    session: () => get<SessionUser | null>("/auth/session"),
    login: (b: { email: string; password: string; remember?: boolean }) => post<LoginResult>("/auth/login", b),
    totp: (b: { challengeId: string; code: string }) => post<SessionUser>("/auth/totp", b),
    logout: () => post<void>("/auth/logout"),
    forgot: (email: string) => post<void>("/auth/forgot", { email }),
    reset: (b: { token: string; password: string; confirm: string }) => post<void>("/auth/reset", b),
    invite: (token: string) => get<{ orgName: string; email: string; phone: string; role: string; firstName: string; lastName: string; invitedBy: string }>(`/auth/invite/${encodeURIComponent(token)}`),
    acceptInvite: (b: { token: string; firstName: string; lastName: string; password: string; confirm: string; acceptTerms: true }) => post<SessionUser>("/auth/invite/accept", b),
    demo: (persona: "responsable" | "technicien" | "admin") => post<SessionUser>("/auth/demo", { persona }),
    switchOrg: (orgId: string) => post<SessionUser>("/me/org", { orgId }),
    profile: (b: { firstName: string; lastName: string; phone: string; locale: "fr" | "wo" }) => patch<SessionUser>("/me/profile", b),
    password: (b: { current: string; password: string; confirm: string }) => put<void>("/me/password", b),
    notifications: (b: { sms: boolean; email: boolean; push: boolean }) => put<void>("/me/notifications", b),
    totpSetup: () => post<{ secret: string; otpauth: string }>("/me/totp/setup"),
    totpEnable: (code: string) => post<{ recoveryCodes: string[] }>("/me/totp/enable", { code }),
    sessions: () => get<Array<{ id: string; current: boolean; device: string; ip: string; lastSeenAt: string }>>("/me/sessions"),
    revokeSession: (id: string) => del<void>(`/me/sessions/${id}`),
  },
  overview: () => get<Overview>("/overview"),
  weather: () => get<WeatherNow>("/weather"),
  search: (q: string) => get<SearchHit[]>("/search", { q }),
  parcels: {
    list: () => get<ParcelSnapshot[]>("/parcels"),
    get: (id: string) => get<ParcelDetail>(`/parcels/${id}`),
    create: (b: ParcelInput) => post<ParcelSnapshot>("/parcels", b),
    update: (id: string, b: Partial<ParcelInput>) => patch<ParcelSnapshot>(`/parcels/${id}`, b),
  },
  devices: {
    list: () => get<DeviceRow[]>("/devices"),
    get: (id: string) => get<DeviceDetail>(`/devices/${id}`),
    register: (b: { id: string; parcelId?: string; warehouseId?: string; zoneId?: string }) => post<DeviceRow>("/devices", b),
    replace: (id: string, newId: string) => post<DeviceRow>(`/devices/${id}/replace`, { newId }),
  },
  series: (device: string, metric: Metric, from: number, to: number) => get<Series>("/series", { device, metric, from, to }),
  irrigation: {
    state: () => get<IrrigationState>("/irrigation"),
    rule: (parcelId: string, b: IrrigationRuleInput) => put<void>(`/irrigation/rules/${parcelId}`, b),
    addSchedule: (b: ScheduleInput) => post<void>("/irrigation/schedules", b),
    updateSchedule: (id: string, b: Partial<ScheduleInput>) => patch<void>(`/irrigation/schedules/${id}`, b),
    deleteSchedule: (id: string) => del<void>(`/irrigation/schedules/${id}`),
    start: (parcelId: string, durationMin: number) => post<void>(`/irrigation/parcels/${parcelId}/start`, { durationMin }),
    stop: (parcelId: string) => post<void>(`/irrigation/parcels/${parcelId}/stop`),
  },
  warehouses: {
    list: () => get<WarehouseSnapshot[]>("/warehouses"),
    get: (id: string) => get<WarehouseDetail>(`/warehouses/${id}`),
    thresholds: (id: string, b: ThresholdsInput) => put<void>(`/warehouses/${id}/thresholds`, b),
  },
  lots: {
    list: () => get<Lot[]>("/lots"),
    create: (b: LotInput) => post<Lot>("/lots", b),
    status: (id: string, status: Lot["status"]) => patch<Lot>(`/lots/${id}`, { status }),
  },
  inspections: { create: (b: InspectionInput) => post<void>("/inspections", b) },
  alerts: {
    list: (q?: { module?: string; status?: string }) => get<Alert[]>("/alerts", q),
    act: (id: string, action: "prendre_en_charge" | "resoudre" | "rouvrir", note?: string) => post<Alert>(`/alerts/${id}/action`, { action, note }),
  },
  tasks: {
    list: () => get<Task[]>("/tasks"),
    create: (b: TaskInput) => post<Task>("/tasks", b),
    status: (id: string, status: Task["status"]) => patch<Task>(`/tasks/${id}`, { status }),
    remove: (id: string) => del<void>(`/tasks/${id}`),
  },
  members: {
    list: () => get<MemberRow[]>("/members"),
    invite: (b: InviteInput) => post<MemberRow>("/members/invite", b),
    update: (userId: string, b: { role?: string; parcels?: string[] | "all" }) => patch<MemberRow>(`/members/${userId}`, b),
    remove: (userId: string) => del<void>(`/members/${userId}`),
  },
  reports: {
    agritech: (season?: string) => get<AgriReport>("/reports/agritech", { season }),
    onion: () => get<OnionReport>("/reports/onion"),
  },
  contact: (b: ContactInput) => post<{ ok: true }>("/contact", b),
  admin: {
    overview: () => get<AdminOverview>("/admin/overview"),
    orgs: () => get<AdminOrgRow[]>("/admin/orgs"),
    org: (id: string) => get<AdminOrgDetail>(`/admin/orgs/${id}`),
    firmware: () => get<FirmwareState>("/admin/firmware"),
    startRollout: (version: string, deviceIds: string[]) => post<void>("/admin/rollouts", { version, deviceIds }),
    rolloutAction: (id: string, action: "pause" | "reprendre" | "annuler" | "generaliser") => post<void>(`/admin/rollouts/${id}/${action}`),
    billing: () => get<BillingState>("/admin/billing"),
    markPaid: (id: string, method: string, amount: number) => post<void>(`/admin/invoices/${id}/pay`, { method, amount }),
    remind: (id: string) => post<{ sms: string }>(`/admin/invoices/${id}/remind`),
    costs: () => get<CostsState>("/admin/costs"),
    users: () => get<AdminUserRow[]>("/admin/users"),
    audit: () => get<AuditRow[]>("/admin/audit"),
  },
};

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Une erreur inattendue s’est produite. Réessayez.";
}
