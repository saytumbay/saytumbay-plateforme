/**
 * Envoi de SMS. « console » écrit dans les journaux (développement) ; « orange » utilise l'API
 * SMS d'Orange (OAuth2 client_credentials, puis outbound/tel:+{expéditeur}/requests).
 * Chaque envoi est consigné dans `sms_log`, réussi ou non.
 */
import type { FastifyBaseLogger } from "fastify";
import type { Db } from "../db/client";
import { smsLog } from "../db/schema";
import type { Env } from "../env";

export interface SmsSender {
  send(to: string, text: string, orgId?: string | null): Promise<boolean>;
}

const normalize = (to: string) => {
  const d = to.replace(/[^\d+]/g, "");
  return d.startsWith("+") ? d : d.startsWith("00") ? `+${d.slice(2)}` : `+221${d}`;
};

export function makeSms(env: Env, db: Db, log: FastifyBaseLogger): SmsSender {
  let token: { value: string; until: number } | null = null;

  async function orangeToken(): Promise<string> {
    if (token && Date.now() < token.until - 60_000) return token.value;
    const basic = Buffer.from(`${env.ORANGE_CLIENT_ID}:${env.ORANGE_CLIENT_SECRET}`).toString("base64");
    const r = await fetch("https://api.orange.com/oauth/v3/token", {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`jeton Orange refusé (${r.status})`);
    const j = (await r.json()) as { access_token: string; expires_in: number };
    token = { value: j.access_token, until: Date.now() + j.expires_in * 1000 };
    return token.value;
  }

  async function sendOrange(to: string, text: string) {
    const sender = `tel:+${env.ORANGE_SENDER}`;
    const r = await fetch(`https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(sender)}/requests`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await orangeToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ outboundSMSMessageRequest: { address: `tel:${to}`, senderAddress: sender, ...(env.ORANGE_SENDER_NAME ? { senderName: env.ORANGE_SENDER_NAME } : {}), outboundSMSTextMessage: { message: text } } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (r.status === 401) token = null;
    if (!r.ok) throw new Error(`envoi Orange refusé (${r.status})`);
  }

  return {
    async send(rawTo, text, orgId = null) {
      const to = normalize(rawTo);
      const body = text.length > 320 ? `${text.slice(0, 317)}…` : text;
      let delivered = true;
      let error: string | null = null;
      try {
        if (env.SMS_PROVIDER === "orange") await sendOrange(to, body);
        else log.info({ to, text: body }, "SMS (console)");
      } catch (e) {
        delivered = false;
        error = e instanceof Error ? e.message : String(e);
        log.warn({ to, err: error }, "échec d’envoi SMS");
      }
      await db.insert(smsLog).values({ orgId, to, text: body, provider: env.SMS_PROVIDER, delivered, error });
      return delivered;
    },
  };
}
