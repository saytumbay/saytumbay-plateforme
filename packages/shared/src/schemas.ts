/** Schémas de validation (zod) des données envoyées à l'API. Le serveur les applique toutes. */
import { z } from "zod";

const phoneSn = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s.-]/g, ""))
  .refine((s) => /^(\+221|00221)?(7[05678]|33)\d{7}$/.test(s), "Numéro sénégalais attendu, par exemple +221 77 123 45 67");

export const passwordPolicy = z
  .string()
  .min(12, "12 caractères minimum")
  .max(128, "128 caractères maximum")
  .refine((s) => /[a-zà-ÿ]/.test(s) && /[A-ZÀ-Ý]/.test(s) && /\d/.test(s), "Mélangez minuscules, majuscules et chiffres");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(254),
  password: z.string().min(1, "Saisissez votre mot de passe").max(128),
  remember: z.boolean().optional().default(false),
});

export const totpSchema = z.object({
  challengeId: z.string().min(16).max(128),
  /** Code TOTP à 6 chiffres, ou code de secours à usage unique (1234-5678). */
  code: z.string().trim().regex(/^(\d{6}|\d{4}-\d{4})$/, "Code à 6 chiffres, ou code de secours au format 1234-5678"),
});

export const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(254) });

export const resetSchema = z
  .object({ token: z.string().min(32).max(256), password: passwordPolicy, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Les deux mots de passe ne correspondent pas", path: ["confirm"] });

export const acceptInviteSchema = z
  .object({
    token: z.string().min(32).max(256),
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    password: passwordPolicy,
    confirm: z.string(),
    acceptTerms: z.literal(true, { error: "Acceptez les conditions pour continuer" }),
  })
  .refine((v) => v.password === v.confirm, { message: "Les deux mots de passe ne correspondent pas", path: ["confirm"] });

export const orgRoleSchema = z.enum(["proprietaire", "responsable", "exploitant", "technicien", "lecteur"]);

export const inviteSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(60),
  lastName: z.string().trim().min(1, "Nom requis").max(60),
  phone: phoneSn,
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide").max(254).optional().or(z.literal("")),
  role: orgRoleSchema,
  parcels: z.union([z.literal("all"), z.array(z.string().max(40)).max(200)]),
});

export const updateMemberSchema = z.object({ role: orgRoleSchema.optional(), parcels: z.union([z.literal("all"), z.array(z.string()).max(200)]).optional() });

export const moistureRangeSchema = z
  .object({ dry: z.number().int().min(5).max(80), wet: z.number().int().min(10).max(95) })
  .refine((v) => v.wet - v.dry >= 5, { message: "Écart minimum de 5 points entre sec et humide", path: ["wet"] });

export const parcelSchema = z.object({
  code: z.string().trim().min(1).max(8),
  name: z.string().trim().min(1).max(80),
  crop: z.string().trim().min(1).max(60),
  variety: z.string().trim().max(60).optional(),
  areaHa: z.number().positive().max(10000),
  soil: z.enum(["sableux", "sablo-argileux", "argileux", "limoneux"]),
  plantedAt: z.iso.date(),
  harvestAt: z.iso.date(),
  responsibleId: z.string().max(40),
  moisture: moistureRangeSchema,
  polygon: z.array(z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])).min(3).max(200).optional(),
});

export const irrigationRuleSchema = z.object({
  mode: z.enum(["automatique", "manuel"]),
  startBelow: z.number().int().min(5).max(80),
  stopAbove: z.number().int().min(10).max(95),
  maxDurationMin: z.number().int().min(5).max(240),
  skipIfRainMm: z.number().min(0).max(100),
});

export const scheduleSchema = z.object({
  parcelId: z.string().max(40),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure au format HH:MM"),
  durationMin: z.number().int().min(5).max(240),
  enabled: z.boolean().default(true),
});

export const manualIrrigationSchema = z.object({ durationMin: z.number().int().min(1).max(120) });

export const deviceRegisterSchema = z.object({
  id: z.string().trim().toUpperCase().regex(/^(AS|OS|GW)-\d{3,4}$/, "Identifiant attendu : AS-0012, OS-105 ou GW-03"),
  parcelId: z.string().max(40).optional(),
  warehouseId: z.string().max(40).optional(),
  zoneId: z.string().max(40).optional(),
  /** DevEUI LoRaWAN (étiquette du boîtier) : relie les remontées ChirpStack à ce capteur. */
  devEui: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[0-9a-f]{16}$/, "16 caractères hexadécimaux, imprimés sur l’étiquette du boîtier")
    .optional()
    .or(z.literal("")),
});

