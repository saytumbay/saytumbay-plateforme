// Construit dist/server.js : le code de l'API et le paquet partagé sont regroupés,
// les dépendances npm restent externes (installées sur le serveur).
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const external = Object.keys(pkg.dependencies).filter((d) => !d.startsWith("@saytumbay/"));

await build({
  entryPoints: ["src/server.ts", "src/db/seed-cli.ts", "src/db/bootstrap-cli.ts"],
  outdir: "dist",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: true,
  external: [...external, "zod"],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: "info",
});
