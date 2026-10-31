/**
 * Primitives de sécurité : jetons aléatoires, empreintes, chiffrement des secrets, mots de passe, TOTP.
 * Rien d'exotique : node:crypto (CSPRNG, SHA-256, HMAC, AES-256-GCM, comparaison à temps constant)
 * et Argon2id via @node-rs/argon2.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";

/** Jeton opaque de 32 octets (256 bits), encodé base64url. */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ——— Mots de passe : Argon2id (paramètres OWASP 2024 : 19 Mio, 2 itérations, 1 fil) ——— */

const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;
export const hashPassword = (pw: string) => argonHash(pw, ARGON);
export async function verifyPassword(hash: string | null | undefined, pw: string): Promise<boolean> {
  // Sans empreinte (compte inconnu), on calcule quand même pour ne pas révéler l'existence du compte par le temps de réponse.
  if (!hash) {
    await argonVerify(await dummyHash(), pw).catch(() => false);
    return false;
  }
  try {
    return await argonVerify(hash, pw);
  } catch {
    return false;
  }
}
let dummy: Promise<string> | null = null;
const dummyHash = () => (dummy ??= argonHash(randomToken(), ARGON));

/* ——— Secrets chiffrés : AES-256-GCM, IV aléatoire, format v1.iv.tag.data (base64url) ——— */

export function encrypt(key: Buffer, plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(key: Buffer, packed: string): string {
  const [v, iv, tag, data] = packed.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("secret illisible");
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}

/* ——— TOTP (RFC 6238 : HMAC-SHA1, 30 s, 6 chiffres) ——— */

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("base32 invalide");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

export function totpAt(secretB32: string, timeMs: number, step = 30, digits = 6): string {
  const counter = Math.floor(timeMs / 1000 / step);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secretB32)).update(msg).digest();
  const off = h[h.length - 1]! & 0xf;
  const code = ((h[off]! & 0x7f) << 24) | (h[off + 1]! << 16) | (h[off + 2]! << 8) | h[off + 3]!;
  return String(code % 10 ** digits).padStart(digits, "0");
}

/** Accepte la fenêtre courante et ±1 (dérive d'horloge d'un téléphone). */
export function verifyTotp(secretB32: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  return [-1, 0, 1].some((w) => safeEqual(totpAt(secretB32, now + w * 30_000), code));
}

/** Codes de secours : 8 codes « 1234-5678 », stockés en empreintes. */
export function newRecoveryCodes(n = 8): string[] {
  return Array.from({ length: n }, () => {
    const b = randomBytes(5).readUIntBE(0, 5) % 100_000_000;
    const s = String(b).padStart(8, "0");
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
}
