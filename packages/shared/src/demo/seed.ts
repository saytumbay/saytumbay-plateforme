/**
 * Jeu de données de démonstration. Toutes les personnes, organisations et mesures sont fictives.
 * Les dates sont calculées par rapport à l'instant d'ancrage (`now`) : la démo raconte toujours
 * la même histoire, quel que soit le jour où on l'ouvre.
 */
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
  MonthlyFinance,
  Organization,
  Parcel,
  Pump,
  Rollout,
  Site,
  Subscription,
  Task,
  User,
  Valve,
  Warehouse,
} from "../domain/types";

const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;

export const DEMO_ORG_ID = "org-thies";

export interface DemoSeed {
  now: Date;
  organizations: Organization[];
  users: User[];
  memberships: Membership[];
  sites: Site[];
  parcels: Parcel[];
  devices: Device[];
  pumps: Pump[];
  valves: Valve[];
  rules: IrrigationRule[];
  schedules: IrrigationSchedule[];
  irrigationEvents: IrrigationEvent[];
  warehouses: Warehouse[];
  lots: Lot[];
  inspections: Inspection[];
  alertsHistory: Alert[];
  tasks: Task[];
  invoices: Invoice[];
  subscriptions: Subscription[];
  costLines: CostLine[];
  finance: MonthlyFinance[];
  firmware: FirmwareRelease[];
  rollouts: Rollout[];
  audit: AuditEntry[];
}

/** Contours des 6 parcelles autour de Mboro (Niayes), repris de la maquette d'origine. */
function parcelPolygons(): Record<string, Array<[number, number]>> {
  const C: [number, number] = [15.14234, -16.88288];
  const th = (-14 * Math.PI) / 180;
  const toLL = ([x, y]: [number, number]): [number, number] => {
    const X = x * Math.cos(th) - y * Math.sin(th);
    const Y = x * Math.sin(th) + y * Math.cos(th);
    return [+(C[0] + Y / 110574).toFixed(6), +(C[1] + X / 107530).toFixed(6)];
  };
  const rows = [
    { y0: 8, h: 112, ids: ["A", "B", "C"], w: [72, 46, 58] },
    { y0: -104, h: 96, ids: ["D", "E", "F"], w: [44, 32, 76] },
  ];
  const out: Record<string, Array<[number, number]>> = {};
  rows.forEach((r, ri) => {
    let x = -92;
    r.ids.forEach((id, j) => {
      const w = r.w[j]!;
      const x1 = x + w;
      const sk = (j % 2 ? -1 : 1) * 4 + ri * 3;
      const bend = (j + ri) % 2 ? 3 : -3;
      const pts: Array<[number, number]> = [
        [x + sk, r.y0 + r.h],
        [x1 + sk * 0.5, r.y0 + r.h + bend],
        [x1, r.y0 + r.h * 0.5 + bend],
        [x1 - sk * 0.3, r.y0],
        [x, r.y0 - bend * 0.5],
        [x + sk * 0.4, r.y0 + r.h * 0.5],
      ];
      out[id] = pts.map(toLL);
      x = x1 + 3;
    });
  });
  return out;
}

export const PARCEL_COLORS = ["#0F6B45", "#1597B3", "#C98A12", "#B4432A", "#6C8F3A", "#6E8FD8"];

