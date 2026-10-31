/**
 * Connexion à la base : PostgreSQL (pg) en production, PGlite embarqué en développement et en test.
 * Les migrations SQL générées par drizzle-kit sont appliquées au démarrage.
 */
import { fileURLToPath } from "node:url";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzlePglite<typeof schema>>;

function migrationsFolder(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  for (const c of [path.resolve(here, "../../drizzle"), path.resolve(here, "../drizzle"), path.resolve(here, "drizzle")]) if (existsSync(path.join(c, "meta"))) return c;
  throw new Error("Dossier des migrations « drizzle » introuvable.");
}

export async function openDb(opts: { url?: string; pgliteDir: string }): Promise<{ db: Db; close: () => Promise<void> }> {
  const folder = migrationsFolder();
  if (opts.url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: opts.url, max: 10 });
    const db = drizzlePg(pool, { schema });
    await migratePg(db, { migrationsFolder: folder });
    // Les deux pilotes exposent la même API de requêtes ; le type PGlite sert de référence.
    return { db: db as unknown as Db, close: () => pool.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  if (!opts.pgliteDir.startsWith("memory://")) mkdirSync(opts.pgliteDir, { recursive: true });
  const client = new PGlite(opts.pgliteDir);
  const db = drizzlePglite(client, { schema });
  await migratePglite(db, { migrationsFolder: folder });
  return { db, close: () => client.close() };
}
