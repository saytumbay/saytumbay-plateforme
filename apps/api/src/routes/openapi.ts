/**
 * Description OpenAPI 3.1 générée à partir des routes réellement enregistrées et des schémas zod partagés
 * (z.toJSONSchema). Servie sur /api/openapi.json ; utilisable avec Swagger UI, Bruno ou Postman.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as S from "@saytumbay/shared";
import type { AppContext } from "../context";

const BODIES: Record<string, z.ZodType> = {
  "POST /auth/login": S.loginSchema,
  "POST /auth/totp": S.totpSchema,
  "POST /auth/forgot": S.forgotSchema,
  "POST /auth/reset": S.resetSchema,
  "POST /auth/invite/accept": S.acceptInviteSchema,
  "PATCH /me/profile": S.profileSchema,
  "PUT /me/password": S.changePasswordSchema,
  "PUT /me/notifications": S.notifySchema,
  "POST /parcels": S.parcelSchema,
  "PUT /irrigation/rules/{parcelId}": S.irrigationRuleSchema,
  "POST /irrigation/schedules": S.scheduleSchema,
  "POST /irrigation/parcels/{id}/start": S.manualIrrigationSchema,
  "POST /devices": S.deviceRegisterSchema,
  "PUT /warehouses/{id}/thresholds": S.thresholdsSchema,
  "POST /lots": S.lotSchema,
  "POST /inspections": S.inspectionSchema,
  "POST /alerts/{id}/action": S.alertActionSchema,
  "POST /tasks": S.taskSchema,
  "PATCH /tasks/{id}": S.taskStatusSchema,
  "POST /members/invite": S.inviteSchema,
  "PATCH /members/{userId}": S.updateMemberSchema,
  "POST /contact": S.contactSchema,
  "POST /admin/invoices/{id}/pay": S.markPaidSchema,
  "POST /admin/rollouts": S.rolloutSchema,
};

const PUBLIC = new Set(["POST /auth/login", "POST /auth/totp", "POST /auth/forgot", "POST /auth/reset", "GET /auth/invite/{token}", "POST /auth/invite/accept", "POST /contact", "GET /health", "GET /openapi.json", "GET /auth/session", "POST /auth/demo"]);

export function openapiRoutes(app: FastifyInstance, _ctx: AppContext) {
  const routes: Array<{ method: string; url: string }> = [];
  app.addHook("onRoute", (r) => {
    for (const m of [r.method].flat()) if (m !== "HEAD") routes.push({ method: m, url: r.url.replace(/^\/api/, "").replace(/:(\w+)/g, "{$1}") });
  });

  app.get("/openapi.json", async () => {
    const paths: Record<string, Record<string, unknown>> = {};
    for (const r of routes) {
      const key = `${r.method} ${r.url}`;
      const tag = r.url.split("/")[1] ?? "api";
      const params = [...r.url.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: "path", required: true, schema: { type: "string" } }));
      const body = BODIES[key];
      (paths[r.url] ??= {})[r.method.toLowerCase()] = {
        tags: [tag],
        ...(params.length ? { parameters: params } : {}),
        ...(body ? { requestBody: { required: true, content: { "application/json": { schema: z.toJSONSchema(body, { io: "input", unrepresentable: "any" }) } } } } : {}),
        ...(PUBLIC.has(key) ? { security: [] } : {}),
        responses: { "200": { description: "Succès" }, "204": { description: "Succès, sans contenu" }, "401": { $ref: "#/components/responses/Erreur" }, "403": { $ref: "#/components/responses/Erreur" }, "404": { $ref: "#/components/responses/Erreur" }, "422": { $ref: "#/components/responses/Erreur" }, "429": { $ref: "#/components/responses/Erreur" } },
      };
    }
    return {
      openapi: "3.1.0",
      info: { title: "API SaytuMbay", version: "1.0.0", description: "Authentification par cookie de session (sb_session) ; toute écriture exige l’en-tête X-CSRF-Token égal au cookie sb_csrf." },
      servers: [{ url: "/api" }],
      security: [{ session: [], csrf: [] }],
      components: {
        securitySchemes: { session: { type: "apiKey", in: "cookie", name: "sb_session" }, csrf: { type: "apiKey", in: "header", name: "X-CSRF-Token" } },
        responses: { Erreur: { description: "Erreur", content: { "application/json": { schema: { type: "object", properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" }, details: {} }, required: ["code", "message"] } } } } } } },
      },
      paths,
    };
  });
}
