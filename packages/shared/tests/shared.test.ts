import { describe, expect, it } from "vitest";
import { can, canAssignRole, fmt, moistureState, storageRisk, storageRiskScore, contactSchema, passwordPolicy } from "../src";
import { createSeed, initSimulation, liveAlerts, parcelSnapshots, series, valueAt, warehouseSnapshots, liveDevices } from "../src/demo";

const seed = createSeed(new Date("2026-10-28T09:07:00Z"));
initSimulation(seed);
const anchor = seed.now.getTime();

describe("simulateur", () => {
  it("reprend les valeurs des maquettes à l'ancrage", () => {
    const snap = Object.fromEntries(parcelSnapshots(seed, anchor).map((s) => [s.parcel.code, s]));
    expect(Math.round(snap.B!.moisture!)).toBe(18);
    expect(snap.B!.state).toBe("sec");
    expect(Math.round(snap.D!.moisture!)).toBe(48);
    expect(snap.D!.state).toBe("humide");
    expect(snap.E!.moisture).toBeNull();
    expect(snap.E!.state).toBe("indisponible");
    expect(snap.A!.state).toBe("optimal");
  });

  it("produit des séries continues et déterministes", () => {
    const a = series("AS-0003", "soilMoisture", anchor - 7 * 86400000, anchor, anchor);
    const b = series("AS-0003", "soilMoisture", anchor - 7 * 86400000, anchor, anchor);
    expect(a.points.length).toBeGreaterThan(300);
    expect(a.points).toEqual(b.points);
    for (const [, v] of a.points) expect(v).toBeGreaterThan(3);
  });

  it("continue d'évoluer après l'ancrage (direct)", () => {
    const v1 = valueAt("OS-203", "airTemp", anchor + 30 * 60000, anchor);
    expect(v1).not.toBeNull();
  });

  it("classe le risque des entrepôts comme dans le scénario", () => {
    const w = Object.fromEntries(warehouseSnapshots(seed, anchor).map((s) => [s.warehouse.id, s]));
    expect(w["wh-mboro"]!.risk).toBe("pourriture");
    expect(w["wh-mboro"]!.zones.find((z) => z.zoneId === "R2")!.risk).toBe("pourriture");
    expect(["surveiller", "risque"]).toContain(w["wh-potou"]!.risk);
    expect(w["wh-ngomene"]!.risk).toBe("bon");
  });

  it("génère les alertes attendues sans doublon", () => {
    const al = liveAlerts(seed, anchor).filter((a) => a.status === "ouverte");
    const ids = al.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    const kinds = al.map((a) => a.kind);
    expect(kinds).toContain("sol_sec");
    expect(kinds).toContain("capteur_hors_ligne");
    expect(kinds).toContain("batterie_faible");
    expect(al.some((a) => a.module === "onion" && a.severity === "critique")).toBe(true);
    expect(al[0]!.severity).toBe("critique");
  });

  it("met à jour l'état des capteurs", () => {
    const d = Object.fromEntries(liveDevices(seed, anchor).map((x) => [x.id, x]));
    expect(d["AS-0011"]!.status).toBe("hors_ligne");
    expect(d["AS-0007"]!.status).toBe("batterie_faible");
    expect(d["AS-0003"]!.status).toBe("en_ligne");
  });
});

describe("règles", () => {
  it("état hydrique", () => {
    expect(moistureState(null, { dry: 30, wet: 45 })).toBe("indisponible");
    expect(moistureState(29.9, { dry: 30, wet: 45 })).toBe("sec");
    expect(moistureState(45, { dry: 30, wet: 45 })).toBe("optimal");
    expect(moistureState(45.1, { dry: 30, wet: 45 })).toBe("humide");
  });
  it("risque de stockage", () => {
    const t = { temp: [24, 32] as [number, number], humidity: [65, 72] as [number, number], co2: 1200, gas: 40 };
    expect(storageRisk(storageRiskScore({ temp: 27, humidity: 68, co2: 900, gas: 10 }, t))).toBe("bon");
    expect(storageRisk(storageRiskScore({ temp: 31, humidity: 92, co2: 2950, gas: 68 }, t))).toBe("pourriture");
    expect(storageRiskScore({ temp: null, humidity: null, co2: null, gas: null }, t)).toBeNull();
  });
});

describe("droits", () => {
  it("applique la matrice", () => {
    expect(can("membres:gerer", { orgRole: "responsable" })).toBe(true);
    expect(can("membres:gerer", { orgRole: "exploitant" })).toBe(false);
    expect(can("irrigation:commander", { orgRole: "lecteur" })).toBe(false);
    expect(can("admin:facturation", { platformRole: "support" })).toBe(false);
    expect(can("admin:facturation", { platformRole: "admin" })).toBe(true);
    expect(can("admin:clients", { orgRole: "proprietaire" })).toBe(false);
  });
  it("empêche l'élévation de rôle", () => {
    expect(canAssignRole("responsable", "proprietaire")).toBe(false);
    expect(canAssignRole("exploitant", "lecteur")).toBe(false);
    expect(canAssignRole("proprietaire", "responsable")).toBe(true);
  });
});

describe("validation et formatage", () => {
  it("valide un numéro sénégalais et le formulaire de contact", () => {
    const ok = contactSchema.safeParse({ name: "Aïda Sy", phone: "+221 77 123 45 67", profile: "cooperative", message: "Nous avons un magasin de 80 t à Potou.", consent: true });
    expect(ok.success).toBe(true);
    const bot = contactSchema.safeParse({ name: "x y", phone: "771234567", profile: "autre", message: "bonjour bonjour", consent: true, website: "spam" });
    expect(bot.success).toBe(false);
    expect(contactSchema.safeParse({ name: "Aïda", phone: "+33 6 12 34 56 78", profile: "autre", message: "bonjour à vous", consent: true }).success).toBe(false);
  });
  it("politique de mot de passe", () => {
    expect(passwordPolicy.safeParse("court").success).toBe(false);
    expect(passwordPolicy.safeParse("toutenminuscule123").success).toBe(false);
    expect(passwordPolicy.safeParse("Thies-Mboro-2026").success).toBe(true);
  });
  it("formate en français", () => {
    expect(fmt.pct(34)).toBe("34 %");
    expect(fmt.fcfa(47500)).toBe("47 500 FCFA");
    expect(fmt.temp(29.4)).toBe("29,4 °C");
    expect(fmt.phone("+221774120833")).toBe("+221 77 412 08 33");
  });
});
