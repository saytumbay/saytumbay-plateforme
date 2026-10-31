/** `npm run db:seed` : charge les données de démonstration dans une base vide. */
import pino from "pino";
import { loadEnv } from "../env";
import { openDb } from "./client";
import { makeRepos } from "../context";
import { seedIfEmpty } from "./seed";

const env = loadEnv();
const log = pino({ level: "info" });
const { db, close } = await openDb({ url: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR });
const ctx = { env, db, repos: makeRepos(db), log, now: () => new Date(), sms: { send: async () => true } };
const done = await seedIfEmpty(ctx);
log.info(done ? "Données de démonstration créées." : "La base contient déjà des organisations : rien n’a été modifié.");
await close();
