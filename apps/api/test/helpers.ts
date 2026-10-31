import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import { loadEnv } from "../src/env";
import { openDb } from "../src/db/client";
import { buildApp } from "../src/app";
import { seedDemo, DEMO_PASSWORD } from "../src/db/seed";
import type { AppContext } from "../src/context";

export const ORIGIN = "http://localhost:5173";

export interface TestApp {
  app: FastifyInstance;
  ctx: AppContext;
  sms: Array<{ to: string; text: string }>;
  close: () => Promise<void>;
}

/** Application complète sur une base PGlite en mémoire, données de démo (1 jour d'historique). */
export async function makeApp(): Promise<TestApp> {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "silent", APP_URL: ORIGIN, WEATHER: "off", DEMO_LOGIN: "true" });
  const { db, close } = await openDb({ pgliteDir: "memory://" });
  const sms: Array<{ to: string; text: string }> = [];
  const { app, ctx } = await buildApp({ env, db, logger: false, sms: { send: async (to, text) => (sms.push({ to, text }), true) } });
  await seedDemo(ctx, { historyDays: 1 });
  await app.ready();
  return { app, ctx, sms, close: async () => (await app.close(), await close()) };
}

/** Client avec pot à cookies et jeton CSRF, comme un navigateur. */
let ipCounter = 1;

export class Agent {
  cookies = new Map<string, string>();
  /** Chaque agent a sa propre adresse IP : les limites de débit par IP s'appliquent comme en vrai. */
  ip = `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;
  constructor(private app: FastifyInstance) {}

  private store(res: LightMyRequestResponse) {
    for (const c of res.cookies) {
      if (c.value === "" || (c.expires && c.expires.getTime() < Date.now())) this.cookies.delete(c.name);
      else this.cookies.set(c.name, c.value);
    }
  }

  async req(method: string, url: string, body?: unknown, headers: Record<string, string> = {}) {
    const unsafe = !["GET", "HEAD"].includes(method);
    const res = await this.app.inject({
      method: method as "GET",
      url: `/api${url}`,
      remoteAddress: this.ip,
      headers: {
        ...(unsafe ? { origin: ORIGIN } : {}),
        ...(unsafe && this.cookies.get("sb_csrf") ? { "x-csrf-token": this.cookies.get("sb_csrf")! } : {}),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      cookies: Object.fromEntries(this.cookies),
      ...(body !== undefined ? { payload: JSON.stringify(body) } : {}),
    });
    this.store(res);
    return res;
  }

  get = (url: string, h?: Record<string, string>) => this.req("GET", url, undefined, h);
  post = (url: string, body?: unknown, h?: Record<string, string>) => this.req("POST", url, body ?? {}, h);
  put = (url: string, body?: unknown) => this.req("PUT", url, body ?? {});
  patch = (url: string, body?: unknown) => this.req("PATCH", url, body ?? {});
  del = (url: string) => this.req("DELETE", url);

  async login(email: string, password = DEMO_PASSWORD) {
    const r = await this.post("/auth/login", { email, password });
    if (r.statusCode !== 200) throw new Error(`connexion ${email} : ${r.statusCode} ${r.body}`);
    return r.json() as { status: string; challengeId?: string };
  }
}

export const email = (id: string) => `${id}@demo.saytumbay.com`;
