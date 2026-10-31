/**
 * Serveur de démonstration exécuté dans le navigateur. Il reproduit le contrat de l'API réelle
 * (routes, validations, droits, codes d'erreur) pour que l'interface se comporte à l'identique.
 * Les mesures viennent du simulateur partagé ; les actions sont conservées localement.
 */
import {
  ADVICE,
  can,
  canAssignRole,
  acceptInviteSchema,
  alertActionSchema,
  changePasswordSchema,
  contactSchema,
  deviceRegisterSchema,
  forgotSchema,
  inspectionSchema,
  inviteSchema,
  irrigationRuleSchema,
  loginSchema,
  lotSchema,
  manualIrrigationSchema,
  markPaidSchema,
  notifySchema,
  parcelSchema,
  profileSchema,
  resetSchema,
  rolloutSchema,
  scheduleSchema,
  smsText,
  taskSchema,
  taskStatusSchema,
  thresholdsSchema,
  totpSchema,
  updateMemberSchema,
  fmt,
  METRIC_UNIT,
  type AdminOrgRow,
  type Alert,
  type Device,
  type DeviceRow,
  type Metric,
  type OrgRole,
  type Permission,
  type SessionUser,
  type User,
  type SearchHit,
} from "@saytumbay/shared";
import {
  demoWeather,
  liveAlerts,
  liveDevices,
  parcelSnapshots,
  series,
  setBatteryTargets,
  setSeriesAlias,
  setSoilAdjust,
  valueAt,
  warehouseSnapshots,
  WATER_BY_MONTH,
  PARCEL_COLORS,
} from "@saytumbay/shared/demo";
import type { z } from "zod";
import { ApiError } from "../lib/api";
import { getState, save, type DemoState } from "./store";

export const DEMO_PASSWORD = "Demo-SaytuMbay-2026";
export const DEMO_TOTP = "246810";
/** Codes de secours de démonstration (identiques pour tous les comptes, usage unique). */
export const DEMO_RECOVERY = Array.from({ length: 8 }, (_, i) => `${((4837 * (i + 3)) % 9000) + 1000}-${((7919 * (i + 5)) % 9000) + 1000}`);

const MIN = 60_000;
const D = 24 * 60 * MIN;
type Q = Record<string, string | number | boolean | undefined | null> | undefined;

/* ——— Outils ——— */

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();

function parse<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const r = schema.safeParse(body);
  if (!r.success) {
    const fields: Record<string, string> = {};
    for (const i of r.error.issues) fields[i.path.join(".") || "_"] ??= i.message;
    throw new ApiError(422, "validation", "Certains champs sont à corriger.", { fields });
  }
  return r.data;
}

function audit(s: DemoState, action: string, target: string, outcome: "succes" | "refus" | "echec" = "succes", actor?: User | null) {
  const u = actor ?? s.users.find((x) => x.id === s.sessionUserId) ?? null;
  s.audit.unshift({ id: rid("au"), at: nowIso(), actorId: u?.id ?? null, actorLabel: u ? `${u.firstName} ${u.lastName}` : "inconnu", orgId: s.activeOrgId, action, target, ip: "démo", outcome });
  s.audit = s.audit.slice(0, 300);
}

function sessionOf(s: DemoState): SessionUser {
  const u = s.users.find((x) => x.id === s.sessionUserId);
  if (!u) throw new ApiError(401, "non_connecte", "Votre session a expiré. Reconnectez-vous.");
  const memberships = s.memberships
    .filter((m) => m.userId === u.id && m.status !== "desactive")
    .map((m) => {
      const org = s.organizations.find((o) => o.id === m.orgId)!;
      return { ...m, org: { id: org.id, name: org.name, type: org.type, modules: org.modules, status: org.status } };
    });
  if (!s.activeOrgId || !memberships.some((m) => m.orgId === s.activeOrgId)) s.activeOrgId = memberships[0]?.orgId ?? null;
  return {
    user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, platformRole: u.platformRole, twoFactorEnabled: u.twoFactorEnabled, locale: u.locale },
    memberships,
    activeOrgId: s.activeOrgId,
  };
}

interface Ctx {
  s: DemoState;
  user: User;
  orgId: string;
  role: OrgRole | null;
}

function ctx(s: DemoState, needOrg = true): Ctx {
  const sess = sessionOf(s);
  const user = s.users.find((x) => x.id === sess.user.id)!;
  const m = s.memberships.find((x) => x.userId === user.id && x.orgId === sess.activeOrgId);
  if (needOrg && !m) throw new ApiError(403, "sans_organisation", "Ce compte n’est rattaché à aucune organisation cliente.");
  return { s, user, orgId: sess.activeOrgId ?? "", role: m?.role ?? null };
}

function need(c: Ctx, perm: Permission) {
  if (!can(perm, { orgRole: c.role, platformRole: c.user.platformRole })) {
    audit(c.s, "action refusée", perm, "refus");
    throw new ApiError(403, "interdit", "Votre rôle ne permet pas cette action. Demandez à un responsable de l’organisation.");
  }
}

function visibleParcels(c: Ctx) {
  const m = c.s.memberships.find((x) => x.userId === c.user.id && x.orgId === c.orgId);
  const own = c.s.parcels.filter((p) => p.orgId === c.orgId);
  if (!m || m.parcels === "all") return own;
  return own.filter((p) => (m.parcels as string[]).includes(p.id));
}

function deviceLabel(s: DemoState, d: Device): string {
  if (d.parcelId) return `Parcelle ${s.parcels.find((p) => p.id === d.parcelId)?.code ?? "?"}`;
  if (d.warehouseId) {
    const w = s.warehouses.find((x) => x.id === d.warehouseId);
    const z = w?.zones.find((x) => x.id === d.zoneId);
    return `${w?.name ?? "Entrepôt"}${z ? ` · ${z.label.toLowerCase()}` : " · ambiance"}`;
  }
  if (d.kind === "passerelle") return `Passerelle · ${s.sites.find((x) => x.id === d.siteId)?.name ?? "site"}`;
  return s.sites.find((x) => x.id === d.siteId)?.name ?? "—";
}

function primaryMetric(d: Device): Metric | null {
  if (d.kind === "sol") return "soilMoisture";
  if (d.kind === "stockage" || d.kind === "air") return "airHumidity";
  return null;
}

function deviceRows(s: DemoState, orgId: string | null): DeviceRow[] {
  const t = Date.now();
  return liveDevices(s, t)
    .filter((d) => orgId == null || d.orgId === orgId)
    .map((d) => {
      const metric = primaryMetric(d);
      const value = metric ? valueAt(d.id, metric, t, s.now.getTime()) : null;
      return { ...d, label: deviceLabel(s, d), lastValue: metric ? { metric, value: d.status === "hors_ligne" ? null : value, unit: METRIC_UNIT[metric] } : null };
    });
}

/** Irrigations lancées en démo : l'humidité monte pendant l'arrosage puis redescend. */
function installSoilAdjust(s: DemoState) {
  setSoilAdjust((deviceId, tMs) => {
    const dev = s.devices.find((d) => d.id === deviceId);
    if (!dev?.parcelId) return 0;
    let bump = 0;
    for (const r of s.runs) {
      if (r.parcelId !== dev.parcelId || tMs < r.startedAt) continue;
      const end = Math.min(r.stoppedAt ?? Infinity, r.startedAt + r.durationMin * MIN);
      const wateredMin = (Math.min(tMs, end) - r.startedAt) / MIN;
      const gain = 0.95 * wateredMin;
      const decay = tMs > end ? Math.exp(-(tMs - end) / (20 * 60 * MIN)) : 1;
      bump += gain * decay;
    }
    return bump;
  });
}

function settleRuns(s: DemoState) {
  const t = Date.now();
  for (const r of s.runs) {
    if (r.stoppedAt == null && t >= r.startedAt + r.durationMin * MIN) {
      r.stoppedAt = r.startedAt + r.durationMin * MIN;
      const v = s.valves.find((x) => x.parcelId === r.parcelId);
      if (v) v.open = false;
      s.irrigationEvents.unshift({ id: rid("ie"), parcelId: r.parcelId, kind: "terminee", trigger: "manuelle", at: new Date(r.stoppedAt).toISOString(), durationMin: r.durationMin, liters: Math.round(r.durationMin * 5.6), by: r.by, note: "Durée prévue atteinte" });
    }
  }
  const p = s.pumps[0];
  if (p) p.running = s.valves.some((v) => v.open);
}

