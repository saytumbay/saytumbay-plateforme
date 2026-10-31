/**
 * Construction de l'application Fastify : sécurité (en-têtes, cookies, limitation de débit, CSRF),
 * gestion d'erreurs au format du contrat, puis routes. Toutes les routes sont servies sous /api.
 */
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { Env } from "./env";
import type { Db } from "./db/client";
import { makeRepos, type AppContext } from "./context";
import { HttpError } from "./lib/errors";
import { registerAuth } from "./plugins/auth";
import { makeSms, type SmsSender } from "./services/sms";
import { authRoutes } from "./routes/auth";
import { agritechRoutes } from "./routes/agritech";
import { onionRoutes } from "./routes/onion";
import { workRoutes } from "./routes/work";
import { adminRoutes } from "./routes/admin";
import { openapiRoutes } from "./routes/openapi";

export interface BuildOptions {
  env: Env;
  db: Db;
  now?: () => Date;
  sms?: SmsSender;
  logger?: boolean | object;
}

export async function buildApp(o: BuildOptions) {
  const app = Fastify({
    logger: o.logger ?? { level: o.env.LOG_LEVEL, redact: ["req.headers.cookie", "req.headers.authorization", 'res.headers["set-cookie"]'] },
    // Nombre de sauts de confiance (Caddy devant l'API) : req.ip devient l'adresse réelle du client.
    trustProxy: o.env.TRUST_PROXY > 0 ? (o.env.TRUST_PROXY as unknown as boolean) : false,
    bodyLimit: 256 * 1024,
    // Identifiants de requête non devinables, renvoyés au client pour le support.
    genReqId: () => crypto.randomUUID(),
  });

  const ctx: AppContext = { env: o.env, db: o.db, repos: makeRepos(o.db), sms: o.sms ?? makeSms(o.env, o.db, app.log), log: app.log, now: o.now ?? (() => new Date()) };

  await app.register(helmet, {
    // L'API ne sert que du JSON : aucune ressource ne doit être chargée ni encadrée.
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    hsts: o.env.cookieSecure ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "no-referrer" },
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    allowList: o.env.NODE_ENV === "test" ? () => false : undefined,
    errorResponseBuilder: (_req, c) => ({ statusCode: 429, error: { code: "trop_de_requetes", message: `Trop de requêtes. Réessayez dans ${Math.ceil(c.ttl / 1000)} secondes.` } }),
  });

  app.addHook("onSend", async (req, reply, payload) => {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Request-Id", req.id);
    return payload;
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode === 429) return reply.status(429).send(err);
    if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
      const message = e.code === "FST_ERR_CTP_BODY_TOO_LARGE" ? "Contenu trop volumineux." : e.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE" ? "Format de contenu non pris en charge." : "Requête invalide.";
      return reply.status(e.statusCode).send({ error: { code: "requete_invalide", message } });
    }
    req.log.error({ err }, "erreur interne");
    return reply.status(500).send({ error: { code: "erreur_interne", message: `Une erreur est survenue de notre côté. Réessayez dans un instant (référence ${req.id.slice(0, 8)}).` } });
  });
  app.setNotFoundHandler((_req, reply) => reply.status(404).send({ error: { code: "introuvable", message: "Ressource introuvable." } }));

  await app.register(
    async (api) => {
      openapiRoutes(api, ctx);
      registerAuth(api, ctx);
      api.get("/health", { config: { rateLimit: false } }, async () => ({ ok: true }));
      authRoutes(api, ctx);
      agritechRoutes(api, ctx);
      onionRoutes(api, ctx);
      workRoutes(api, ctx);
      adminRoutes(api, ctx);
    },
    { prefix: "/api" },
  );

  return { app: app as unknown as import("fastify").FastifyInstance, ctx };
}
