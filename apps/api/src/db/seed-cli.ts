/** `npm run db:seed` : charge les données de démonstration dans une base vide. */
import pino from "pino";
import { loadEnv } from "../env";
import { openDb } from "./client";
import { makeRepos } from "../context";
import { seedIfEmpty } from "./seed";

const env = loadEnv();
if (env.NODE_ENV === "production") {
  // Le mot de passe des comptes de démonstration est public : ces comptes ne doivent jamais exister sur un vrai serveur.
  console.error("Refusé : les données de démonstration ne se chargent pas en production (NODE_ENV=production).");
  process.exit(1);
}
const log = pino({ level: "info" });
const { db, close } = await openDb({ url: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR });
const ctx = { env, db, repos: makeRepos(db), log, now: () => new Date(), sms: { send: async () => true } };
const done = await seedIfEmpty(ctx);
log.info(done ? "Données de démonstration créées." : "La base contient déjà des organisations : rien n’a été modifié.");
await close();