function alertsFor(s: DemoState, orgId: string): Alert[] {
  if (orgId !== s.organizations[0]!.id) return [];
  return liveAlerts(s, Date.now(), s.alertOverrides);
}

const monthKeys = (n: number) => {
  const d = new Date();
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - (n - 1 - i), 1));
    return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}`;
  });
};

/* ——— Routes ——— */

type Handler = (a: { s: DemoState; params: Record<string, string>; body: unknown; query: Q }) => unknown;
const routes: Array<[string, string, Handler]> = [];
const on = (method: string, path: string, h: Handler) => routes.push([method, path, h]);

/* Authentification */

on("GET", "/auth/session", ({ s }) => (s.sessionUserId ? sessionOf(s) : null));

on("POST", "/auth/login", async ({ s, body }) => {
  const b = parse(loginSchema, body);
  const f = s.loginFailures[b.email];
  if (f && f.count >= 5 && Date.now() < f.until) {
    audit(s, "connexion bloquée", b.email, "refus", null);
    throw new ApiError(429, "trop_de_tentatives", "Trop de tentatives. Pour votre sécurité, réessayez dans 15 minutes ou réinitialisez votre mot de passe.");
  }
  await wait(350);
  const u = s.users.find((x) => x.email === b.email);
  if (!u || b.password !== DEMO_PASSWORD) {
    const cur = s.loginFailures[b.email] ?? { count: 0, until: 0 };
    cur.count += 1;
    if (cur.count >= 5) cur.until = Date.now() + 15 * MIN;
    s.loginFailures[b.email] = cur;
    audit(s, "connexion", b.email, "refus", null);
    throw new ApiError(401, "identifiants", "E-mail ou mot de passe incorrect.");
  }
  delete s.loginFailures[b.email];
  if (u.twoFactorEnabled) {
    s.pendingTotp = { challengeId: rid("totp") + rid("x"), userId: u.id };
    return { status: "totp", challengeId: s.pendingTotp.challengeId, method: "application" };
  }
  s.sessionUserId = u.id;
  s.activeOrgId = null;
  audit(s, "connexion", u.email, "succes", u);
  return { status: "ok", session: sessionOf(s) };
});

on("POST", "/auth/totp", async ({ s, body }) => {
  const b = parse(totpSchema, body);
  await wait(250);
  if (!s.pendingTotp || s.pendingTotp.challengeId !== b.challengeId) throw new ApiError(401, "defi_expire", "La vérification a expiré. Reprenez la connexion.");
  const recovery = b.code.includes("-");
  if (recovery) {
    const used = (s.usedRecovery ??= []);
    if (!DEMO_RECOVERY.includes(b.code) || used.includes(b.code)) throw new ApiError(401, "code_invalide", "Code de secours inconnu ou déjà utilisé.");
    used.push(b.code);
  } else if (b.code !== DEMO_TOTP) throw new ApiError(401, "code_invalide", "Code incorrect. Vérifiez l’heure de votre téléphone et réessayez.");
  s.sessionUserId = s.pendingTotp.userId;
  s.pendingTotp = null;
  s.activeOrgId = null;
  audit(s, "connexion (double authentification)", "console", "succes");
  return sessionOf(s);
});

on("POST", "/auth/demo", ({ s, body }) => {
  const persona = (body as { persona?: string })?.persona;
  const map: Record<string, string> = { responsable: "u-awa", technicien: "u-ibou", admin: "u-mame" };
  const id = map[persona ?? ""];
  if (!id) throw new ApiError(422, "validation", "Profil de démonstration inconnu.");
  s.sessionUserId = id;
  s.activeOrgId = null;
  audit(s, "connexion (accès démo)", persona!, "succes");
  return sessionOf(s);
});

on("POST", "/auth/logout", ({ s }) => {
  audit(s, "déconnexion", "session");
  s.sessionUserId = null;
  s.activeOrgId = null;
  return undefined;
});

on("POST", "/auth/forgot", async ({ body }) => {
  parse(forgotSchema, body);
  await wait(500);
  return undefined; // même réponse que le compte existe ou non (pas d'énumération)
});

on("POST", "/auth/reset", async ({ body }) => {
  parse(resetSchema, body);
  await wait(400);
  return undefined;
});

on("GET", "/auth/invite/:token", ({ params }) => {
  if (!params.token!.startsWith("demo")) throw new ApiError(404, "invitation_invalide", "Cette invitation a expiré ou a déjà été utilisée. Demandez un nouveau lien au responsable de votre organisation.");
  return { orgName: "Coopérative de Thiès", email: "aida.sy@demo.saytumbay.com", phone: "+221770000000", role: "exploitant", firstName: "Aïda", lastName: "Sy", invitedBy: "Awa Ndiaye" };
});

on("POST", "/auth/invite/accept", ({ s, body }) => {
  const b = parse(acceptInviteSchema, body);
  if (!b.token.startsWith("demo")) throw new ApiError(404, "invitation_invalide", "Cette invitation a expiré.");
  let u = s.users.find((x) => x.email === "aida.sy@demo.saytumbay.com");
  if (!u) {
    u = { id: rid("u"), firstName: b.firstName, lastName: b.lastName, email: "aida.sy@demo.saytumbay.com", phone: "+221770000000", platformRole: "aucun", twoFactorEnabled: false, locale: "fr", createdAt: nowIso(), lastSeenAt: nowIso() };
    s.users.push(u);
    s.memberships.push({ userId: u.id, orgId: s.organizations[0]!.id, role: "exploitant", parcels: ["p-a"], notify: { sms: true, email: false, push: true }, invitedAt: nowIso(), status: "actif" });
  }
  s.sessionUserId = u.id;
  s.activeOrgId = null;
  audit(s, "invitation acceptée", u.email);
  return sessionOf(s);
});

on("POST", "/me/org", ({ s, body }) => {
  const orgId = (body as { orgId?: string })?.orgId;
  const sess = sessionOf(s);
  if (!sess.memberships.some((m) => m.orgId === orgId)) throw new ApiError(403, "interdit", "Vous n’êtes pas membre de cette organisation.");
  s.activeOrgId = orgId!;
  return sessionOf(s);
});

on("PATCH", "/me/profile", ({ s, body }) => {
  const c = ctx(s, false);
  const b = parse(profileSchema, body);
  Object.assign(c.user, { firstName: b.firstName, lastName: b.lastName, phone: b.phone.startsWith("+") ? b.phone : `+221${b.phone.replace(/^00221/, "")}`, locale: b.locale });
  audit(s, "profil modifié", c.user.email);
  return sessionOf(s);
});

on("PUT", "/me/password", ({ s, body }) => {
  const c = ctx(s, false);
  const b = parse(changePasswordSchema, body);
  if (b.current !== DEMO_PASSWORD) throw new ApiError(422, "validation", "Mot de passe actuel incorrect.", { fields: { current: "Mot de passe actuel incorrect" } });
  audit(s, "mot de passe modifié", c.user.email);
  return undefined;
});

on("PUT", "/me/notifications", ({ s, body }) => {
  const c = ctx(s);
  const b = parse(notifySchema, body);
  const m = s.memberships.find((x) => x.userId === c.user.id && x.orgId === c.orgId)!;
  m.notify = b;
  return undefined;
});

on("POST", "/me/totp/setup", ({ s }) => {
  const c = ctx(s, false);
  const secret = "JBSWY3DPEHPK3PXP";
  return { secret, otpauth: `otpauth://totp/SaytuMbay:${encodeURIComponent(c.user.email)}?secret=${secret}&issuer=SaytuMbay&digits=6&period=30` };
});

