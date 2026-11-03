import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, decrypt, encrypt, hashPassword, newRecoveryCodes, totpAt, verifyPassword, verifyTotp } from "../src/lib/crypto";
import { loadEnv } from "../src/env";

describe("TOTP (RFC 6238)", () => {
  // Vecteurs de l'annexe B de la RFC 6238 (SHA-1, secret ASCII « 12345678901234567890 »), 6 derniers chiffres.
  const secret = base32Encode(Buffer.from("12345678901234567890"));
  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ])("t=%i s → %s", (tSec, code) => {
    expect(totpAt(secret, tSec * 1000)).toBe(code);
  });

  it("tolère une dérive de 30 s, pas davantage", () => {
    const now = 1_800_000_000_000;
    expect(verifyTotp(secret, totpAt(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, "abcdef", now)).toBe(false);
  });

  it("encode et décode le base32", () => {
    const b = Buffer.from([0, 1, 2, 250, 255, 128, 64]);
    expect(base32Decode(base32Encode(b))).toEqual(b);
  });
});

describe("chiffrement et mots de passe", () => {
  const key = Buffer.alloc(32, 7);
  it("chiffre en AES-256-GCM et détecte toute altération", () => {
    const c = encrypt(key, "JBSWY3DPEHPK3PXP");
    expect(c).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decrypt(key, c)).toBe("JBSWY3DPEHPK3PXP");
    const parts = c.split(".");
    parts[3] = Buffer.from("altere").toString("base64url");
    expect(() => decrypt(key, parts.join("."))).toThrow();
    expect(encrypt(key, "x")).not.toBe(encrypt(key, "x"));
  });

  it("hache en Argon2id et vérifie", async () => {
    const h = await hashPassword("Un-Mot2Passe-Solide");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(h, "Un-Mot2Passe-Solide")).toBe(true);
    expect(await verifyPassword(h, "autre")).toBe(false);
    expect(await verifyPassword(null, "autre")).toBe(false);
  });

  it("génère des codes de secours uniques au bon format", () => {
    const codes = newRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    expect(codes.every((c) => /^\d{4}-\d{4}$/.test(c))).toBe(true);
  });
});

describe("configuration de production", () => {
  const prod = { NODE_ENV: "production", ENCRYPTION_KEY: "ab".repeat(32), DATABASE_URL: "postgres://u:p@localhost:5432/db" };

  it("démarre avec une configuration de production complète, sans démo", () => {
    const env = loadEnv(prod);
    expect(env.seedDemo).toBe(false);
    expect(env.demoLogin).toBe(false);
  });

  it("refuse les comptes et la connexion de démonstration (mot de passe public)", () => {
    expect(() => loadEnv({ ...prod, SEED_DEMO: "true" })).toThrow(/SEED_DEMO/);
    expect(() => loadEnv({ ...prod, DEMO_LOGIN: "true" })).toThrow(/DEMO_LOGIN/);
  });
});