export function createSeed(nowInput: Date = new Date()): DemoSeed {
  // Ancrage au quart d'heure : séries stables pendant une session.
  const now = new Date(Math.floor(nowInput.getTime() / (15 * MIN)) * 15 * MIN);
  const t = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();
  const day = (d: number) => new Date(now.getTime() + d * D).toISOString().slice(0, 10);
  const todayAt = (h: number, m = 0, dayOffset = 0) => {
    // heure de Dakar = UTC (pas d'heure d'été)
    const d = new Date(now);
    d.setUTCHours(h, m, 0, 0);
    return new Date(d.getTime() + dayOffset * D).toISOString();
  };
  const monthKey = (offset: number) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  };

  const organizations: Organization[] = [
    { id: DEMO_ORG_ID, name: "Coopérative de Thiès", type: "cooperative", region: "Thiès", locality: "Mboro", plan: "pro", status: "actif", modules: ["agritech", "onion"], createdAt: t(-210 * D) },
    { id: "org-gie-mboro", name: "GIE Niayes Mboro", type: "gie", region: "Thiès", locality: "Mboro", plan: "standard", status: "actif", modules: ["agritech"], createdAt: t(-150 * D) },
    { id: "org-diallo", name: "Ferme Diallo", type: "entreprise", region: "Dakar", locality: "Rufisque", plan: "essai", status: "essai", modules: ["agritech", "onion"], createdAt: t(-18 * D), trialEndsAt: t(12 * D) },
  ];

  const u = (id: string, firstName: string, lastName: string, phone: string, extra: Partial<User> = {}): User => ({
    id,
    firstName,
    lastName,
    email: `${firstName}.${lastName}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s/g, "") + "@demo.saytumbay.com",
    phone,
    platformRole: "aucun",
    twoFactorEnabled: false,
    locale: "fr",
    createdAt: t(-200 * D),
    lastSeenAt: t(-2 * MIN),
    ...extra,
  });

  const users: User[] = [
    u("u-awa", "Awa", "Ndiaye", "+221774120833", { lastSeenAt: t(-2 * MIN) }),
    u("u-moussa", "Moussa", "Sarr", "+221762204118", { lastSeenAt: t(-20 * H) }),
    u("u-fatou", "Fatou", "Diop", "+221705539012", { lastSeenAt: t(-3 * D) }),
    u("u-ibou", "Ibou", "Faye", "+221781046670", { lastSeenAt: t(-4 * H) }),
    u("u-mamadou", "Mamadou", "Ba", "+221779012345", { lastSeenAt: t(-12 * D) }),
    u("u-khady", "Khady", "Gueye", "+221776543210", { lastSeenAt: t(-1 * D) }),
    u("u-seydou", "Seydou", "Diallo", "+221781112233", { lastSeenAt: t(-2 * D) }),
    u("u-mame", "Mame", "Sow", "+221771234567", { platformRole: "admin", twoFactorEnabled: true, email: "mame.sow@demo.saytumbay.com", lastSeenAt: t(-1 * MIN) }),
    u("u-pape", "Pape", "Kane", "+221772345678", { platformRole: "support", twoFactorEnabled: true, email: "pape.kane@demo.saytumbay.com", lastSeenAt: t(-5 * H) }),
  ];

  const m = (userId: string, orgId: string, role: Membership["role"], parcels: Membership["parcels"]): Membership => ({
    userId,
    orgId,
    role,
    parcels,
    notify: { sms: true, email: role === "responsable" || role === "proprietaire", push: true },
    invitedAt: t(-190 * D),
    status: "actif",
  });
  const memberships: Membership[] = [
    m("u-awa", DEMO_ORG_ID, "responsable", "all"),
    m("u-moussa", DEMO_ORG_ID, "exploitant", ["p-a", "p-d"]),
    m("u-fatou", DEMO_ORG_ID, "exploitant", ["p-c", "p-e"]),
    m("u-ibou", DEMO_ORG_ID, "technicien", "all"),
    m("u-mamadou", DEMO_ORG_ID, "lecteur", "all"),
    m("u-khady", "org-gie-mboro", "proprietaire", "all"),
    m("u-seydou", "org-diallo", "proprietaire", "all"),
  ];

  const sites: Site[] = [
    { id: "site-mboro", orgId: DEMO_ORG_ID, name: "Exploitation de Mboro", locality: "Mboro, Niayes", center: [15.14234, -16.88288] },
    { id: "site-gie", orgId: "org-gie-mboro", name: "Périmètre du GIE", locality: "Mboro", center: [15.1571, -16.8612] },
    { id: "site-diallo", orgId: "org-diallo", name: "Ferme Diallo", locality: "Rufisque", center: [14.7431, -17.2381] },
  ];

  const poly = parcelPolygons();
  const P = (
    code: string,
    crop: string,
    variety: string,
    areaHa: number,
    soil: Parcel["soil"],
    plantedDaysAgo: number,
    cycleDays: number,
    responsibleId: string,
    sensorIds: string[],
    i: number,
    moisture = { dry: 30, wet: 45 },
  ): Parcel => ({
    id: `p-${code.toLowerCase()}`,
    orgId: DEMO_ORG_ID,
    siteId: "site-mboro",
    code,
    name: `Parcelle ${code}`,
    crop,
    variety,
    areaHa,
    soil,
    plantedAt: day(-plantedDaysAgo),
    harvestAt: day(cycleDays - plantedDaysAgo),
    responsibleId,
    sensorIds,
    valveId: `v-${code.toLowerCase()}`,
    polygon: poly[code]!,
    moisture,
    color: PARCEL_COLORS[i]!,
  });
  const parcels: Parcel[] = [
    P("A", "Oignon", "Violet de Galmi", 0.8, "sableux", 58, 120, "u-moussa", ["AS-0003", "AS-0004"], 0),
    P("B", "Tomate", "Mongal F1", 0.5, "sablo-argileux", 76, 110, "u-awa", ["AS-0005"], 1),
    P("C", "Gombo", "Clemson", 0.6, "sableux", 51, 75, "u-fatou", ["AS-0006"], 2),
    P("D", "Piment", "Safi", 0.4, "argileux", 71, 130, "u-moussa", ["AS-0007", "AS-0008"], 3, { dry: 28, wet: 45 }),
    P("E", "Aubergine", "Black Beauty", 0.3, "sableux", 60, 150, "u-fatou", ["AS-0011"], 4),
    P("F", "Chou", "KK Cross", 0.7, "sablo-argileux", 56, 100, "u-awa", ["AS-0009", "AS-0010"], 5),
  ];

  const dev = (id: string, orgId: string, kind: Device["kind"], extra: Partial<Device>): Device => ({
    id,
    orgId,
    kind,
    model: kind === "sol" ? "Dragino LSE01" : kind === "stockage" ? "Dragino LHT65N + sonde" : kind === "air" ? "Dragino LHT65N" : "Dragino LPS8N",
    battery: 80,
    signal: 4,
    rssi: -92,
    firmware: "v1.4.1",
    status: "en_ligne",
    lastSeenAt: t(-6 * MIN),
    installedAt: t(-180 * D),
    simulated: true,
    ...extra,
  });
  const devices: Device[] = [
    dev("AS-0003", DEMO_ORG_ID, "sol", { parcelId: "p-a", battery: 78, signal: 4, rssi: -88 }),
    dev("AS-0004", DEMO_ORG_ID, "sol", { parcelId: "p-a", battery: 71, signal: 3, rssi: -101 }),
    dev("AS-0005", DEMO_ORG_ID, "sol", { parcelId: "p-b", battery: 64, signal: 3, rssi: -104 }),
    dev("AS-0006", DEMO_ORG_ID, "sol", { parcelId: "p-c", battery: 83, signal: 4, rssi: -90 }),
    dev("AS-0007", DEMO_ORG_ID, "sol", { parcelId: "p-d", battery: 12, signal: 2, rssi: -112, firmware: "v1.3.6" }),
    dev("AS-0008", DEMO_ORG_ID, "sol", { parcelId: "p-d", battery: 58, signal: 3, rssi: -103 }),
    dev("AS-0009", DEMO_ORG_ID, "sol", { parcelId: "p-f", battery: 90, signal: 4, rssi: -86, firmware: "v1.4.2" }),
    dev("AS-0010", DEMO_ORG_ID, "sol", { parcelId: "p-f", battery: 66, signal: 2, rssi: -110 }),
    dev("AS-0011", DEMO_ORG_ID, "sol", { parcelId: "p-e", battery: 41, signal: 0, rssi: null, status: "hors_ligne", lastSeenAt: todayAt(7, 10) < now.toISOString() ? todayAt(7, 10) : t(-3 * H) }),
    dev("GW-01", DEMO_ORG_ID, "passerelle", { siteId: "site-mboro", battery: null, signal: 4, rssi: null, firmware: "v2.1.0", lastSeenAt: t(-1 * MIN) }),
    // Stockage : 4 sondes au cœur des rangées + 1 sonde d'ambiance par entrepôt
    ...["R1", "R2", "R3", "R4"].map((z, i) => dev(`OS-10${i + 1}`, DEMO_ORG_ID, "stockage", { warehouseId: "wh-mboro", zoneId: z, battery: [82, 74, 69, 88][i]!, signal: 3 })),
    dev("OS-100", DEMO_ORG_ID, "air", { warehouseId: "wh-mboro", zoneId: null, battery: 77, signal: 4 }),
    ...["R1", "R2", "R3", "R4"].map((z, i) => dev(`OS-20${i + 1}`, DEMO_ORG_ID, "stockage", { warehouseId: "wh-potou", zoneId: z, battery: [91, 86, 34, 79][i]!, signal: [4, 3, 3, 4][i] as Device["signal"] })),
    dev("OS-200", DEMO_ORG_ID, "air", { warehouseId: "wh-potou", zoneId: null, battery: 84, signal: 4 }),
    ...["R1", "R2", "R3"].map((z, i) => dev(`OS-30${i + 1}`, DEMO_ORG_ID, "stockage", { warehouseId: "wh-ngomene", zoneId: z, battery: [72, 68, 75][i]!, signal: 3 })),
    dev("OS-300", DEMO_ORG_ID, "air", { warehouseId: "wh-ngomene", zoneId: null, battery: 70, signal: 0, status: "hors_ligne", lastSeenAt: t(-2 * D - 3 * H) }),
    dev("GW-02", DEMO_ORG_ID, "passerelle", { siteId: "site-mboro", battery: null, signal: 4, rssi: null, firmware: "v2.1.0", lastSeenAt: t(-1 * MIN) }),
    // Autres clients (console admin)
    ...["AS-0201", "AS-0202", "AS-0203", "AS-0204", "AS-0205"].map((id, i) => dev(id, "org-gie-mboro", "sol", { siteId: "site-gie", battery: [70, 66, 81, 59, 73][i]!, firmware: i < 2 ? "v1.3.6" : "v1.4.1" })),
    dev("AS-0217", "org-gie-mboro", "sol", { siteId: "site-gie", battery: 0, signal: 0, rssi: null, status: "hors_ligne", lastSeenAt: t(-6 * D) }),
    ...["AS-0301", "AS-0302", "AS-0303"].map((id, i) => dev(id, "org-diallo", "sol", { siteId: "site-diallo", battery: [95, 93, 96][i]!, firmware: "v1.4.1", installedAt: t(-17 * D) })),
  ];

  const pumps: Pump[] = [{ id: "pump-1", orgId: DEMO_ORG_ID, name: "Pompe 1 (forage)", flowM3h: 2.4, running: false }];
  const valves: Valve[] = parcels.map((p) => ({ id: p.valveId!, orgId: DEMO_ORG_ID, parcelId: p.id, name: `Vanne ${p.code}`, open: false }));

  const rules: IrrigationRule[] = parcels.map((p) => ({
    parcelId: p.id,
    mode: p.code === "D" ? "manuel" : "automatique",
    startBelow: p.moisture.dry,
    stopAbove: p.moisture.wet,
    maxDurationMin: 30,
    skipIfRainMm: 5,
  }));

  const schedules: IrrigationSchedule[] = [
    { id: "sch-b", parcelId: "p-b", days: [0, 1, 2, 3, 4, 5, 6], time: "06:00", durationMin: 25, enabled: true },
    { id: "sch-d", parcelId: "p-d", days: [0, 2, 4], time: "18:00", durationMin: 25, enabled: true },
    { id: "sch-f", parcelId: "p-f", days: [1, 4], time: "07:00", durationMin: 20, enabled: true },
  ];

  const irrigationEvents: IrrigationEvent[] = [
    { id: "ie-1", parcelId: "p-d", kind: "terminee", trigger: "automatique", at: todayAt(6, 25), durationMin: 25, liters: 140, by: null, note: "Arrêt au seuil de 45 %" },
    { id: "ie-2", parcelId: "p-a", kind: "terminee", trigger: "automatique", at: todayAt(6, 10), durationMin: 18, liters: 96, by: null, note: "" },
    { id: "ie-3", parcelId: "p-e", kind: "annulee", trigger: "systeme", at: todayAt(18, 0, -1), durationMin: null, liters: null, by: null, note: "Capteur AS-0011 hors ligne" },
    { id: "ie-4", parcelId: "p-f", kind: "lancee", trigger: "manuelle", at: todayAt(16, 12, -1), durationMin: 10, liters: 56, by: "u-awa", note: "" },
    { id: "ie-5", parcelId: "p-b", kind: "annulee", trigger: "systeme", at: todayAt(6, 0, -2), durationMin: null, liters: null, by: null, note: "Pression insuffisante à la pompe" },
    { id: "ie-6", parcelId: "p-d", kind: "regle_modifiee", trigger: "manuelle", at: t(-12 * D), durationMin: null, liters: null, by: "u-moussa", note: "Seuil 30 % → 28 %" },
    { id: "ie-7", parcelId: "p-c", kind: "terminee", trigger: "automatique", at: todayAt(5, 50, -1), durationMin: 22, liters: 118, by: null, note: "" },
  ];

  const zones4 = ["R1", "R2", "R3", "R4"].map((id, i) => ({ id, label: `Rangée ${i + 1}`, row: i, col: 0 }));
  const warehouses: Warehouse[] = [
    { id: "wh-mboro", orgId: DEMO_ORG_ID, name: "Magasin de Mboro", locality: "Mboro", product: "oignon", variety: "Violet de Galmi", capacityT: 40, storageType: "ventilation_naturelle", thresholds: { temp: [24, 32], humidity: [65, 72], co2: 1200, gas: 40 }, zones: zones4, center: [15.1431, -16.8835] },
    { id: "wh-potou", orgId: DEMO_ORG_ID, name: "Magasin de Potou", locality: "Potou", product: "oignon", variety: "Violet de Galmi", capacityT: 30, storageType: "ventilation_naturelle", thresholds: { temp: [24, 30], humidity: [65, 75], co2: 1200, gas: 40 }, zones: zones4, center: [15.7272, -16.4744] },
    { id: "wh-ngomene", orgId: DEMO_ORG_ID, name: "Magasin de Ngomène", locality: "Ngomène", product: "pomme_de_terre", variety: "Sahel", capacityT: 20, storageType: "ventilation_forcee", thresholds: { temp: [8, 14], humidity: [85, 95], co2: 2000, gas: 40 }, zones: zones4.slice(0, 3), center: [14.9917, -17.0611] },
  ];

  const lots: Lot[] = [
    { id: "L-07", orgId: DEMO_ORG_ID, warehouseId: "wh-mboro", product: "oignon", variety: "Violet de Galmi", quantityT: 8, zoneIds: ["R2"], enteredAt: day(-48), maxDays: 150, origin: "Parcelle A (récolte précédente)", status: "en_stock" },
    { id: "L-08", orgId: DEMO_ORG_ID, warehouseId: "wh-mboro", product: "oignon", variety: "Violet de Galmi", quantityT: 8, zoneIds: ["R1"], enteredAt: day(-41), maxDays: 150, origin: "Membres de la coopérative", status: "en_stock" },
    { id: "L-09", orgId: DEMO_ORG_ID, warehouseId: "wh-mboro", product: "oignon", variety: "Violet de Galmi", quantityT: 8, zoneIds: ["R3", "R4"], enteredAt: day(-35), maxDays: 150, origin: "Membres de la coopérative", status: "en_stock" },
    { id: "L-21", orgId: DEMO_ORG_ID, warehouseId: "wh-potou", product: "oignon", variety: "Violet de Galmi", quantityT: 12, zoneIds: ["R1", "R2", "R3", "R4"], enteredAt: day(-15), maxDays: 150, origin: "Producteurs de Potou", status: "en_stock" },
    { id: "L-31", orgId: DEMO_ORG_ID, warehouseId: "wh-ngomene", product: "pomme_de_terre", variety: "Sahel", quantityT: 9, zoneIds: ["R1", "R2", "R3"], enteredAt: day(-22), maxDays: 120, origin: "GIE de Ngomène", status: "en_stock" },
  ];

  const inspections: Inspection[] = [
    { id: "ins-1", warehouseId: "wh-mboro", zoneId: "R2", lotId: "L-07", sampled: 20, damaged: 6, by: "u-moussa", at: todayAt(17, 40, -1), note: "Odeur et bulbes mous au cœur de la rangée." },
    { id: "ins-2", warehouseId: "wh-mboro", zoneId: "R3", lotId: "L-09", sampled: 20, damaged: 2, by: "u-moussa", at: todayAt(17, 55, -1), note: "" },
    { id: "ins-3", warehouseId: "wh-mboro", zoneId: "R1", lotId: "L-08", sampled: 20, damaged: 0, by: "u-ibou", at: todayAt(9, 10, -5), note: "Rien à signaler." },
    { id: "ins-4", warehouseId: "wh-potou", zoneId: "R3", lotId: "L-21", sampled: 20, damaged: 1, by: "u-fatou", at: todayAt(10, 30, -3), note: "Un bulbe germé." },
    { id: "ins-5", warehouseId: "wh-ngomene", zoneId: "R2", lotId: "L-31", sampled: 20, damaged: 0, by: "u-ibou", at: todayAt(11, 0, -6), note: "Tubercules fermes." },
  ];

  const alertsHistory: Alert[] = [
    {
      id: "al-h1", orgId: DEMO_ORG_ID, module: "agritech", kind: "sol_sec", severity: "attention",
      title: "Parcelle C était sèche (27 %)", detail: "Humidité du sol sous le seuil de 30 %.", advice: "Irrigation automatique déclenchée.",
      source: { type: "parcelle", id: "p-c", label: "Parcelle C" }, status: "resolue", createdAt: t(-2 * D - 3 * H),
      acknowledgedBy: "u-fatou", acknowledgedAt: t(-2 * D - 2 * H), resolvedAt: t(-2 * D),
      notifications: [{ channel: "sms", to: "+221705539012", at: t(-2 * D - 3 * H), delivered: true }],
    },
    {
      id: "al-h2", orgId: DEMO_ORG_ID, module: "onion", kind: "stock_humidite", severity: "attention",
      title: "Humidité 76 % au Magasin de Mboro", detail: "Au-dessus de la plage visée (65 à 72 %).", advice: "Aérer cette nuit.",
      source: { type: "entrepot", id: "wh-mboro", label: "Magasin de Mboro" }, status: "resolue", createdAt: t(-9 * D),
      acknowledgedBy: "u-awa", acknowledgedAt: t(-9 * D + H), resolvedAt: t(-8 * D),
      notifications: [{ channel: "sms", to: "+221774120833", at: t(-9 * D), delivered: true }],
    },
  ];

  const tasks: Task[] = [
    { id: "tk-1", orgId: DEMO_ORG_ID, module: "agritech", title: "Changer la batterie de AS-0007", assigneeId: "u-ibou", due: day(0), status: "a_faire", link: { type: "capteur", id: "AS-0007" }, createdAt: t(-1 * D) },
    { id: "tk-2", orgId: DEMO_ORG_ID, module: "onion", title: "Trier la rangée 2 du magasin de Mboro", assigneeId: "u-moussa", due: day(0), status: "en_cours", link: { type: "entrepot", id: "wh-mboro" }, createdAt: t(-20 * H) },
    { id: "tk-3", orgId: DEMO_ORG_ID, module: "agritech", title: "Vérifier le goutte-à-goutte de la parcelle B", assigneeId: "u-awa", due: day(-1), status: "terminee", link: { type: "parcelle", id: "p-b" }, createdAt: t(-2 * D) },
    { id: "tk-4", orgId: DEMO_ORG_ID, module: "agritech", title: "Remettre en ligne AS-0011", assigneeId: "u-ibou", due: day(1), status: "a_faire", link: { type: "capteur", id: "AS-0011" }, createdAt: t(-3 * H) },
    { id: "tk-5", orgId: DEMO_ORG_ID, module: "onion", title: "Vendre en priorité le lot L-07", assigneeId: "u-awa", due: day(3), status: "a_faire", link: { type: "lot", id: "L-07" }, createdAt: t(-18 * H) },
    { id: "tk-6", orgId: DEMO_ORG_ID, module: "onion", title: "Contrôler la rangée 3 du magasin de Potou", assigneeId: "u-fatou", due: day(0), status: "a_faire", link: { type: "entrepot", id: "wh-potou" }, createdAt: t(-2 * H) },
  ];

  const inv = (id: string, orgId: string, label: string, amount: number, issuedDays: number, dueDays: number, status: Invoice["status"], method: Invoice["method"], paidDays: number | null, paidAmount?: number): Invoice => ({
    id, orgId, label, amount, paidAmount: paidAmount ?? (status === "payee" ? amount : 0), issuedAt: t(issuedDays * D), dueAt: t(dueDays * D), status, method, paidAt: paidDays == null ? null : t(paidDays * D),
  });
  const invoices: Invoice[] = [
    inv("F-2026-033", "org-gie-mboro", "Capteur de remplacement AS-0217", 85000, -2, 8, "en_attente", null, null),
    inv("F-2026-032", "org-gie-mboro", "Abonnement du mois · 6 capteurs", 30000, -25, -15, "en_retard", null, null),
    inv("F-2026-031", DEMO_ORG_ID, "Abonnement du mois · 9 capteurs", 47500, -25, -15, "payee", "wave", -20),
    inv("F-2026-030", "org-diallo", "Installation · 3 capteurs", 45000, -18, -10, "payee", "virement", -13),
    inv("F-2026-029", "org-gie-mboro", "Abonnement du mois précédent · 6 capteurs", 30000, -55, -45, "partielle", "orange_money", -37, 15000),
    inv("F-2026-028", DEMO_ORG_ID, "Abonnement du mois précédent · 9 capteurs", 47500, -55, -45, "payee", "wave", -47),
    inv("F-2026-027", DEMO_ORG_ID, "Installation · 3 capteurs supplémentaires", 45000, -50, -40, "payee", "especes", -40),
  ];

  const subscriptions: Subscription[] = [
    { orgId: DEMO_ORG_ID, plan: "pro", baseFcfa: 25000, perSensorFcfa: 2500, sensors: 9, nextBillingAt: t(5 * D), note: "" },
    { orgId: "org-gie-mboro", plan: "standard", baseFcfa: 15000, perSensorFcfa: 2500, sensors: 6, nextBillingAt: t(5 * D), note: "Suspendu si impayé 15 jours après l’échéance" },
    { orgId: "org-diallo", plan: "essai", baseFcfa: 0, perSensorFcfa: 0, sensors: 3, nextBillingAt: t(12 * D), note: "Essai gratuit de 30 jours" },
  ];

  const mk = monthKey(0);
  const costLines: CostLine[] = [
    { id: "c1", month: mk, category: "materiel", label: "Capteurs de sol amortis", detail: "18 × 78 000 FCFA sur 36 mois", amount: 39000 },
    { id: "c2", month: mk, category: "materiel", label: "Passerelles LoRaWAN amorties", detail: "2 × 450 000 FCFA sur 36 mois", amount: 25000 },
    { id: "c3", month: mk, category: "hebergement", label: "Serveur et hébergement", detail: "Base de données, API, sauvegardes", amount: 22000 },
    { id: "c4", month: mk, category: "sms", label: "SMS envoyés", detail: "1 240 SMS × 15 FCFA", amount: 18600 },
    { id: "c5", month: mk, category: "terrain", label: "Maintenance terrain", detail: "Déplacements, piles, réparations", amount: 12000 },
    { id: "c6", month: mk, category: "connectivite", label: "Connexion 4G des passerelles", detail: "2 forfaits × 5 000 FCFA", amount: 10000 },
  ];

  const finance: MonthlyFinance[] = [
    { month: monthKey(-5), billed: 30000, collected: 22000, costs: 61000 },
    { month: monthKey(-4), billed: 47500, collected: 47500, costs: 78000 },
    { month: monthKey(-3), billed: 47500, collected: 32500, costs: 86000 },
    { month: monthKey(-2), billed: 77500, collected: 62500, costs: 104000 },
    { month: monthKey(-1), billed: 122500, collected: 107500, costs: 118000 },
    { month: monthKey(0), billed: 207500, collected: 92500, costs: 126600 },
  ];

  const firmware: FirmwareRelease[] = [
    { version: "v1.4.2", releasedAt: t(-6 * D), notes: "Réduit la consommation radio de 18 %. Corrige la mesure d’humidité sous 5 %.", deviceKinds: ["sol"] },
    { version: "v1.4.1", releasedAt: t(-60 * D), notes: "Réveil plus fiable après une coupure d’alimentation.", deviceKinds: ["sol", "stockage", "air"] },
    { version: "v1.3.6", releasedAt: t(-150 * D), notes: "Première version de série.", deviceKinds: ["sol"] },
  ];
  const rollouts: Rollout[] = [
    { id: "ro-1", version: "v1.4.2", startedAt: t(-5 * D), status: "en_pause", targetDeviceIds: ["AS-0009", "AS-0301"], updatedDeviceIds: ["AS-0009"], failedDeviceIds: [], stage: "canari" },
  ];

  const audit: AuditEntry[] = [
    { id: "au-1", at: t(-1 * MIN), actorId: "u-mame", actorLabel: "Mame Sow", orgId: null, action: "connexion", target: "console admin", ip: "41.82.xx.xx", outcome: "succes" },
    { id: "au-2", at: t(-40 * MIN), actorId: "u-awa", actorLabel: "Awa Ndiaye", orgId: DEMO_ORG_ID, action: "alerte prise en charge", target: "Magasin de Mboro · rangée 2", ip: "196.207.xx.xx", outcome: "succes" },
    { id: "au-3", at: t(-3 * H), actorId: null, actorLabel: "inconnu", orgId: null, action: "connexion", target: "k.gueye@…", ip: "102.164.xx.xx", outcome: "refus" },
    { id: "au-4", at: t(-5 * H), actorId: "u-pape", actorLabel: "Pape Kane", orgId: null, action: "mise à jour suspendue", target: "v1.4.2 (étape canari)", ip: "41.82.xx.xx", outcome: "succes" },
    { id: "au-5", at: t(-20 * H), actorId: "u-moussa", actorLabel: "Moussa Sarr", orgId: DEMO_ORG_ID, action: "contrôle visuel saisi", target: "Magasin de Mboro · rangée 2", ip: "196.207.xx.xx", outcome: "succes" },
    { id: "au-6", at: t(-1 * D), actorId: "u-mame", actorLabel: "Mame Sow", orgId: "org-gie-mboro", action: "facture émise", target: "F-2026-033", ip: "41.82.xx.xx", outcome: "succes" },
    { id: "au-7", at: t(-12 * D), actorId: "u-moussa", actorLabel: "Moussa Sarr", orgId: DEMO_ORG_ID, action: "règle d’irrigation modifiée", target: "Parcelle D · 30 % → 28 %", ip: "196.207.xx.xx", outcome: "succes" },
  ];

  return {
    now,
    organizations,
    users,
    memberships,
    sites,
    parcels,
    devices,
    pumps,
    valves,
    rules,
    schedules,
    irrigationEvents,
    warehouses,
    lots,
    inspections,
    alertsHistory,
    tasks,
    invoices,
    subscriptions,
    costLines,
    finance,
    firmware,
    rollouts,
    audit,
  };
}
