/**
 * Accès aux tables documents. Chaque méthode exige l'organisation : le filtre `org_id` est posé ici,
 * une fois pour toutes, et non dans chaque route.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "./client";
import type { DocTable } from "./schema";

type DataOf<T extends DocTable> = T["$inferSelect"]["data"];

export function repo<T extends DocTable>(db: Db, table: T) {
  // Les tables documents ont toutes la même forme ; le cast unifie leurs types pour Drizzle.
  const t = table as unknown as typeof import("./schema").parcels;
  type D = DataOf<T>;
  return {
    async list(orgId: string, ref?: string | string[]): Promise<D[]> {
      const where = ref === undefined ? eq(t.orgId, orgId) : Array.isArray(ref) ? and(eq(t.orgId, orgId), ref.length ? inArray(t.ref, ref) : sql`false`) : and(eq(t.orgId, orgId), eq(t.ref, ref));
      const rows = await db.select({ data: t.data }).from(t).where(where);
      return rows.map((r) => r.data as D);
    },
    /** Toutes organisations confondues : réservé aux tâches de fond et à la console (droits vérifiés en amont). */
    async listAll(): Promise<Array<{ orgId: string; data: D }>> {
      const rows = await db.select({ orgId: t.orgId, data: t.data }).from(t);
      return rows.map((r) => ({ orgId: r.orgId, data: r.data as D }));
    },
    async get(orgId: string, id: string): Promise<D | null> {
      const [r] = await db
        .select({ data: t.data })
        .from(t)
        .where(and(eq(t.orgId, orgId), eq(t.id, id)))
        .limit(1);
      return (r?.data as D) ?? null;
    },
    /** Recherche par identifiant global (capteur reçu par MQTT, jeton…) : renvoie aussi l'organisation. */
    async find(id: string): Promise<{ orgId: string; data: D } | null> {
      const [r] = await db.select({ orgId: t.orgId, data: t.data }).from(t).where(eq(t.id, id)).limit(1);
      return r ? { orgId: r.orgId, data: r.data as D } : null;
    },
    async findByRef(ref: string): Promise<{ orgId: string; data: D } | null> {
      const [r] = await db.select({ orgId: t.orgId, data: t.data }).from(t).where(eq(t.ref, ref)).limit(1);
      return r ? { orgId: r.orgId, data: r.data as D } : null;
    },
    async insert(orgId: string, id: string, data: D, ref: string | null = null): Promise<D> {
      await db.insert(t).values({ id, orgId, ref, data: data as never });
      return data;
    },
    async insertMany(rows: Array<{ orgId: string; id: string; data: D; ref?: string | null }>) {
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        if (chunk.length) await db.insert(t).values(chunk.map((r) => ({ id: r.id, orgId: r.orgId, ref: r.ref ?? null, data: r.data as never })));
      }
    },
    /** Fusion superficielle (opérateur JSONB `||`) : seules les clés fournies changent. */
    async update(orgId: string, id: string, patch: Partial<D>): Promise<D | null> {
      const [r] = await db
        .update(t)
        .set({ data: sql`${t.data} || ${JSON.stringify(patch)}::jsonb`, updatedAt: new Date() })
        .where(and(eq(t.orgId, orgId), eq(t.id, id)))
        .returning({ data: t.data });
      return (r?.data as D) ?? null;
    },
    async replace(orgId: string, id: string, data: D, ref?: string | null): Promise<void> {
      await db
        .update(t)
        .set({ data: data as never, updatedAt: new Date(), ...(ref !== undefined ? { ref } : {}) })
        .where(and(eq(t.orgId, orgId), eq(t.id, id)));
    },
    async remove(orgId: string, id: string): Promise<boolean> {
      const r = await db
        .delete(t)
        .where(and(eq(t.orgId, orgId), eq(t.id, id)))
        .returning({ id: t.id });
      return r.length > 0;
    },
  };
}

export type Repo<T extends DocTable> = ReturnType<typeof repo<T>>;