export const thresholdsSchema = z.object({
  temp: z.tuple([z.number().min(-5).max(45), z.number().min(-5).max(50)]),
  humidity: z.tuple([z.number().min(10).max(100), z.number().min(10).max(100)]),
  co2: z.number().int().min(300).max(10000),
  gas: z.number().int().min(1).max(100),
});

export const inspectionSchema = z.object({
  warehouseId: z.string().max(40),
  zoneId: z.string().max(40),
  lotId: z.string().max(40).nullable().optional(),
  sampled: z.number().int().min(1).max(500),
  damaged: z.number().int().min(0).max(500),
  note: z.string().trim().max(500).default(""),
}).refine((v) => v.damaged <= v.sampled, { message: "Plus de produits abîmés que de produits contrôlés", path: ["damaged"] });

export const lotSchema = z.object({
  warehouseId: z.string().max(40),
  variety: z.string().trim().min(1).max(60),
  quantityT: z.number().positive().max(5000),
  zoneIds: z.array(z.string().max(20)).min(1).max(20),
  enteredAt: z.iso.date(),
  maxDays: z.number().int().min(7).max(400),
  origin: z.string().trim().max(80).default(""),
});

export const taskSchema = z.object({
  title: z.string().trim().min(3, "Décrivez la tâche").max(140),
  assigneeId: z.string().max(40).nullable(),
  due: z.iso.date(),
  module: z.enum(["agritech", "onion"]),
  link: z.object({ type: z.enum(["parcelle", "capteur", "entrepot", "lot"]), id: z.string().max(40) }).nullable().optional(),
});

export const taskStatusSchema = z.object({ status: z.enum(["a_faire", "en_cours", "terminee"]) });

export const alertActionSchema = z.object({ action: z.enum(["prendre_en_charge", "resoudre", "rouvrir"]), note: z.string().max(500).optional() });

export const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  phone: phoneSn,
  locale: z.enum(["fr", "wo"]),
});

export const notifySchema = z.object({ sms: z.boolean(), email: z.boolean(), push: z.boolean() });

export const changePasswordSchema = z
  .object({ current: z.string().min(1).max(128), password: passwordPolicy, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Les deux mots de passe ne correspondent pas", path: ["confirm"] });

export const markPaidSchema = z.object({ method: z.enum(["wave", "orange_money", "virement", "especes", "free_money"]), amount: z.number().int().positive() });

export const rolloutSchema = z.object({ version: z.string().regex(/^v\d+\.\d+\.\d+$/), deviceIds: z.array(z.string()).min(1).max(5000) });

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom").max(80),
  organization: z.string().trim().max(120).optional().default(""),
  phone: phoneSn,
  profile: z.enum(["cooperative", "exploitation", "stockage", "financeur", "institution", "partenaire", "autre"]),
  region: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().min(10, "Quelques mots de plus, s’il vous plaît").max(1500),
  consent: z.literal(true, { error: "Votre accord est nécessaire pour être recontacté" }),
  /** Champ piège anti-robot : doit rester vide. */
  website: z.string().max(0).optional().default(""),
});

/** Charge utile MQTT d'un capteur (topic saytumbay/{org}/{device}/data). */
export const telemetrySchema = z.object({
  ts: z.number().int().optional(),
  battery: z.number().min(0).max(100).optional(),
  rssi: z.number().min(-150).max(0).optional(),
  soilMoisture: z.number().min(0).max(100).optional(),
  soilTemp: z.number().min(-10).max(70).optional(),
  ec: z.number().min(0).max(20).optional(),
  ph: z.number().min(0).max(14).optional(),
  n: z.number().min(0).max(2000).optional(),
  p: z.number().min(0).max(2000).optional(),
  k: z.number().min(0).max(2000).optional(),
  airTemp: z.number().min(-20).max(70).optional(),
  airHumidity: z.number().min(0).max(100).optional(),
  co2: z.number().min(0).max(20000).optional(),
  gas: z.number().min(0).max(100).optional(),
  /** Version du micrologiciel annoncée par le capteur (suivi des déploiements). */
  fw: z.string().regex(/^v\d+\.\d+\.\d+$/).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type InviteInput = z.infer<typeof inviteSchema>;
export type ParcelInput = z.infer<typeof parcelSchema>;
export type IrrigationRuleInput = z.infer<typeof irrigationRuleSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type InspectionInput = z.infer<typeof inspectionSchema>;
export type LotInput = z.infer<typeof lotSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type ThresholdsInput = z.infer<typeof thresholdsSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type Telemetry = z.infer<typeof telemetrySchema>;