on("POST", "/me/totp/enable", ({ s, body }) => {
  const c = ctx(s, false);
  const code = (body as { code?: string })?.code;
  if (code !== DEMO_TOTP) throw new ApiError(422, "validation", "Code incorrect.", { fields: { code: `Code incorrect (démo : ${DEMO_TOTP})` } });
  c.user.twoFactorEnabled = true;
  audit(s, "double authentification activée", c.user.email);
  s.usedRecovery = [];
  return { recoveryCodes: [...DEMO_RECOVERY] };
});

on("GET", "/me/sessions", ({ s }) => {
  ctx(s, false);
  return [
    { id: "sess-current", current: true, device: "Ce navigateur", ip: "démo", lastSeenAt: nowIso() },
    { id: "sess-phone", current: false, device: "Téléphone Android · Chrome", ip: "196.207.xx.xx", lastSeenAt: new Date(Date.now() - 5 * 60 * MIN).toISOString() },
  ];
});
on("DELETE", "/me/sessions/:id", ({ s }) => {
  ctx(s, false);
  audit(s, "session révoquée", "appareil");
  return undefined;
});

/* Vue d'ensemble */

on("GET", "/overview", ({ s }) => {
  const c = ctx(s);
  settleRuns(s);
  const t = Date.now();
  const org = s.organizations.find((o) => o.id === c.orgId)!;
  const parcels = parcelSnapshots(s, t).filter((p) => visibleParcels(c).some((v) => v.id === p.parcel.id));
  const devs = deviceRows(s, c.orgId);
  const keys = monthKeys(6);
  const months = keys.map((month, i) => {
    const byParcel: Record<string, number> = {};
    for (const p of s.parcels.filter((x) => x.orgId === c.orgId)) byParcel[p.code] = WATER_BY_MONTH[p.id]?.[i] ?? 0;
    return { month, total: Math.round(Object.values(byParcel).reduce((a, b) => a + b, 0) * 10) / 10, byParcel };
  });
  const whs = warehouseSnapshots(s, t).filter((w) => w.warehouse.orgId === c.orgId);
  return {
    orgName: org.name,
    siteLabel: s.sites.find((x) => x.orgId === c.orgId)?.locality ?? org.locality,
    generatedAt: new Date(t).toISOString(),
    parcels,
    alerts: alertsFor(s, c.orgId).filter((a) => a.status !== "resolue"),
    tasks: s.tasks.filter((x) => x.orgId === c.orgId),
    weather: demoWeather(t),
    devices: { total: devs.filter((d) => d.kind !== "passerelle").length, online: devs.filter((d) => d.kind !== "passerelle" && d.status !== "hors_ligne").length, offline: devs.filter((d) => d.status === "hors_ligne").map((d) => d.id), lowBattery: devs.filter((d) => d.status === "batterie_faible").map((d) => d.id) },
    water: { monthM3: months[months.length - 1]!.total, savedPct: 38, savedM3: 5.4, months },
    equipment: { pump: s.pumps[0]!, valves: s.valves.filter((v) => v.orgId === c.orgId) },
    storage: whs.map((w) => {
      const lots = s.lots.filter((l) => l.warehouseId === w.warehouse.id && l.status !== "vendu");
      const oldest = lots.reduce<number | null>((a, l) => Math.max(a ?? 0, Math.round((t - new Date(l.enteredAt).getTime()) / D)), null);
      return { id: w.warehouse.id, name: w.warehouse.name, product: w.warehouse.product, variety: w.warehouse.variety, risk: w.risk, riskScore: w.riskScore, stockT: w.stockT, temp: w.temp, humidity: w.humidity, days: oldest };
    }),
    areaHa: Math.round(s.parcels.filter((p) => p.orgId === c.orgId).reduce((a, p) => a + p.areaHa, 0) * 10) / 10,
    areaTrendHa: 0.7,
  };
});

on("GET", "/weather", () => demoWeather(Date.now()));

/* Parcelles */

on("GET", "/parcels", ({ s }) => {
  const c = ctx(s);
  need(c, "parcelles:lire");
  settleRuns(s);
  const vis = new Set(visibleParcels(c).map((p) => p.id));
  return parcelSnapshots(s, Date.now()).filter((p) => vis.has(p.parcel.id));
});

on("GET", "/parcels/:id", ({ s, params }) => {
  const c = ctx(s);
  need(c, "parcelles:lire");
  settleRuns(s);
  const p = visibleParcels(c).find((x) => x.id === params.id);
  if (!p) throw new ApiError(404, "introuvable", "Cette parcelle n’existe pas ou n’est pas dans votre périmètre.");
  const t = Date.now();
  const snap = parcelSnapshots(s, t).find((x) => x.parcel.id === p.id)!;
  const devices = deviceRows(s, c.orgId).filter((d) => d.parcelId === p.id);
  const first = devices.find((d) => d.status !== "hors_ligne")?.id ?? p.sensorIds[0]!;
  const v = (m: Metric) => valueAt(first, m, t, s.now.getTime());
  const resp = s.users.find((u) => u.id === p.responsibleId);
  const keys = monthKeys(6);
  return {
    snapshot: snap,
    devices,
    rule: s.rules.find((r) => r.parcelId === p.id) ?? null,
    schedules: s.schedules.filter((x) => x.parcelId === p.id),
    events: s.irrigationEvents.filter((e) => e.parcelId === p.id).slice(0, 12),
    alerts: alertsFor(s, c.orgId).filter((a) => a.source.id === p.id || devices.some((d) => d.id === a.source.id)),
    responsible: resp ? { id: resp.id, firstName: resp.firstName, lastName: resp.lastName, phone: resp.phone } : null,
    waterByMonth: keys.map((month, i) => ({ month, m3: WATER_BY_MONTH[p.id]?.[i] ?? 0 })),
    soil: { ph: v("ph"), ec: v("ec"), n: v("n"), p: v("p"), k: v("k"), temp: v("soilTemp") },
  };
});

on("POST", "/parcels", ({ s, body }) => {
  const c = ctx(s);
  need(c, "parcelles:modifier");
  const b = parse(parcelSchema, body);
  if (s.parcels.some((p) => p.orgId === c.orgId && p.code.toLowerCase() === b.code.toLowerCase())) throw new ApiError(409, "doublon", `Une parcelle porte déjà le code ${b.code}.`, { fields: { code: "Code déjà utilisé" } });
  const site = s.sites.find((x) => x.orgId === c.orgId)!;
  const n = s.parcels.filter((p) => p.orgId === c.orgId).length;
  const [la, lo] = [site.center[0] - 0.0016 - (n % 3) * 0.0004, site.center[1] + 0.0012 * ((n % 4) - 1.5)];
  const d = 0.00028;
  const id = `p-${b.code.toLowerCase()}-${Math.random().toString(36).slice(2, 6)}`;
  s.parcels.push({
    id, orgId: c.orgId, siteId: site.id, code: b.code.toUpperCase(), name: b.name, crop: b.crop, variety: b.variety, areaHa: b.areaHa, soil: b.soil,
    plantedAt: b.plantedAt, harvestAt: b.harvestAt, responsibleId: b.responsibleId, sensorIds: [], valveId: null,
    polygon: b.polygon ?? [[la + d, lo - d * 1.4], [la + d, lo + d * 1.4], [la - d, lo + d * 1.4], [la - d, lo - d * 1.4]],
    moisture: b.moisture, color: PARCEL_COLORS[n % PARCEL_COLORS.length]!,
  });
  s.rules.push({ parcelId: id, mode: "manuel", startBelow: b.moisture.dry, stopAbove: b.moisture.wet, maxDurationMin: 30, skipIfRainMm: 5 });
  audit(s, "parcelle créée", b.name);
  return parcelSnapshots(s, Date.now()).find((x) => x.parcel.id === id);
});

