import type { FastifyBaseLogger } from "fastify";
import type { Env } from "./env";
import type { Db } from "./db/client";
import { repo } from "./db/repo";
import * as t from "./db/schema";
import type { SmsSender } from "./services/sms";

export function makeRepos(db: Db) {
  return {
    sites: repo(db, t.sites),
    parcels: repo(db, t.parcels),
    devices: repo(db, t.devices),
    pumps: repo(db, t.pumps),
    valves: repo(db, t.valves),
    rules: repo(db, t.irrigationRules),
    schedules: repo(db, t.irrigationSchedules),
    runs: repo(db, t.irrigationRuns),
    events: repo(db, t.irrigationEvents),
    warehouses: repo(db, t.warehouses),
    lots: repo(db, t.lots),
    inspections: repo(db, t.inspections),
    tasks: repo(db, t.tasks),
    invoices: repo(db, t.invoices),
    subscriptions: repo(db, t.subscriptions),
    costLines: repo(db, t.costLines),
    firmware: repo(db, t.firmwareReleases),
    rollouts: repo(db, t.rollouts),
  };
}

export type Repos = ReturnType<typeof makeRepos>;

export interface AppContext {
  env: Env;
  db: Db;
  repos: Repos;
  sms: SmsSender;
  log: FastifyBaseLogger;
  /** Horloge injectable (tests). */
  now: () => Date;
}
