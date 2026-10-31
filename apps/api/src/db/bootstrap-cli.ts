/**
 * Amorçage d'une base de production.
 *
 *   node dist/db/bootstrap-cli.js admin  --email a@b.sn --prenom Mame --nom Sow --tel 771234567
 *   node dist/db/bootstrap-cli.js org    --nom "Coopérative de Thiès" --type cooperative --localite Mboro --region Thiès \
 *                                        --proprietaire-email awa@coop.sn --proprietaire-prenom Awa --proprietaire-nom Ndiaye --proprietaire-tel 774120833
 *
 * Un mot de passe provisoire aléatoire est affiché une seule fois ; la personne le change à la première connexion
 * (et active la double authentification, obligatoire pour la console).
 */
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { loadEnv } from "../env";
import { openDb } from "./client";
import { memberships, organizations, users } from "./schema";
import { hashPassword, randomToken } from "../lib/crypto";
import { makeRepos } from "../context";

const [cmd, ...rest] = process.argv.slice(2);
const args = new Map<string, string>();
for (let i = 0; i < rest.length; i += 2) if (rest[i]?.startsWith("--")) args.set(rest[i]!.slice(2), rest[i + 1] ?? "");
const need = (k: string) => {
  const v = args.get(k)?.trim();
  if (!v) {
    console.error(`Paramètre manquant : --${k}`);
    process.exit(1);
  }
  return v;
};
const phone = (p: string) => (p.startsWith("+") ? p : `+221${p.replace(/\s/g, "").replace(/^00221/, "")}`);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

const env = loadEnv();
const { db, close } = await openDb({ url: env.DATABASE_URL, pgliteDir: env.PGLITE_DIR });

async function createUser(email: string, firstName: string, lastName: string, tel: string, platformRole: "aucun" | "admin" | "support" = "aucun") {
  const exists = await db.execute<{ id: string }>(sql`select id from users where lower(email) = ${email.toLowerCase()}`);
  if (exists.rows[0]) return { id: exists.rows[0].id, password: null as string | null };
  const password = `${randomToken(12)}Aa1`;
  const id = `u-${randomUUID().slice(0, 10)}`;
  await db.insert(users).values({ id, email: email.toLowerCase(), firstName, lastName, phone: phone(tel), platformRole, passwordHash: await hashPassword(password) });
  return { id, password };
}

try {
  if (cmd === "admin") {
    const u = await createUser(need("email"), need("prenom"), need("nom"), need("tel"), args.get("role") === "support" ? "support" : "admin");
    console.log(u.password ? `Compte console créé (${u.id}).\nMot de passe provisoire, affiché une seule fois : ${u.password}\nÀ la première connexion : changer le mot de passe et activer la double authentification (Paramètres > Sécurité).` : "Ce compte existe déjà : rien n’a été modifié.");
  } else if (cmd === "org") {
    const name = need("nom");
    const id = `org-${slug(name)}`;
    const type = (args.get("type") ?? "cooperative") as "cooperative" | "gie" | "entreprise" | "exploitation";
    const modules = (args.get("modules") ?? "agritech").split(",").filter((m): m is "agritech" | "onion" => m === "agritech" || m === "onion");
    await db.insert(organizations).values({ id, name, type, locality: need("localite"), region: need("region"), plan: "essai", status: "essai", modules, trialEndsAt: new Date(Date.now() + 30 * 864e5) }).onConflictDoNothing();
    const o = await createUser(need("proprietaire-email"), need("proprietaire-prenom"), need("proprietaire-nom"), need("proprietaire-tel"));
    await db.insert(memberships).values({ userId: o.id, orgId: id, role: "proprietaire", parcels: "all", notify: { sms: true, email: true, push: true }, status: "actif" }).onConflictDoNothing();
    const repos = makeRepos(db);
    if (!(await repos.sites.list(id)).length) await repos.sites.insert(id, `site-${slug(name)}`, { id: `site-${slug(name)}`, orgId: id, name: args.get("site") ?? name, locality: need("localite"), center: [Number(args.get("lat") ?? 14.6928), Number(args.get("lng") ?? -17.4467)] });
    console.log(`Organisation ${id} créée (essai 30 jours, modules : ${modules.join(", ")}).` + (o.password ? `\nPropriétaire créé. Mot de passe provisoire, affiché une seule fois : ${o.password}` : "\nPropriétaire existant rattaché."));
  } else {
    console.log("Usage : bootstrap-cli.js admin|org --param valeur … (voir l'en-tête du fichier)");
    process.exitCode = 1;
  }
} finally {
  await close();
}