on("PATCH", "/parcels/:id", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "parcelles:modifier");
  const p = s.parcels.find((x) => x.id === params.id && x.orgId === c.orgId);
  if (!p) throw new ApiError(404, "introuvable", "Parcelle introuvable.");
  const b = parse(parcelSchema.partial(), body);
  Object.assign(p, b);
  if (b.moisture) {
    const r = s.rules.find((x) => x.parcelId === p.id);
    if (r) Object.assign(r, { startBelow: b.moisture.dry, stopAbove: b.moisture.wet });
    audit(s, "seuils d’humidité modifiés", `${p.name} · ${b.moisture.dry}–${b.moisture.wet} %`);
  } else audit(s, "parcelle modifiée", p.name);
  return parcelSnapshots(s, Date.now()).find((x) => x.parcel.id === p.id);
});

/* Capteurs et séries */

on("GET", "/devices", ({ s }) => {
  const c = ctx(s);
  need(c, "capteurs:lire");
  return deviceRows(s, c.orgId);
});

on("GET", "/devices/:id", ({ s, params }) => {
  const c = ctx(s);
  need(c, "capteurs:lire");
  const d = deviceRows(s, c.orgId).find((x) => x.id === params.id);
  if (!d) throw new ApiError(404, "introuvable", "Capteur introuvable dans votre organisation.");
  const metrics: Metric[] = d.kind === "sol" ? ["soilMoisture", "soilTemp", "ph", "ec", "n", "p", "k", "battery"] : d.kind === "passerelle" ? [] : ["airTemp", "airHumidity", "co2", "gas", "battery"];
  const fw = s.firmware.find((f) => f.version === d.firmware);
  return {
    device: d,
    metrics,
    alerts: alertsFor(s, c.orgId).filter((a) => a.source.id === d.id || (d.parcelId && a.source.id === d.parcelId) || (d.warehouseId && a.source.id === d.warehouseId)),
    history: [
      ...(d.status === "hors_ligne" && d.lastSeenAt ? [{ at: d.lastSeenAt, label: "Dernière mesure reçue" }] : []),
      ...(fw ? [{ at: fw.releasedAt, label: `Micrologiciel ${fw.version} disponible` }] : []),
      { at: d.installedAt, label: `Installé (${d.model})` },
    ],
  };
});

on("POST", "/devices", ({ s, body }) => {
  const c = ctx(s);
  need(c, "capteurs:gerer");
  const b = parse(deviceRegisterSchema, body);
  if (s.devices.some((d) => d.id === b.id)) throw new ApiError(409, "doublon", `Le capteur ${b.id} est déjà enregistré.`, { fields: { id: "Identifiant déjà enregistré" } });
  if (b.parcelId && !s.parcels.some((p) => p.id === b.parcelId && p.orgId === c.orgId)) throw new ApiError(422, "validation", "Parcelle inconnue.", { fields: { parcelId: "Parcelle inconnue" } });
  const kind: Device["kind"] = b.id.startsWith("AS") ? "sol" : b.id.startsWith("OS") ? "stockage" : "passerelle";
  const dev: Device = { id: b.id, orgId: c.orgId, kind, model: kind === "sol" ? "Dragino LSE01" : kind === "stockage" ? "Dragino LHT65N + sonde" : "Dragino LPS8N", parcelId: b.parcelId ?? null, warehouseId: b.warehouseId ?? null, zoneId: b.zoneId ?? null, siteId: null, battery: 100, signal: 0, rssi: null, firmware: "v1.4.2", status: "hors_ligne", lastSeenAt: null, installedAt: nowIso(), simulated: true };
  s.devices.push(dev);
  if (b.parcelId) s.parcels.find((p) => p.id === b.parcelId)?.sensorIds.push(b.id);
  audit(s, "capteur ajouté", b.id);
  return deviceRows(s, c.orgId).find((x) => x.id === b.id);
});

on("POST", "/devices/:id/replace", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "capteurs:gerer");
  const old = s.devices.find((d) => d.id === params.id && d.orgId === c.orgId);
  if (!old) throw new ApiError(404, "introuvable", "Capteur introuvable.");
  const newId = parse(deviceRegisterSchema.pick({ id: true }), { id: (body as { newId?: string })?.newId }).id;
  if (s.devices.some((d) => d.id === newId)) throw new ApiError(409, "doublon", `Le capteur ${newId} est déjà enregistré.`, { fields: { newId: "Identifiant déjà enregistré" } });
  const fresh: Device = { ...old, id: newId, battery: 100, signal: 4, rssi: -90, status: "en_ligne", lastSeenAt: nowIso(), installedAt: nowIso(), firmware: "v1.4.2" };
  s.devices = s.devices.filter((d) => d.id !== old.id).concat(fresh);
  for (const p of s.parcels) p.sensorIds = p.sensorIds.map((x) => (x === old.id ? newId : x));
  s.aliases[newId] = old.id;
  setSeriesAlias(newId, old.id);
  setBatteryTargets({ [newId]: 100 });
  // Un capteur hors ligne remplacé reprend les mesures à partir de maintenant.
  audit(s, "capteur remplacé", `${old.id} → ${newId}`);
  return deviceRows(s, c.orgId).find((x) => x.id === newId);
});

on("GET", "/series", ({ s, query }) => {
  const c = ctx(s);
  need(c, "capteurs:lire");
  const device = String(query?.device ?? "");
  const metric = String(query?.metric ?? "") as Metric;
  if (!s.devices.some((d) => d.id === device && d.orgId === c.orgId)) throw new ApiError(404, "introuvable", "Capteur introuvable.");
  if (!(metric in METRIC_UNIT)) throw new ApiError(422, "validation", "Mesure inconnue.");
  const to = Math.min(Number(query?.to ?? Date.now()), Date.now());
  const from = Math.max(Number(query?.from ?? to - 7 * D), to - 120 * D);
  const sr = series(device, metric, from, to, s.now.getTime());
  const dev = s.devices.find((d) => d.id === device)!;
  // Capteur ajouté pendant la démo : pas d'historique avant l'installation.
  if (!s.aliases[device] && dev.installedAt > s.now.toISOString()) sr.points = sr.points.map(([ts]) => [ts, null]);
  return sr;
});

/* Irrigation */

on("GET", "/irrigation", ({ s }) => {
  const c = ctx(s);
  need(c, "irrigation:lire");
  settleRuns(s);
  const vis = new Set(visibleParcels(c).map((p) => p.id));
  return {
    pump: s.pumps[0],
    valves: s.valves.filter((v) => v.orgId === c.orgId),
    rules: s.rules.filter((r) => vis.has(r.parcelId)),
    schedules: s.schedules.filter((x) => vis.has(x.parcelId)),
    events: s.irrigationEvents.filter((e) => vis.has(e.parcelId)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40),
    parcels: parcelSnapshots(s, Date.now()).filter((p) => vis.has(p.parcel.id)),
  };
});

on("PUT", "/irrigation/rules/:parcelId", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "irrigation:regles");
  const b = parse(irrigationRuleSchema, body);
  if (b.stopAbove - b.startBelow < 5) throw new ApiError(422, "validation", "L’arrêt doit être au moins 5 points au-dessus du démarrage.", { fields: { stopAbove: "Au moins 5 points au-dessus du démarrage" } });
  const r = s.rules.find((x) => x.parcelId === params.parcelId);
  const p = s.parcels.find((x) => x.id === params.parcelId && x.orgId === c.orgId);
  if (!r || !p) throw new ApiError(404, "introuvable", "Parcelle introuvable.");
  const before = `${r.mode}, ${r.startBelow} %`;
  Object.assign(r, b);
  s.irrigationEvents.unshift({ id: rid("ie"), parcelId: p.id, kind: "regle_modifiee", trigger: "manuelle", at: nowIso(), durationMin: null, liters: null, by: c.user.id, note: `${before} → ${b.mode}, ${b.startBelow} %` });
  audit(s, "règle d’irrigation modifiée", `${p.name} · ${before} → ${b.mode}, ${b.startBelow} %`);
  return undefined;
});

on("POST", "/irrigation/schedules", ({ s, body }) => {
  const c = ctx(s);
  need(c, "irrigation:regles");
  const b = parse(scheduleSchema, body);
  if (!s.parcels.some((p) => p.id === b.parcelId && p.orgId === c.orgId)) throw new ApiError(422, "validation", "Parcelle inconnue.", { fields: { parcelId: "Parcelle inconnue" } });
  s.schedules.push({ id: rid("sch"), ...b });
  audit(s, "programmation ajoutée", `${b.parcelId} · ${b.time}`);
  return undefined;
});

