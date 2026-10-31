/** Onion : entrepôts, seuils, lots, contrôles visuels. */
import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { inspectionSchema, lotSchema, thresholdsSchema, type Lot } from "@saytumbay/shared";
import type { AppContext } from "../context";
import { users } from "../db/schema";
import { HttpError, notFound, parse } from "../lib/errors";
import { audit, need } from "../plugins/auth";
import { listAlerts } from "../services/alerts";
import { orgState } from "../services/state";

export function onionRoutes(app: FastifyInstance, ctx: AppContext) {
  const r = ctx.repos;

  app.get("/warehouses", async (req) => {
    const c = await need(ctx, req, "stock:lire");
    return (await orgState(ctx, c.orgId)).warehouseSnaps;
  });

  app.get("/warehouses/:id", async (req) => {
    const c = await need(ctx, req, "stock:lire");
    const id = (req.params as { id: string }).id;
    const st = await orgState(ctx, c.orgId);
    const snap = st.warehouseSnaps.find((w) => w.warehouse.id === id);
    if (!snap) throw notFound("Entrepôt introuvable.");
    const ins = await r.inspections.list(c.orgId, id);
    const ids = [...new Set(ins.map((i) => i.by))];
    const names = ids.length ? await ctx.db.select({ id: users.id, f: users.firstName, l: users.lastName }).from(users).where(inArray(users.id, ids)) : [];
    const name = (uid: string) => {
      const u = names.find((x) => x.id === uid);
      return u ? `${u.f} ${u.l}` : "—";
    };
    const devIds = new Set(st.rows.filter((d) => d.warehouseId === id).map((d) => d.id));
    return {
      snapshot: snap,
      lots: st.lots.filter((l) => l.warehouseId === id),
      inspections: ins.sort((a, b) => b.at.localeCompare(a.at)).map((i) => ({ ...i, byName: name(i.by) })),
      devices: st.rows.filter((d) => d.warehouseId === id),
      alerts: (await listAlerts(ctx, c.orgId)).filter((a) => a.source.id === id || devIds.has(a.source.id)),
    };
  });

  app.put("/warehouses/:id/thresholds", async (req, reply) => {
    const c = await need(ctx, req, "stock:seuils");
    const id = (req.params as { id: string }).id;
    const b = parse(thresholdsSchema, req.body);
    if (b.temp[0] >= b.temp[1]) throw new HttpError(422, "validation", "La température minimale doit être inférieure à la maximale.", { fields: { temp: "Minimum ≥ maximum" } });
    if (b.humidity[0] >= b.humidity[1]) throw new HttpError(422, "validation", "L’humidité minimale doit être inférieure à la maximale.", { fields: { humidity: "Minimum ≥ maximum" } });
    const w = await r.warehouses.update(c.orgId, id, { thresholds: b });
    if (!w) throw notFound("Entrepôt introuvable.");
    await audit(ctx, req, "seuils de stockage modifiés", w.name, "succes", c.orgId);
    return reply.status(204).send();
  });

  app.get("/lots", async (req) => {
    const c = await need(ctx, req, "stock:lire");
    return r.lots.list(c.orgId);
  });

  app.post("/lots", async (req) => {
    const c = await need(ctx, req, "stock:controler");
    const b = parse(lotSchema, req.body);
    const w = await r.warehouses.get(c.orgId, b.warehouseId);
    if (!w) throw new HttpError(422, "validation", "Entrepôt inconnu.", { fields: { warehouseId: "Entrepôt inconnu" } });
    if (b.zoneIds.some((z) => !w.zones.some((x) => x.id === z))) throw new HttpError(422, "validation", "Rangée inconnue.", { fields: { zoneIds: "Rangée inconnue" } });
    const n = (await r.lots.list(c.orgId)).length + 1;
    const lot: Lot = { id: `L-${String(n).padStart(2, "0")}-${randomUUID().slice(0, 4).toUpperCase()}`, orgId: c.orgId, product: w.product, status: "en_stock", ...b };
    await r.lots.insert(c.orgId, lot.id, lot, w.id);
    await audit(ctx, req, "lot enregistré", `${lot.id} · ${w.name}`, "succes", c.orgId);
    return lot;
  });

  app.patch("/lots/:id", async (req) => {
    const c = await need(ctx, req, "stock:controler");
    const id = (req.params as { id: string }).id;
    const { status } = parse(z.object({ status: z.enum(["en_stock", "a_vendre", "vendu"]) }), req.body);
    const l = await r.lots.update(c.orgId, id, { status });
    if (!l) throw notFound("Lot introuvable.");
    await audit(ctx, req, "lot mis à jour", `${id} · ${status}`, "succes", c.orgId);
    return l;
  });

  app.post("/inspections", async (req, reply) => {
    const c = await need(ctx, req, "stock:controler");
    const b = parse(inspectionSchema, req.body);
    const w = await r.warehouses.get(c.orgId, b.warehouseId);
    if (!w || !w.zones.some((z) => z.id === b.zoneId)) throw new HttpError(422, "validation", "Entrepôt ou rangée inconnus.");
    if (b.lotId && !(await r.lots.get(c.orgId, b.lotId))) throw new HttpError(422, "validation", "Lot inconnu.", { fields: { lotId: "Lot inconnu" } });
    if (b.damaged > b.sampled) throw new HttpError(422, "validation", "Plus de produits abîmés que d’échantillons.", { fields: { damaged: "Doit rester inférieur au nombre contrôlé" } });
    const id = `ins-${randomUUID().slice(0, 8)}`;
    await r.inspections.insert(c.orgId, id, { id, warehouseId: b.warehouseId, zoneId: b.zoneId, lotId: b.lotId ?? null, sampled: b.sampled, damaged: b.damaged, note: b.note ?? "", by: c.user.id, at: ctx.now().toISOString() }, b.warehouseId);
    await audit(ctx, req, "contrôle visuel saisi", `${w.name} · ${b.zoneId}`, "succes", c.orgId);
    return reply.status(204).send();
  });
}
