/**
 * Tâches de fond : client MQTT, simulateur (développement), synchronisation des alertes,
 * progression des déploiements, factures en retard et purge des données expirées.
 */
import { eq, isNotNull, lt, or, sql } from "drizzle-orm";
import { deviceStatus, type Metric, type Rollout } from "@saytumbay/shared";
import { setBatteryTargets, valueAt } from "@saytumbay/shared/demo";
import type { AppContext } from "../context";
import { appMeta, auditLog, loginChallenges, passwordResets, sessions } from "../db/schema";
import { syncAlerts } from "./alerts";
import { fromChirpstack, ingest } from "./ingest";

const SOIL: Metric[] = ["soilMoisture", "soilTemp", "ec", "ph", "n", "p", "k", "battery"];
const AIR: Metric[] = ["airTemp", "airHumidity", "co2", "gas", "battery"];

export function startJobs(ctx: AppContext) {
  const timers: NodeJS.Timeout[] = [];
  const pending = new Map<string, NodeJS.Timeout>();
  const running = new Set<string>();

  /** Recalcul des alertes d'une organisation, regroupé (au plus une fois toutes les 5 s). */
  const scheduleSync = (orgId: string) => {
    if (pending.has(orgId)) return;
    pending.set(
      orgId,
      setTimeout(async () => {
        pending.delete(orgId);
        if (running.has(orgId)) return;
        running.add(orgId);
        try {
          await syncAlerts(ctx, orgId);
        } catch (e) {
          ctx.log.error({ err: e, orgId }, "synchronisation des alertes en échec");
        } finally {
          running.delete(orgId);
        }
      }, 5000),
    );
  };

  /* ——— MQTT ——— */
  let mqttClient: { end: (force?: boolean) => void } | null = null;
  if (ctx.env.MQTT_URL) {
    void import("mqtt").then(({ default: mqtt }) => {
      const client = mqtt.connect(ctx.env.MQTT_URL!, { username: ctx.env.MQTT_USERNAME, password: ctx.env.MQTT_PASSWORD, clientId: `saytumbay-api-${process.pid}`, reconnectPeriod: 5000, clean: false });
      mqttClient = client;
      client.on("connect", () => {
        ctx.log.info("MQTT connecté");
        client.subscribe(["saytumbay/+/+/data", ctx.env.CHIRPSTACK_TOPIC], { qos: 1 });
      });
      client.on("error", (e) => ctx.log.warn({ err: e.message }, "MQTT : erreur"));
      client.on("message", async (topic, payload) => {
        if (payload.length > 16_384) return;
        let body: unknown;
        try {
          body = JSON.parse(payload.toString("utf8"));
        } catch {
          return;
        }
        try {
          const own = /^saytumbay\/([\w-]{1,40})\/([\w-]{1,40})\/data$/.exec(topic);
          if (own) {
            const res = await ingest(ctx, own[2]!, body, { orgFromTopic: own[1], onIngested: scheduleSync });
            if (res !== "ok") ctx.log.debug({ topic, res }, "mesure ignorée");
            return;
          }
          const cs = fromChirpstack(body);
          if (cs) {
            const dev = await ctx.repos.devices.findByRef(cs.devEui);
            if (dev) await ingest(ctx, dev.data.id, cs.telemetry, { onIngested: scheduleSync });
            else ctx.log.debug({ devEui: cs.devEui }, "DevEUI inconnu");
          }
        } catch (e) {
          ctx.log.error({ err: e, topic }, "ingestion en échec");
        }
      });
    });
  }

  /* ——— Simulateur (capteurs marqués « simulés ») ——— */
  async function simulate() {
    const [meta] = await ctx.db.select().from(appMeta).where(eq(appMeta.key, "demo_anchor")).limit(1);
    if (!meta) return;
    const anchor = Number(meta.value);
    const now = ctx.now().getTime();
    for (const { data: d } of await ctx.repos.devices.listAll()) {
      if (!d.simulated || d.kind === "passerelle") continue;
      const metrics = d.kind === "sol" ? SOIL : AIR;
      const t: Record<string, number> = { ts: now };
      for (const m of metrics) {
        const v = valueAt(d.id, m, now, anchor);
        if (v != null) t[m] = Math.round(v * 10) / 10;
      }
      if (Object.keys(t).length > 1) await ingest(ctx, d.id, { ...t, rssi: -95 }, { onIngested: scheduleSync });
    }
  }

  /* ——— Déploiements : un capteur simulé en ligne se met à jour toutes les 5 s ——— */
  async function rollouts() {
    const now = ctx.now();
    for (const ro of (await ctx.repos.rollouts.list("platform")) as Array<Rollout & { allTargets?: string[] }>) {
      if (ro.status !== "en_cours") continue;
      const devices = new Map((await ctx.repos.devices.listAll()).map((x) => [x.data.id, x]));
      const updated = new Set(ro.updatedDeviceIds);
      const failed = new Set<string>();
      let budget = Math.max(1, Math.floor((now.getTime() - new Date(ro.startedAt).getTime()) / 5000) + 1 - updated.size);
      for (const id of ro.targetDeviceIds) {
        const dev = devices.get(id);
        if (!dev || updated.has(id)) continue;
        if (dev.data.firmware === ro.version) {
          updated.add(id);
          continue;
        }
        const online = deviceStatus(dev.data, now) !== "hors_ligne";
        if (!online) failed.add(id);
        else if (dev.data.simulated && budget > 0) {
          budget -= 1;
          updated.add(id);
          await ctx.repos.devices.update(dev.orgId, id, { firmware: ro.version });
        }
      }
      const done = updated.size + failed.size >= ro.targetDeviceIds.length;
      await ctx.repos.rollouts.update("platform", ro.id, { updatedDeviceIds: [...updated], failedDeviceIds: [...failed], ...(done ? { status: ro.stage === "canari" ? "en_pause" : "termine" } : {}) });
    }
  }

  /* ——— Entretien quotidien ——— */
  async function housekeeping() {
    const now = ctx.now();
    await ctx.db.delete(sessions).where(lt(sessions.expiresAt, now));
    await ctx.db.delete(loginChallenges).where(lt(loginChallenges.expiresAt, now));
    await ctx.db.delete(passwordResets).where(or(lt(passwordResets.expiresAt, now), isNotNull(passwordResets.usedAt)));
    await ctx.db.delete(auditLog).where(lt(auditLog.at, new Date(now.getTime() - 365 * 24 * 3600_000)));
    for (const { orgId, data: i } of await ctx.repos.invoices.listAll()) if (i.status === "en_attente" && i.dueAt < now.toISOString()) await ctx.repos.invoices.update(orgId, i.id, { status: "en_retard" });
  }

  async function syncAll() {
    const orgs = await ctx.db.execute<{ id: string }>(sql`select id from organizations`);
    for (const o of orgs.rows) scheduleSync(o.id);
  }

  void (async () => {
    if (ctx.env.simulator) {
      const devs = await ctx.repos.devices.listAll();
      setBatteryTargets(Object.fromEntries(devs.filter((d) => d.data.battery != null).map((d) => [d.data.id, d.data.battery!])));
      await simulate().catch((e) => ctx.log.error({ err: e }, "simulateur en échec"));
    }
    await syncAll();
    await housekeeping().catch((e) => ctx.log.error({ err: e }, "entretien en échec"));
  })();

  timers.push(setInterval(() => void syncAll(), 60_000));
  timers.push(setInterval(() => void rollouts().catch((e) => ctx.log.error({ err: e }, "déploiements en échec")), 5000));
  timers.push(setInterval(() => void housekeeping().catch((e) => ctx.log.error({ err: e }, "entretien en échec")), 6 * 3600_000));
  if (ctx.env.simulator) timers.push(setInterval(() => void simulate().catch((e) => ctx.log.error({ err: e }, "simulateur en échec")), 60_000));

  return {
    scheduleSync,
    stop() {
      for (const t of timers) clearInterval(t);
      for (const t of pending.values()) clearTimeout(t);
      mqttClient?.end(true);
    },
  };
}