on("PATCH", "/irrigation/schedules/:id", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "irrigation:regles");
  const x = s.schedules.find((y) => y.id === params.id);
  if (!x) throw new ApiError(404, "introuvable", "Programmation introuvable.");
  Object.assign(x, parse(scheduleSchema.partial(), body));
  return undefined;
});

on("DELETE", "/irrigation/schedules/:id", ({ s, params }) => {
  const c = ctx(s);
  need(c, "irrigation:regles");
  s.schedules = s.schedules.filter((y) => y.id !== params.id);
  audit(s, "programmation supprimée", params.id!);
  return undefined;
});

on("POST", "/irrigation/parcels/:id/start", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "irrigation:commander");
  const b = parse(manualIrrigationSchema, body);
  const p = visibleParcels(c).find((x) => x.id === params.id);
  if (!p) throw new ApiError(404, "introuvable", "Parcelle introuvable.");
  const v = s.valves.find((x) => x.parcelId === p.id);
  if (!v) throw new ApiError(409, "sans_vanne", "Cette parcelle n’a pas de vanne pilotable.");
  settleRuns(s);
  if (v.open) throw new ApiError(409, "deja_en_cours", "Une irrigation est déjà en cours sur cette parcelle.");
  v.open = true;
  s.pumps[0]!.running = true;
  s.runs.push({ parcelId: p.id, startedAt: Date.now(), durationMin: b.durationMin, stoppedAt: null, by: c.user.id });
  s.irrigationEvents.unshift({ id: rid("ie"), parcelId: p.id, kind: "lancee", trigger: "manuelle", at: nowIso(), durationMin: b.durationMin, liters: null, by: c.user.id, note: "Commande depuis la plateforme" });
  audit(s, "irrigation lancée", `${p.name} · ${b.durationMin} min`);
  return undefined;
});

on("POST", "/irrigation/parcels/:id/stop", ({ s, params }) => {
  const c = ctx(s);
  need(c, "irrigation:commander");
  const run = s.runs.find((r) => r.parcelId === params.id && r.stoppedAt == null);
  const v = s.valves.find((x) => x.parcelId === params.id);
  if (!run || !v) throw new ApiError(409, "pas_en_cours", "Aucune irrigation en cours sur cette parcelle.");
  run.stoppedAt = Date.now();
  v.open = false;
  settleRuns(s);
  const min = Math.max(1, Math.round((run.stoppedAt - run.startedAt) / MIN));
  s.irrigationEvents.unshift({ id: rid("ie"), parcelId: run.parcelId, kind: "terminee", trigger: "manuelle", at: nowIso(), durationMin: min, liters: Math.round(min * 5.6), by: c.user.id, note: "Arrêt manuel" });
  audit(s, "irrigation arrêtée", run.parcelId);
  return undefined;
});

/* Stockage */

on("GET", "/warehouses", ({ s }) => {
  const c = ctx(s);
  need(c, "stock:lire");
  return warehouseSnapshots(s, Date.now()).filter((w) => w.warehouse.orgId === c.orgId);
});

on("GET", "/warehouses/:id", ({ s, params }) => {
  const c = ctx(s);
  need(c, "stock:lire");
  const snap = warehouseSnapshots(s, Date.now()).find((w) => w.warehouse.id === params.id && w.warehouse.orgId === c.orgId);
  if (!snap) throw new ApiError(404, "introuvable", "Entrepôt introuvable.");
  const name = (id: string) => {
    const u = s.users.find((x) => x.id === id);
    return u ? `${u.firstName} ${u.lastName}` : "—";
  };
  return {
    snapshot: snap,
    lots: s.lots.filter((l) => l.warehouseId === snap.warehouse.id),
    inspections: s.inspections.filter((i) => i.warehouseId === snap.warehouse.id).sort((a, b) => b.at.localeCompare(a.at)).map((i) => ({ ...i, byName: name(i.by) })),
    devices: deviceRows(s, c.orgId).filter((d) => d.warehouseId === snap.warehouse.id),
    alerts: alertsFor(s, c.orgId).filter((a) => a.source.id === snap.warehouse.id || a.source.id.startsWith(snap.warehouse.id) || s.devices.some((d) => d.warehouseId === snap.warehouse.id && d.id === a.source.id)),
  };
});

on("PUT", "/warehouses/:id/thresholds", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "stock:seuils");
  const b = parse(thresholdsSchema, body);
  if (b.temp[0] >= b.temp[1]) throw new ApiError(422, "validation", "La température minimale doit être inférieure à la maximale.", { fields: { temp: "Minimum ≥ maximum" } });
  if (b.humidity[0] >= b.humidity[1]) throw new ApiError(422, "validation", "L’humidité minimale doit être inférieure à la maximale.", { fields: { humidity: "Minimum ≥ maximum" } });
  const w = s.warehouses.find((x) => x.id === params.id && x.orgId === c.orgId);
  if (!w) throw new ApiError(404, "introuvable", "Entrepôt introuvable.");
  w.thresholds = b;
  audit(s, "seuils de stockage modifiés", w.name);
  return undefined;
});

on("GET", "/lots", ({ s }) => {
  const c = ctx(s);
  need(c, "stock:lire");
  return s.lots.filter((l) => l.orgId === c.orgId);
});

on("POST", "/lots", ({ s, body }) => {
  const c = ctx(s);
  need(c, "stock:controler");
  const b = parse(lotSchema, body);
  const w = s.warehouses.find((x) => x.id === b.warehouseId && x.orgId === c.orgId);
  if (!w) throw new ApiError(422, "validation", "Entrepôt inconnu.", { fields: { warehouseId: "Entrepôt inconnu" } });
  const n = s.lots.length + 1;
  const lot = { id: `L-${String(40 + n).padStart(2, "0")}`, orgId: c.orgId, product: w.product, status: "en_stock" as const, ...b };
  s.lots.push(lot);
  audit(s, "lot enregistré", `${lot.id} · ${w.name}`);
  return lot;
});

on("PATCH", "/lots/:id", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "stock:controler");
  const l = s.lots.find((x) => x.id === params.id && x.orgId === c.orgId);
  if (!l) throw new ApiError(404, "introuvable", "Lot introuvable.");
  const st = (body as { status?: string })?.status;
  if (st !== "en_stock" && st !== "a_vendre" && st !== "vendu") throw new ApiError(422, "validation", "Statut inconnu.");
  l.status = st;
  audit(s, "lot mis à jour", `${l.id} · ${st}`);
  return l;
});

on("POST", "/inspections", ({ s, body }) => {
  const c = ctx(s);
  need(c, "stock:controler");
  const b = parse(inspectionSchema, body);
  if (!s.warehouses.some((w) => w.id === b.warehouseId && w.orgId === c.orgId)) throw new ApiError(422, "validation", "Entrepôt inconnu.");
  s.inspections.push({ id: rid("ins"), warehouseId: b.warehouseId, zoneId: b.zoneId, lotId: b.lotId ?? null, sampled: b.sampled, damaged: b.damaged, note: b.note ?? "", by: c.user.id, at: nowIso() });
  audit(s, "contrôle visuel saisi", `${b.warehouseId} · ${b.zoneId}`);
  return undefined;
});

/* Alertes et tâches */

on("GET", "/alerts", ({ s, query }) => {
  const c = ctx(s);
  need(c, "alertes:lire");
  let a = alertsFor(s, c.orgId);
  if (query?.module) a = a.filter((x) => x.module === query.module);
  if (query?.status) a = a.filter((x) => x.status === query.status);
  return a;
});

