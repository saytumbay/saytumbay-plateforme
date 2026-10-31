/** Démarrage : configuration, base (migrations), données de démo si base vide, tâches de fond, écoute HTTP. */
import { loadEnv } from "./env";
import { openDb } from "./db/client";
import { buildApp } from "./app";
import { seedIfEmpty } from "./db/seed";
import { startJobs } from "./services/jobs";

const env = loadEnv();
const { db, close } = await openDb({ url: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR });
const { app, ctx } = await buildApp({ env, db, logger: env.NODE_ENV === "development" ? { level: env.LOG_LEVEL, transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } } } : undefined });

if (env.seedDemo && (await seedIfEmpty(ctx))) app.log.info("Base vide : données de démonstration chargées (mot de passe : voir README).");
const jobs = startJobs(ctx);

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "arrêt en cours");
  jobs.stop();
  await app.close();
  await close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host: env.HOST, port: env.PORT });
