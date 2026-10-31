/** Le mode démo applique les mêmes règles d'accès que l'API (contrat partagé). */
import { beforeEach, describe, expect, it } from "vitest";
import { handle } from "@/demo/backend";
import { resetDemo } from "@/demo/store";
import { ApiError } from "@/lib/api";

const status = async (p: Promise<unknown>) => {
  try {
    await p;
    return 200;
  } catch (e) {
    return e instanceof ApiError ? e.status : 500;
  }
};

describe("serveur de démonstration", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDemo();
  });

  it("refuse l'accès sans session", async () => {
    expect(await status(handle("GET", "/overview"))).toBe(401);
    expect(await handle("GET", "/auth/session")).toBeNull();
  });

  it("un technicien ne peut pas modifier les règles d'irrigation", async () => {
    await handle("POST", "/auth/demo", { persona: "technicien" });
    expect(await status(handle("PUT", "/irrigation/rules/p-a", { mode: "manuel", startBelow: 30, stopAbove: 45, maxDurationMin: 30, skipIfRainMm: 5 }))).toBe(403);
  });

  it("la console est refusée à un membre client", async () => {
    await handle("POST", "/auth/demo", { persona: "responsable" });
    expect(await status(handle("GET", "/admin/orgs"))).toBe(403);
  });

  it("verrouille après 5 mots de passe faux", async () => {
    for (let i = 0; i < 5; i++) expect(await status(handle("POST", "/auth/login", { email: "awa.ndiaye@demo.saytumbay.com", password: `x${i}` }))).toBe(401);
    expect(await status(handle("POST", "/auth/login", { email: "awa.ndiaye@demo.saytumbay.com", password: "Demo-SaytuMbay-2026" }))).toBe(429);
  });
});