on("POST", "/alerts/:id/action", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "alertes:traiter");
  const b = parse(alertActionSchema, body);
  const a = alertsFor(s, c.orgId).find((x) => x.id === params.id);
  if (!a) throw new ApiError(404, "introuvable", "Cette alerte n’existe plus : la situation est peut-être revenue à la normale.");
  const o = (s.alertOverrides[a.id] ??= {});
  if (b.action === "prendre_en_charge") Object.assign(o, { status: "prise_en_charge", acknowledgedBy: c.user.id, acknowledgedAt: nowIso() });
  if (b.action === "resoudre") Object.assign(o, { status: "resolue", resolvedAt: nowIso(), acknowledgedBy: o.acknowledgedBy ?? c.user.id, acknowledgedAt: o.acknowledgedAt ?? nowIso() });
  if (b.action === "rouvrir") Object.assign(o, { status: "ouverte", resolvedAt: null });
  audit(s, `alerte ${b.action === "prendre_en_charge" ? "prise en charge" : b.action === "resoudre" ? "résolue" : "rouverte"}`, a.source.label);
  return { ...a, ...o };
});

on("GET", "/tasks", ({ s }) => {
  const c = ctx(s);
  need(c, "taches:lire");
  return s.tasks.filter((t) => t.orgId === c.orgId).sort((a, b) => a.due.localeCompare(b.due));
});

on("POST", "/tasks", ({ s, body }) => {
  const c = ctx(s);
  need(c, "taches:gerer");
  const b = parse(taskSchema, body);
  const t = { id: rid("tk"), orgId: c.orgId, module: b.module, title: b.title, assigneeId: b.assigneeId, due: b.due, status: "a_faire" as const, link: b.link ?? null, createdAt: nowIso() };
  s.tasks.push(t);
  const who = s.users.find((u) => u.id === b.assigneeId);
  if (who) s.sentSms.push({ to: who.phone, text: `SaytuMbay : nouvelle tâche « ${b.title} » pour le ${fmt.date(b.due)}.`, at: nowIso() });
  audit(s, "tâche créée", b.title);
  return t;
});

on("PATCH", "/tasks/:id", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "taches:gerer");
  const t = s.tasks.find((x) => x.id === params.id && x.orgId === c.orgId);
  if (!t) throw new ApiError(404, "introuvable", "Tâche introuvable.");
  t.status = parse(taskStatusSchema, body).status;
  return t;
});

on("DELETE", "/tasks/:id", ({ s, params }) => {
  const c = ctx(s);
  need(c, "taches:gerer");
  s.tasks = s.tasks.filter((x) => !(x.id === params.id && x.orgId === c.orgId));
  return undefined;
});

/* Membres */

on("GET", "/members", ({ s }) => {
  const c = ctx(s);
  need(c, "membres:lire");
  return s.memberships
    .filter((m) => m.orgId === c.orgId && m.status !== "desactive")
    .map((m) => {
      const u = s.users.find((x) => x.id === m.userId)!;
      return { user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, lastSeenAt: u.lastSeenAt, twoFactorEnabled: u.twoFactorEnabled }, membership: m };
    });
});

