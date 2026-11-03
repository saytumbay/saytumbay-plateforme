/**
 * Configuration lue dans l'environnement et validée au démarrage : l'API refuse de démarrer
 * en production sans clé de chiffrement, base PostgreSQL et cookies sécurisés.
 */
import { z } from "zod";

const bool = z
  .enum(["true", "false", "1", "0", "yes", "no"])
  .transform((v) => v === "true" || v === "1" || v === "yes");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
    /** URL publique du site (liens dans les SMS et e-mails, contrôle d'origine). */
    APP_URL: z.url().default("http://localhost:5173"),
    /** PostgreSQL en production ; sans URL, base PGlite embarquée (développement, tests). */
    DATABASE_URL: z.string().optional(),
    PGLITE_DIR: z.string().default("./.data/pglite"),
    /** 32 octets en hexadécimal : chiffrement des secrets de double authentification (AES-256-GCM). */
    ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, "64 caractères hexadécimaux (openssl rand -hex 32)")
      .optional(),
    COOKIE_SECURE: bool.optional(),
    /** Nombre de mandataires de confiance devant l'API (Caddy = 1). */
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    /** Données de démonstration au premier démarrage sur une base vide. */
    SEED_DEMO: bool.optional(),
    /** Connexion par profil de démonstration (POST /auth/demo). Jamais activée par défaut en production. */
    DEMO_LOGIN: bool.optional(),
    /** Mesures simulées pour les capteurs marqués « simulés ». */
    SIMULATOR: bool.optional(),
    MQTT_URL: z.string().optional(),
    MQTT_USERNAME: z.string().optional(),
    MQTT_PASSWORD: z.string().optional(),
    /** Sujet ChirpStack v4 des remontées LoRaWAN. */
    CHIRPSTACK_TOPIC: z.string().default("application/+/device/+/event/up"),
    SMS_PROVIDER: z.enum(["console", "orange"]).default("console"),
    ORANGE_CLIENT_ID: z.string().optional(),
    ORANGE_CLIENT_SECRET: z.string().optional(),
    /** Numéro expéditeur autorisé par Orange, sans « + » (ex. 2210000000). */
    ORANGE_SENDER: z.string().optional(),
    ORANGE_SENDER_NAME: z.string().max(11).optional(),
    WEATHER: z.enum(["open-meteo", "off"]).default("open-meteo"),
  })
  .superRefine((e, ctx) => {
    if (e.NODE_ENV !== "production") return;
    if (!e.ENCRYPTION_KEY) ctx.addIssue({ code: "custom", path: ["ENCRYPTION_KEY"], message: "obligatoire en production" });
    if (!e.DATABASE_URL) ctx.addIssue({ code: "custom", path: ["DATABASE_URL"], message: "obligatoire en production (PostgreSQL)" });
    // Le mot de passe des comptes de démonstration est public (dépôt ouvert) : jamais de comptes ni de connexion de démo en production.
    if (e.SEED_DEMO === true) ctx.addIssue({ code: "custom", path: ["SEED_DEMO"], message: "interdit en production : les comptes de démonstration ont un mot de passe public" });
    if (e.DEMO_LOGIN === true) ctx.addIssue({ code: "custom", path: ["DEMO_LOGIN"], message: "interdit en production : connexion de démonstration sans mot de passe" });
    if (e.COOKIE_SECURE === false) ctx.addIssue({ code: "custom", path: ["COOKIE_SECURE"], message: "doit rester actif en production" });
    if (e.SMS_PROVIDER === "orange" && !(e.ORANGE_CLIENT_ID && e.ORANGE_CLIENT_SECRET && e.ORANGE_SENDER)) ctx.addIssue({ code: "custom", path: ["ORANGE_CLIENT_ID"], message: "identifiants Orange incomplets" });
  });

export type Env = z.infer<typeof schema> & { cookieSecure: boolean; seedDemo: boolean; simulator: boolean; demoLogin: boolean; encryptionKey: Buffer };

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const r = schema.safeParse(source);
  if (!r.success) {
    const lines = r.error.issues.map((i) => `  - ${i.path.join(".")} : ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${lines}`);
  }
  const e = r.data;
  const prod = e.NODE_ENV === "production";
  // Hors production, une clé fixe de développement évite de bloquer le démarrage ; jamais utilisée en production.
  const key = e.ENCRYPTION_KEY ?? "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
  return {
    ...e,
    cookieSecure: e.COOKIE_SECURE ?? prod,
    seedDemo: e.SEED_DEMO ?? !prod,
    simulator: e.SIMULATOR ?? !prod,
    demoLogin: e.DEMO_LOGIN ?? !prod,
    encryptionKey: Buffer.from(key, "hex"),
  };
}
