/**
 * Tests de sécurité de bout en bout (application réelle, base PGlite en mémoire) :
 * authentification, verrouillage, CSRF, origine, cloisonnement entre organisations, droits par rôle,
 * escalade de privilèges, console, jetons à usage unique, en-têtes.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { Agent, makeApp, ORIGIN, type TestApp } from "./helpers";
import { DEMO_RECOVERY, DEMO_TOTP_SECRET } from "../src/db/seed";
import { totpAt } from "../src/lib/crypto";
import { contactMessages, measurements } from "../src/db/schema";

let t: TestApp;
beforeAll(async () => {
  t = await makeApp();
}, 60_000);
afterAll(async () => t?.close());

const AWA = "awa.ndiaye@demo.saytumbay.com";
const KHADY = "khady.gueye@demo.saytumbay.com";
const MOUSSA = "moussa.sarr@demo.saytumbay.com";
const MAMADOU = "mamadou.ba@demo.saytumbay.com";
const MAME = "mame.sow@demo.saytumbay.com";

describe("authentification", () => {
  it("refuse un mauvais mot de passe avec un message générique, sans révéler si le compte existe", async () => {
    const a = new Agent(t.app);
    const r1 = await a.post("/auth/login", { email: AWA, password: "mauvais" });
    const r2 = await a.post("/auth/login", { email: "personne@exemple.sn", password: "mauvais" });
    expect(r1.statusCode).toBe(401);
    expect(r2.statusCode).toBe(401);
    expect(r1.json().error.message).toBe(r2.json().error.message);
  });

  it("verrouille le compte 15 minutes après 5 échecs, même avec le bon mot de passe ensuite", async () => {
    const a = new Agent(t.app);
    const victim = "fatou.diop@demo.saytumbay.com";
    for (let i = 0; i < 5; i++) expect((await a.post("/auth/login", { email: victim, password: `faux-${i}` })).statusCode).toBe(401);
    const locked = await a.post("/auth/login", { email: victim, password: "Demo-SaytuMbay-2026" });
    expect(locked.statusCode).toBe(429);
  });

  it("pose un cookie de session HttpOnly + SameSite et un cookie CSRF lisible", async () => {
    const res = await t.app.inject({ method: "POST", url: "/api/auth/login", headers: { "content-type": "application/json", origin: ORIGIN }, payload: JSON.stringify({ email: AWA, password: "Demo-SaytuMbay-2026" }) });
    expect(res.statusCode).toBe(200);
    const session = res.cookies.find((c) => c.name === "sb_session")!;
    const csrf = res.cookies.find((c) => c.name === "sb_csrf")!;
    expect(session.httpOnly).toBe(true);
    expect(session.sameSite).toBe("Lax");
    expect(session.value.length).toBeGreaterThanOrEqual(43);
    expect(csrf.httpOnly).toBeFalsy();
  });

  it("limite les tentatives de connexion par adresse IP (10 par minute)", async () => {
    const a = new Agent(t.app);
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await a.post("/auth/login", { email: `bot${i}@exemple.sn`, password: "x" })).statusCode);
    expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);
  });

  it("déconnexion : le jeton de session ne fonctionne plus", async () => {
    const a = new Agent(t.app);
    await a.login(AWA);
    const token = a.cookies.get("sb_session")!;
    expect((await a.post("/auth/logout")).statusCode).toBe(204);
    const replay = await t.app.inject({ method: "GET", url: "/api/overview", cookies: { sb_session: token } });
    expect(replay.statusCode).toBe(401);
  });
});

describe("CSRF et origine", () => {
  it("refuse une écriture sans en-tête X-CSRF-Token", async () => {
    const a = new Agent(t.app);
    await a.login(AWA);
    const r = await a.post("/tasks", { module: "agritech", title: "Test", assigneeId: null, due: "2026-12-01" }, { "x-csrf-token": "" });
    expect(r.statusCode).toBe(403);
    expect(r.json().error.code).toBe("csrf");
  });

  it("refuse une écriture venant d'un autre site", async () => {
    const a = new Agent(t.app);
    await a.login(AWA);
    const r = await a.post("/tasks", { module: "agritech", title: "Test", assigneeId: null, due: "2026-12-01" }, { origin: "https://evil.example" });
    expect(r.statusCode).toBe(403);
    expect(r.json().error.code).toBe("origine_refusee");
  });
});

describe("cloisonnement entre organisations", () => {
  it("un membre du GIE ne voit rien de la Coopérative de Thiès (404, pas 403)", async () => {
    const a = new Agent(t.app);
    await a.login(KHADY);
    for (const url of ["/parcels/p-b", "/devices/AS-0003", "/warehouses/wh-mboro", "/series?device=AS-0003&metric=soilMoisture"]) {
      const r = await a.get(url);
      expect(r.statusCode, url).toBe(404);
    }
    const parcels = (await a.get("/parcels")).json() as Array<{ parcel: { orgId: string } }>;
    expect(parcels.every((p) => p.parcel.orgId === "org-gie-mboro")).toBe(true);
  });

  it("ne peut ni modifier ni commander les ressources d'une autre organisation", async () => {
    const a = new Agent(t.app);
    await a.login(KHADY);
    expect((await a.patch("/parcels/p-b", { name: "Piratée" })).statusCode).toBe(404);
    expect((await a.put("/warehouses/wh-mboro/thresholds", { temp: [20, 30], humidity: [60, 70], co2: 2000, gas: 40 })).statusCode).toBe(404);
    expect((await a.post("/irrigation/parcels/p-b/start", { durationMin: 10 })).statusCode).toBe(404);
  });

  it("refuse de basculer vers une organisation dont on n'est pas membre", async () => {
    const a = new Agent(t.app);
    await a.login(KHADY);
    expect((await a.post("/me/org", { orgId: "org-thies" })).statusCode).toBe(403);
  });
});

describe("droits par rôle", () => {
  it("un lecteur ne peut rien modifier", async () => {
    const a = new Agent(t.app);
    await a.login(MAMADOU);
    expect((await a.get("/parcels")).statusCode).toBe(200);
    expect((await a.patch("/parcels/p-a", { name: "X" })).statusCode).toBe(403);
    expect((await a.post("/irrigation/parcels/p-a/start", { durationMin: 10 })).statusCode).toBe(403);
    expect((await a.post("/members/invite", { firstName: "A", lastName: "B", phone: "771234567", email: "", role: "lecteur", parcels: "all" })).statusCode).toBe(403);
  });

  it("un exploitant ne voit que ses parcelles, leurs capteurs et leurs alertes", async () => {
    const a = new Agent(t.app);
    await a.login(MOUSSA);
    const codes = ((await a.get("/parcels")).json() as Array<{ parcel: { code: string } }>).map((p) => p.parcel.code).sort();
    expect(codes).toEqual(["A", "D"]);
    expect((await a.get("/parcels/p-b")).statusCode).toBe(404);
    expect((await a.get("/devices/AS-0005")).statusCode).toBe(404);
    expect((await a.get("/series?device=AS-0005&metric=soilMoisture")).statusCode).toBe(404);
    expect((await a.post("/irrigation/parcels/p-b/start", { durationMin: 10 })).statusCode).toBe(404);
  });

  it("un responsable ne peut pas attribuer un rôle supérieur au sien", async () => {
    const a = new Agent(t.app);
    await a.login(AWA);
    const r = await a.post("/members/invite", { firstName: "Pirate", lastName: "Test", phone: "770001122", email: "", role: "proprietaire", parcels: "all" });
    expect(r.statusCode).toBe(403);
    expect((await a.patch("/members/u-moussa", { role: "proprietaire" })).statusCode).toBe(403);
    expect((await a.patch("/members/u-awa", { role: "lecteur" })).statusCode).toBe(403);
  });

  it("le dernier propriétaire ne peut pas être retiré", async () => {
    const a = new Agent(t.app);
    await a.login(KHADY);
    expect((await a.del("/members/u-khady")).statusCode).toBe(403);
  });
});

describe("console SaytuMbay", () => {
  it("refuse la console à un membre client", async () => {
    const a = new Agent(t.app);
    await a.login(AWA);
    expect((await a.get("/admin/orgs")).statusCode).toBe(403);
    expect((await a.get("/admin/billing")).statusCode).toBe(403);
  });

  it("exige la double authentification : mauvais code refusé, bon code accepté", async () => {
    const a = new Agent(t.app);
    const step = await a.login(MAME);
    expect(step.status).toBe("totp");
    expect(a.cookies.has("sb_session")).toBe(false);
    expect((await a.post("/auth/totp", { challengeId: step.challengeId, code: "000000" })).statusCode).toBe(401);
    const ok = await a.post("/auth/totp", { challengeId: step.challengeId, code: totpAt(DEMO_TOTP_SECRET, Date.now()) });
    expect(ok.statusCode).toBe(200);
    expect((await a.get("/admin/orgs")).statusCode).toBe(200);
  });

  it("un code de secours ne sert qu'une fois", async () => {
    const a = new Agent(t.app);
    const s1 = await a.login(MAME);
    expect((await a.post("/auth/totp", { challengeId: s1.challengeId, code: DEMO_RECOVERY[0] })).statusCode).toBe(200);
    const b = new Agent(t.app);
    const s2 = await b.login(MAME);
    expect((await b.post("/auth/totp", { challengeId: s2.challengeId, code: DEMO_RECOVERY[0] })).statusCode).toBe(401);
  });

  it("le défi TOTP est bloqué après 5 essais", async () => {
    const a = new Agent(t.app);
    const s = await a.login(MAME);
    for (let i = 0; i < 5; i++) await a.post("/auth/totp", { challengeId: s.challengeId, code: "111111" });
    const r = await a.post("/auth/totp", { challengeId: s.challengeId, code: totpAt(DEMO_TOTP_SECRET, Date.now()) });
    expect(r.statusCode).toBe(401);
  });
});

describe("jetons à usage unique", () => {
  it("mot de passe oublié : même réponse pour un compte inconnu ; lien utilisable une seule fois ; sessions fermées", async () => {
    const victim = new Agent(t.app);
    await victim.login("ibou.faye@demo.saytumbay.com");
    const a = new Agent(t.app);
    expect((await a.post("/auth/forgot", { email: "inconnu@exemple.sn" })).statusCode).toBe(204);
    const before = t.sms.length;
    expect((await a.post("/auth/forgot", { email: "ibou.faye@demo.saytumbay.com" })).statusCode).toBe(204);
    const token = /jeton=([\w-]+)/.exec(t.sms.slice(before).map((s) => s.text).join(" "))?.[1];
    expect(token).toBeTruthy();
    const body = { token, password: "Nouveau-Mot2Passe", confirm: "Nouveau-Mot2Passe" };
    expect((await a.post("/auth/reset", body)).statusCode).toBe(204);
    expect((await a.post("/auth/reset", body)).statusCode).toBe(410);
    expect((await victim.get("/overview")).statusCode).toBe(401);
    await a.login("ibou.faye@demo.saytumbay.com", "Nouveau-Mot2Passe");
  });

  it("invitation : lien valable une fois, rôle appliqué", async () => {
    const owner = new Agent(t.app);
    await owner.login(AWA);
    const before = t.sms.length;
    const inv = await owner.post("/members/invite", { firstName: "Aïda", lastName: "Sy", phone: "770009988", email: "", role: "exploitant", parcels: ["p-a"] });
    expect(inv.statusCode).toBe(200);
    const token = /invitation\/([\w-]+)/.exec(t.sms.slice(before).map((s) => s.text).join(" "))?.[1]!;
    const guest = new Agent(t.app);
    expect((await guest.get(`/auth/invite/${token}`)).json().role).toBe("exploitant");
    const accept = await guest.post("/auth/invite/accept", { token, firstName: "Aïda", lastName: "Sy", password: "Bienvenue-Aida26", confirm: "Bienvenue-Aida26", acceptTerms: true });
    expect(accept.statusCode).toBe(200);
    expect(((await guest.get("/parcels")).json() as unknown[]).length).toBe(1);
    expect((await new Agent(t.app).get(`/auth/invite/${token}`)).statusCode).toBe(404);
  });
});

describe("entrées et en-têtes", () => {
  it("valide les entrées (422 par champ)", async () => {
    const a = new Agent(t.app);
    await a.login(AWA);
    const r = await a.post("/parcels", { code: "", name: "x" });
    expect(r.statusCode).toBe(422);
    expect(r.json().error.details.fields).toBeTruthy();
  });

  it("formulaire de contact : le champ piège est ignoré en silence", async () => {
    const a = new Agent(t.app);
    const base = { name: "Robot", organization: "", phone: "771112233", profile: "autre", region: "", message: "Message automatique de test", consent: true };
    expect((await a.post("/contact", { ...base, website: "http://spam" })).statusCode).toBe(200);
    expect((await t.ctx.db.select().from(contactMessages)).length).toBe(0);
    expect((await a.post("/contact", base)).statusCode).toBe(200);
    expect((await t.ctx.db.select().from(contactMessages)).length).toBe(1);
  });

  it("recherche : les caractères spéciaux ne cassent rien (requêtes paramétrées)", async () => {
    const a = new Agent(t.app);
    await a.login(AWA);
    const r = await a.get(`/search?q=${encodeURIComponent("' or 1=1 --")}`);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual([]);
  });

  it("refuse un corps trop volumineux", async () => {
    const a = new Agent(t.app);
    const r = await a.post("/contact", { message: "x".repeat(300_000) });
    expect(r.statusCode).toBe(413);
  });

  it("pose les en-têtes de sécurité et n'expose pas la technologie", async () => {
    const r = await t.app.inject({ method: "GET", url: "/api/health" });
    expect(r.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-frame-options"]).toBeDefined();
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(r.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("ingestion des mesures", () => {
  it("refuse une mesure publiée sous le sujet d'une autre organisation", async () => {
    const { ingest } = await import("../src/services/ingest");
    expect(await ingest(t.ctx, "AS-0003", { soilMoisture: 99 }, { orgFromTopic: "org-gie-mboro" })).toBe("refuse");
    expect(await ingest(t.ctx, "INCONNU", { soilMoisture: 20 })).toBe("inconnu");
    expect(await ingest(t.ctx, "AS-0003", { soilMoisture: 150 })).toBe("invalide");
  });

  it("enregistre une mesure valide et met le capteur à jour", async () => {
    const { ingest } = await import("../src/services/ingest");
    expect(await ingest(t.ctx, "AS-0003", { soilMoisture: 27.5, battery: 88, rssi: -97 }, { orgFromTopic: "org-thies" })).toBe("ok");
    const rows = await t.ctx.db.select().from(measurements).where(eq(measurements.deviceId, "AS-0003"));
    expect(rows.some((r) => r.metric === "soilMoisture" && r.value === 27.5)).toBe(true);
    const dev = await t.ctx.repos.devices.get("org-thies", "AS-0003");
    expect(dev?.battery).toBe(88);
    expect(dev?.signal).toBe(3);
  });

  it("convertit une remontée ChirpStack (Dragino LSE01)", async () => {
    const { fromChirpstack } = await import("../src/services/ingest");
    const r = fromChirpstack({ time: "2026-10-31T10:00:00Z", deviceInfo: { devEui: "A84041000181A2B3" }, object: { water_SOIL: "23.4", temp_SOIL: "27.1", conduct_SOIL: 410, Bat: 3.48 }, rxInfo: [{ rssi: -103 }] });
    expect(r?.devEui).toBe("a84041000181a2b3");
    expect(r?.telemetry).toMatchObject({ soilMoisture: 23.4, soilTemp: 27.1, ec: 0.41, battery: 80, rssi: -103 });
  });
});