on("POST", "/members/invite", ({ s, body }) => {
  const c = ctx(s);
  need(c, "membres:gerer");
  const b = parse(inviteSchema, body);
  if (!c.role || !canAssignRole(c.role, b.role)) throw new ApiError(403, "interdit", "Vous ne pouvez pas attribuer un rôle supérieur au vôtre.");
  const phone = b.phone.startsWith("+") ? b.phone : `+221${b.phone.replace(/^00221/, "")}`;
  if (s.users.some((u) => u.phone === phone && s.memberships.some((m) => m.userId === u.id && m.orgId === c.orgId))) throw new ApiError(409, "doublon", "Cette personne est déjà membre.", { fields: { phone: "Numéro déjà membre" } });
  const u: User = { id: rid("u"), firstName: b.firstName, lastName: b.lastName, email: b.email || `${b.firstName}.${b.lastName}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s/g, "") + "@invite.saytumbay.com", phone, platformRole: "aucun", twoFactorEnabled: false, locale: "fr", createdAt: nowIso(), lastSeenAt: null };
  s.users.push(u);
  const m = { userId: u.id, orgId: c.orgId, role: b.role, parcels: b.parcels, notify: { sms: true, email: false, push: false }, invitedAt: nowIso(), status: "invite" as const };
  s.memberships.push(m);
  s.sentSms.push({ to: phone, text: `${c.user.firstName} vous invite sur SaytuMbay (${s.organizations.find((o) => o.id === c.orgId)?.name}). Lien : saytumbay.com/invitation/demo-…`, at: nowIso() });
  audit(s, "membre invité", `${b.firstName} ${b.lastName} · ${b.role}`);
  return { user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, lastSeenAt: null, twoFactorEnabled: false }, membership: m };
});

on("PATCH", "/members/:userId", ({ s, params, body }) => {
  const c = ctx(s);
  need(c, "membres:gerer");
  const b = parse(updateMemberSchema, body);
  const m = s.memberships.find((x) => x.userId === params.userId && x.orgId === c.orgId);
  if (!m) throw new ApiError(404, "introuvable", "Membre introuvable.");
  if (m.userId === c.user.id && b.role) throw new ApiError(403, "interdit", "Vous ne pouvez pas modifier votre propre rôle.");
  if (b.role && (!c.role || !canAssignRole(c.role, b.role) || !canAssignRole(c.role, m.role))) throw new ApiError(403, "interdit", "Vous ne pouvez pas attribuer ou retirer un rôle supérieur au vôtre.");
  if (b.role) m.role = b.role;
  if (b.parcels) m.parcels = b.parcels;
  const u = s.users.find((x) => x.id === m.userId)!;
  audit(s, "rôle modifié", `${u.firstName} ${u.lastName} → ${m.role}`);
  return { user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, lastSeenAt: u.lastSeenAt, twoFactorEnabled: u.twoFactorEnabled }, membership: m };
});

on("DELETE", "/members/:userId", ({ s, params }) => {
  const c = ctx(s);
  need(c, "membres:gerer");
  const m = s.memberships.find((x) => x.userId === params.userId && x.orgId === c.orgId);
  if (!m) throw new ApiError(404, "introuvable", "Membre introuvable.");
  if (m.userId === c.user.id) throw new ApiError(403, "interdit", "Vous ne pouvez pas vous retirer vous-même.");
  if (m.role === "proprietaire" && s.memberships.filter((x) => x.orgId === c.orgId && x.role === "proprietaire" && x.status === "actif").length <= 1) throw new ApiError(409, "dernier_proprietaire", "L’organisation doit garder au moins un propriétaire.");
  if (c.role && !canAssignRole(c.role, m.role)) throw new ApiError(403, "interdit", "Vous ne pouvez pas retirer un membre de rôle supérieur.");
  m.status = "desactive";
  audit(s, "membre retiré", m.userId);
  return undefined;
});

/* Rapports */

on("GET", "/reports/agritech", ({ s, query }) => {
  const c = ctx(s);
  need(c, "rapports:lire");
  const seasons = ["Saison sèche 2025-2026", "Hivernage 2025", "Saison sèche 2024-2025"];
  const season = seasons.includes(String(query?.season)) ? String(query?.season) : seasons[0]!;
  const mult = season.startsWith("Hivernage") ? 0.4 : season.endsWith("2024-2025") ? 1.15 : 1;
  const labels = season.startsWith("Hivernage") ? ["2025-07", "2025-08", "2025-09", "2025-10"] : season.endsWith("2024-2025") ? ["2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04"] : ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04"];
  const base = [9.8, 12.1, 13.4, 14.2, 15.6, 16.1];
  const months = labels.map((month, i) => {
    const used = Math.round(base[i]! * mult * 10) / 10;
    return { month, used, saved: Math.round(used * 0.38 * 10) / 10 };
  });
  const ps = s.parcels.filter((p) => p.orgId === c.orgId);
  const t = Date.now();
  const snaps = parcelSnapshots(s, t);
  return {
    season,
    seasons,
    waterTotalM3: Math.round(months.reduce((a, m) => a + m.used, 0) * 10) / 10,
    savedPct: 38,
    daysBelowThreshold: mult < 1 ? 4 : 16,
    months,
    byParcel: ps.map((p, i) => {
      const w = [2.1, 3.4, 1.9, 1.2, 0.8, 2.6][i] ?? 1;
      const sn = snaps.find((x) => x.parcel.id === p.id);
      return { parcelId: p.id, code: p.code, crop: p.crop, m3: Math.round(w * mult * 3 * 10) / 10, avgMoisture: sn?.moisture == null ? null : Math.round(sn.moisture + 3), dryDays: p.code === "E" ? null : ([2, 9, 1, 0, 0, 4][i] ?? 0), color: p.color };
    }),
    alertsCount: { sol_sec: mult < 1 ? 3 : 14, capteur_hors_ligne: 2, batterie_faible: 3, stock: 6 },
    irrigations: Math.round(142 * mult),
  };
});

on("GET", "/reports/onion", ({ s }) => {
  const c = ctx(s);
  need(c, "rapports:lire");
  const ws = warehouseSnapshots(s, Date.now()).filter((w) => w.warehouse.orgId === c.orgId);
  const ins = s.inspections.filter((i) => ws.some((w) => w.warehouse.id === i.warehouseId));
  const sampled = ins.reduce((a, i) => a + i.sampled, 0);
  return {
    stockT: ws.reduce((a, w) => a + w.stockT, 0),
    lossesAvoidedT: null,
    inspections: ins.length,
    damagedRate: sampled ? Math.round((ins.reduce((a, i) => a + i.damaged, 0) / sampled) * 1000) / 10 : 0,
    byWarehouse: ws.map((w) => ({ id: w.warehouse.id, name: w.warehouse.name, stockT: w.stockT, risk: w.risk, daysOverThreshold: w.risk === "bon" ? 0 : w.risk === "surveiller" ? 2 : 6, alerts: alertsFor(s, c.orgId).filter((a) => a.source.id.startsWith(w.warehouse.id)).length })),
  };
});

/* Recherche */

on("GET", "/search", ({ s, query }) => {
  const c = ctx(s, false);
  const q = String(query?.q ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (q.length < 1) return [];
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const hits: SearchHit[] = [];
  if (c.orgId) {
    for (const p of visibleParcels(c)) if (norm(`${p.name} ${p.crop} ${p.variety ?? ""} ${p.code}`).includes(q)) hits.push({ type: "parcelle", id: p.id, title: p.name, subtitle: `${p.crop} · ${fmt.hectares(p.areaHa)}`, to: `/app/parcelles/${p.id}` });
    for (const d of deviceRows(s, c.orgId)) if (norm(`${d.id} ${d.label} ${d.model}`).includes(q)) hits.push({ type: "capteur", id: d.id, title: d.id, subtitle: d.label, to: d.kind === "sol" || d.kind === "passerelle" ? `/app/capteurs/${d.id}` : `/app/onion/capteurs/${d.id}` });
    for (const w of s.warehouses.filter((x) => x.orgId === c.orgId)) if (norm(`${w.name} ${w.locality} ${w.variety}`).includes(q)) hits.push({ type: "entrepot", id: w.id, title: w.name, subtitle: `${w.product === "oignon" ? "Oignon" : "Pomme de terre"} · ${w.variety}`, to: `/app/onion/entrepots/${w.id}` });
    for (const l of s.lots.filter((x) => x.orgId === c.orgId)) if (norm(`${l.id} ${l.variety} ${l.origin}`).includes(q)) hits.push({ type: "lot", id: l.id, title: `Lot ${l.id}`, subtitle: `${fmt.tonnes(l.quantityT)} · ${s.warehouses.find((w) => w.id === l.warehouseId)?.name ?? ""}`, to: `/app/onion/lots` });
    for (const m of s.memberships.filter((x) => x.orgId === c.orgId && x.status !== "desactive")) {
      const u = s.users.find((x) => x.id === m.userId)!;
      if (norm(`${u.firstName} ${u.lastName} ${u.phone}`).includes(q)) hits.push({ type: "membre", id: u.id, title: `${u.firstName} ${u.lastName}`, subtitle: fmt.phone(u.phone), to: `/app/membres` });
    }
  }
  if (c.user.platformRole !== "aucun") {
    for (const o of s.organizations) if (norm(o.name).includes(q)) hits.push({ type: "client", id: o.id, title: o.name, subtitle: o.locality, to: `/admin/clients/${o.id}` });
    for (const i of s.invoices) if (norm(`${i.id} ${i.label}`).includes(q)) hits.push({ type: "facture", id: i.id, title: i.id, subtitle: i.label, to: `/admin/facturation` });
  }
  return hits.slice(0, 20);
});

/* Contact (site public) */

on("POST", "/contact", async ({ s, body }) => {
  const b = parse(contactSchema, body);
  await wait(500);
  s.contactMessages += 1;
  void b;
  return { ok: true };
});

/* Console admin */

function needPlatform(s: DemoState, perm: Permission) {
  const c = ctx(s, false);
  if (!can(perm, { platformRole: c.user.platformRole })) {
    audit(s, "accès console refusé", perm, "refus");
    throw new ApiError(403, "interdit", "Cette page est réservée à l’équipe saytumbay.");
  }
  return c;
}

const mrrOf = (s: DemoState, orgId: string) => {
  const sub = s.subscriptions.find((x) => x.orgId === orgId);
  return sub ? sub.baseFcfa + sub.perSensorFcfa * sub.sensors : 0;
};

function orgRows(s: DemoState): AdminOrgRow[] {
  const devs = deviceRows(s, null);
  return s.organizations.map((o) => ({
    ...o,
    devices: devs.filter((d) => d.orgId === o.id && d.kind !== "passerelle").length,
    offline: devs.filter((d) => d.orgId === o.id && d.status === "hors_ligne").length,
    members: s.memberships.filter((m) => m.orgId === o.id && m.status !== "desactive").length,
    parcels: s.parcels.filter((p) => p.orgId === o.id).length || (o.id === "org-gie-mboro" ? 4 : 2),
    warehouses: s.warehouses.filter((w) => w.orgId === o.id).length,
    mrr: mrrOf(s, o.id),
    lastActivityAt: s.audit.find((a) => a.orgId === o.id)?.at ?? null,
  }));
}

on("GET", "/admin/overview", ({ s }) => {
  needPlatform(s, "admin:clients");
  const devs = deviceRows(s, null).filter((d) => d.kind !== "passerelle");
  const latest = s.firmware[0]!.version;
  return {
    orgs: s.organizations.length,
    devices: { installed: devs.length, online: devs.filter((d) => d.status !== "hors_ligne").length, offline: devs.filter((d) => d.status === "hors_ligne").map((d) => d.id) },
    outdated: devs.filter((d) => d.kind === "sol" && d.firmware !== latest).length,
    latestFirmware: latest,
    mrr: s.subscriptions.reduce((a, x) => a + x.baseFcfa + x.perSensorFcfa * x.sensors, 0),
    openInvoices: s.invoices.filter((i) => i.status !== "payee" && i.status !== "annulee").length,
    overdue: s.invoices.filter((i) => i.status === "en_retard").length,
    smsMonth: 1240 + s.sentSms.length,
  };
});

on("GET", "/admin/orgs", ({ s }) => {
  needPlatform(s, "admin:clients");
  return orgRows(s);
});

on("GET", "/admin/orgs/:id", ({ s, params }) => {
  const c = needPlatform(s, "admin:clients");
  const org = orgRows(s).find((o) => o.id === params.id);
  if (!org) throw new ApiError(404, "introuvable", "Client introuvable.");
  const billing = can("admin:facturation", { platformRole: c.user.platformRole });
  return {
    org,
    subscription: s.subscriptions.find((x) => x.orgId === org.id) ?? null,
    invoices: billing ? s.invoices.filter((i) => i.orgId === org.id) : [],
    devices: deviceRows(s, org.id),
    members: s.memberships
      .filter((m) => m.orgId === org.id && m.status !== "desactive")
      .map((m) => {
        const u = s.users.find((x) => x.id === m.userId)!;
        return { user: { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, phone: u.phone, lastSeenAt: u.lastSeenAt, twoFactorEnabled: u.twoFactorEnabled }, membership: m };
      }),
  };
});

function progressRollouts(s: DemoState) {
  const t = Date.now();
  for (const r of s.rollouts) {
    if (r.status !== "en_cours") continue;
    const elapsed = t - new Date(r.startedAt).getTime();
    const n = Math.min(r.targetDeviceIds.length, Math.floor(elapsed / 3500) + 1);
    const online = new Set(deviceRows(s, null).filter((d) => d.status !== "hors_ligne").map((d) => d.id));
    r.updatedDeviceIds = r.targetDeviceIds.slice(0, n).filter((id) => online.has(id));
    r.failedDeviceIds = r.targetDeviceIds.slice(0, n).filter((id) => !online.has(id));
    for (const d of s.devices) if (r.updatedDeviceIds.includes(d.id)) d.firmware = r.version;
    if (n >= r.targetDeviceIds.length) r.status = r.stage === "canari" ? "en_pause" : "termine";
  }
}

on("GET", "/admin/firmware", ({ s }) => {
  needPlatform(s, "admin:firmware");
  progressRollouts(s);
  const devs = deviceRows(s, null).filter((d) => d.kind !== "passerelle");
  const versions = [...new Set(devs.map((d) => d.firmware))].sort().reverse();
  return {
    releases: s.firmware,
    rollouts: [...s.rollouts].sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    devicesByVersion: versions.map((v) => ({ version: v, count: devs.filter((d) => d.firmware === v).length })),
    devices: devs.map((d) => ({ id: d.id, orgId: d.orgId, kind: d.kind, firmware: d.firmware, status: d.status, label: `${s.organizations.find((o) => o.id === d.orgId)?.name ?? ""} · ${d.label}` })),
  };
});

on("POST", "/admin/rollouts", ({ s, body }) => {
  needPlatform(s, "admin:firmware");
  const b = parse(rolloutSchema, body);
  if (!s.firmware.some((f) => f.version === b.version)) throw new ApiError(422, "validation", "Version inconnue.");
  const canary = b.deviceIds.slice(0, Math.max(1, Math.ceil(b.deviceIds.length * 0.1)));
  s.rollouts.push({ id: rid("ro"), version: b.version, startedAt: nowIso(), status: "en_cours", targetDeviceIds: canary, updatedDeviceIds: [], failedDeviceIds: [], stage: "canari" });
  (s as DemoState & { rolloutTargets?: Record<string, string[]> }).rolloutTargets = { ...((s as DemoState & { rolloutTargets?: Record<string, string[]> }).rolloutTargets ?? {}), [b.version]: b.deviceIds };
  audit(s, "mise à jour lancée (étape canari)", `${b.version} · ${canary.length} / ${b.deviceIds.length} capteurs`);
  return undefined;
});

on("POST", "/admin/rollouts/:id/:action", ({ s, params }) => {
  needPlatform(s, "admin:firmware");
  progressRollouts(s);
  const r = s.rollouts.find((x) => x.id === params.id);
  if (!r) throw new ApiError(404, "introuvable", "Déploiement introuvable.");
  const a = params.action;
  if (a === "pause") r.status = "en_pause";
  else if (a === "reprendre") r.status = "en_cours";
  else if (a === "annuler") r.status = "annule";
  else if (a === "generaliser") {
    const all = (s as DemoState & { rolloutTargets?: Record<string, string[]> }).rolloutTargets?.[r.version] ?? deviceRows(s, null).filter((d) => d.kind === "sol" && d.firmware !== r.version).map((d) => d.id);
    r.targetDeviceIds = [...new Set([...r.updatedDeviceIds, ...all])];
    r.stage = "general";
    r.status = "en_cours";
    r.startedAt = nowIso();
  } else throw new ApiError(404, "introuvable", "Action inconnue.");
  audit(s, `mise à jour : ${a}`, r.version);
  return undefined;
});

on("GET", "/admin/billing", ({ s }) => {
  needPlatform(s, "admin:facturation");
  const name = (id: string) => s.organizations.find((o) => o.id === id)?.name ?? "—";
  return {
    invoices: [...s.invoices].sort((a, b) => b.id.localeCompare(a.id)).map((i) => ({ ...i, orgName: name(i.orgId) })),
    subscriptions: s.subscriptions.map((x) => ({ ...x, orgName: name(x.orgId) })),
    finance: s.finance,
    mrr: s.subscriptions.reduce((a, x) => a + x.baseFcfa + x.perSensorFcfa * x.sensors, 0),
  };
});

on("POST", "/admin/invoices/:id/pay", ({ s, params, body }) => {
  needPlatform(s, "admin:facturation");
  const b = parse(markPaidSchema, body);
  const i = s.invoices.find((x) => x.id === params.id);
  if (!i) throw new ApiError(404, "introuvable", "Facture introuvable.");
  if (i.status === "payee") throw new ApiError(409, "deja_payee", "Cette facture est déjà payée.");
  i.paidAmount = Math.min(i.amount, i.paidAmount + b.amount);
  i.status = i.paidAmount >= i.amount ? "payee" : "partielle";
  i.method = b.method;
  i.paidAt = nowIso();
  const fin = s.finance[s.finance.length - 1];
  if (fin) fin.collected += b.amount;
  audit(s, "paiement enregistré", `${i.id} · ${fmt.fcfa(b.amount)} · ${b.method}`);
  return undefined;
});

on("POST", "/admin/invoices/:id/remind", ({ s, params }) => {
  needPlatform(s, "admin:facturation");
  const i = s.invoices.find((x) => x.id === params.id);
  if (!i) throw new ApiError(404, "introuvable", "Facture introuvable.");
  const owner = s.memberships.find((m) => m.orgId === i.orgId && m.role === "proprietaire") ?? s.memberships.find((m) => m.orgId === i.orgId);
  const u = s.users.find((x) => x.id === owner?.userId);
  const text = `SaytuMbay : la facture ${i.id} (${fmt.fcfa(i.amount - i.paidAmount)}) arrive à échéance. Paiement par Wave ou Orange Money au 77 833 57 81. Merci.`;
  s.sentSms.push({ to: u?.phone ?? "—", text, at: nowIso() });
  audit(s, "relance envoyée", i.id);
  return { sms: text };
});

on("GET", "/admin/costs", ({ s }) => {
  needPlatform(s, "admin:couts");
  const devs = s.devices.filter((d) => d.kind === "sol");
  return { lines: s.costLines, finance: s.finance, sensorsInstalled: devs.length, sensorsPaying: s.subscriptions.filter((x) => x.plan !== "essai").reduce((a, x) => a + x.sensors, 0), fixedRevenue: 40000, variablePerSensor: 3867 };
});

on("GET", "/admin/users", ({ s }) => {
  needPlatform(s, "admin:utilisateurs");
  return s.users.map((u) => ({
    user: u,
    orgs: s.memberships.filter((m) => m.userId === u.id && m.status !== "desactive").map((m) => ({ id: m.orgId, name: s.organizations.find((o) => o.id === m.orgId)?.name ?? "", role: m.role })),
  }));
});

on("GET", "/admin/audit", ({ s }) => {
  needPlatform(s, "admin:audit");
  return s.audit;
});

/* ——— Routeur ——— */

function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/").filter(Boolean);
  const b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.startsWith(":")) params[a[i]!.slice(1)] = decodeURIComponent(b[i]!);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

let installed = false;

export async function handle(method: string, path: string, body?: unknown, query?: Q): Promise<unknown> {
  const s = getState();
  if (!installed) {
    installSoilAdjust(s);
    for (const [n, o] of Object.entries(s.aliases)) setSeriesAlias(n, o);
    installed = true;
  }
  await wait(70 + Math.round(Math.random() * 140));
  for (const [m, p, h] of routes) {
    if (m !== method) continue;
    const params = match(p, path);
    if (!params) continue;
    try {
      const out = await h({ s, params, body, query });
      if (method !== "GET") save();
      // copie : l'interface ne doit jamais modifier l'état du serveur simulé
      return out === undefined ? undefined : structuredClone(out);
    } catch (e) {
      if (method !== "GET") save();
      throw e;
    }
  }
  throw new ApiError(404, "route_inconnue", `Route inconnue : ${method} ${path}`);
}

export { ADVICE, smsText };
