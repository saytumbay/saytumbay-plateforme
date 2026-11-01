// Génère les visuels des réseaux sociaux aux couleurs de la charte v1.0 (avatar, bannières, 3 publications).
import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
// Racine du dépôt (ce script est dans brand/reseaux). Lancer : node brand/reseaux/generer.mjs
const ROOT = fileURLToPath(new URL("../../", import.meta.url)).replace(/\\/g, "/");
const require = createRequire(ROOT + "apps/web/package.json");
const { chromium } = require("@playwright/test");
const OUT = ROOT + "brand/reseaux/";
mkdirSync(OUT, { recursive: true });

const C = { vert: "#0F5A44", orange: "#EF6A22", sable: "#F4EFE6", nuit: "#0B2E24", ardoise: "#5B6660" };
const font = (p) => "data:font/woff2;base64," + readFileSync(ROOT + "node_modules/" + p).toString("base64");
const css = `
@font-face { font-family: Sora; src: url(${font("@fontsource-variable/sora/files/sora-latin-wght-normal.woff2")}) format("woff2"); font-weight: 100 800; }
@font-face { font-family: Plex; src: url(${font("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2")}) format("woff2"); font-weight: 500; }
* { margin: 0; box-sizing: border-box; }
body { font-family: Sora; -webkit-font-smoothing: antialiased; }
.mono { font-family: Plex; font-weight: 500; }
`;
// Signe complet (fond sombre : disque sable, orbite orange) et logo horizontal.
const sign = readFileSync(ROOT + "brand/logo/svg/signe_inverse.svg", "utf8").replace(/#2BD47D/gi, C.sable).replace(/#4FD8EF/gi, C.orange).replace(/<title>[^<]*<\/title>/, "").replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"');
const horiz = (word) => readFileSync(ROOT + "brand/logo/svg/horizontal_inverse.svg", "utf8").replace(/#2BD47D/gi, C.sable).replace(/#4FD8EF/gi, C.orange).replace(/#FFFFFF/gi, word).replace(/<title>[^<]*<\/title>/, "").replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%" height="100%"');
// « Le tracé » : contour du signe, très grand, coupé par le bord.
const paths = readFileSync(ROOT + "apps/web/src/components/brand/paths.ts", "utf8");
const marks = JSON.parse(paths.match(/MARK_LAYERS[^=]*=\s*(\[.*?\]);/s)[1]);
const trace = (color, w) => `<svg viewBox="-3.5 1 120.5 124" fill="none" style="position:absolute;${w}">${marks.map((m) => `<path d="${m.d}" stroke="${color}" stroke-width="0.55" stroke-linejoin="round"/>`).join("")}</svg>`;

const pages = {
  "avatar-saytumbay.png": [800, 800, `<div style="width:800px;height:800px;background:${C.vert};display:flex;align-items:center;justify-content:center"><div style="width:520px;height:520px">${sign}</div></div>`],
  "linkedin-banniere.png": [1128, 191, `<div style="position:relative;overflow:hidden;width:1128px;height:191px;background:${C.nuit};color:${C.sable}">
      ${trace(C.orange, "right:-250px;top:-220px;width:560px;opacity:.9")}
      <div style="position:absolute;left:250px;top:44px">
        <p style="font-size:38px;font-weight:700;letter-spacing:-0.03em;line-height:1.05">Voir la perte avant qu’elle arrive.</p>
        <p class="mono" style="margin-top:14px;font-size:15px;color:#c9cec5;display:flex;gap:10px;align-items:center"><span style="width:9px;height:9px;border-radius:50%;background:${C.orange}"></span>Capteurs · Alertes SMS · Agriculture et stockage · Dakar</p>
      </div></div>`],
  "x-banniere.png": [1500, 500, `<div style="position:relative;overflow:hidden;width:1500px;height:500px;background:${C.nuit};color:${C.sable}">
      ${trace(C.orange, "right:-470px;top:-300px;width:1040px;opacity:.9")}
      <div style="position:absolute;left:430px;top:130px;width:620px">
        <p style="font-size:62px;font-weight:700;letter-spacing:-0.035em;line-height:1.02">Voir la perte avant qu’elle arrive.</p>
        <p class="mono" style="margin-top:22px;font-size:20px;white-space:nowrap;color:#c9cec5;display:flex;gap:12px;align-items:center"><span style="width:11px;height:11px;border-radius:50%;background:${C.orange}"></span>Capteurs connectés · Alertes SMS · Dakar, Sénégal</p>
      </div></div>`],
  "post-1-lancement.png": [1080, 1350, `<div style="position:relative;overflow:hidden;width:1080px;height:1350px;background:${C.vert};color:${C.sable};padding:90px">
      ${trace(C.orange, "right:-400px;bottom:-560px;width:980px;opacity:.95")}
      <div style="width:360px;height:78px">${horiz(C.sable)}</div>
      <p style="margin-top:250px;font-size:108px;font-weight:700;letter-spacing:-0.04em;line-height:0.98">Voir la perte avant qu’elle arrive.</p>
      <p style="margin-top:44px;font-size:34px;line-height:1.4;max-width:820px;color:#dfe6dc">Des capteurs dans le sol et dans les magasins. Une alerte SMS au bon moment, avec quoi faire.</p>
      <p class="mono" style="position:absolute;left:90px;bottom:84px;font-size:24px;color:#dfe6dc">saytumbay.com</p></div>`],
  "post-2-satellite.png": [1080, 1350, `<div style="position:relative;overflow:hidden;width:1080px;height:1350px;background:${C.sable};color:${C.nuit};padding:90px">
      <p class="mono" style="font-size:24px;letter-spacing:.12em;text-transform:uppercase;color:${C.vert}">Satellite et capteurs</p>
      <p style="margin-top:60px;font-size:84px;font-weight:700;letter-spacing:-0.035em;line-height:1.02">Le satellite voit vos champs d’en haut.</p>
      <p style="margin-top:28px;font-size:84px;font-weight:700;letter-spacing:-0.035em;line-height:1.02;color:${C.vert}">Nos capteurs voient ce qu’il ne voit pas.</p>
      <div style="margin-top:70px;border-left:8px solid ${C.orange};padding-left:30px;font-size:34px;line-height:1.45;color:#3c4a44">L’eau sous la surface, là où sont les racines.<br>Le cœur des sacs, dans le magasin.</div>
      <div style="position:absolute;left:90px;bottom:84px;width:300px;height:65px">${horiz(C.nuit).replace(new RegExp(C.sable, "gi"), C.vert)}</div></div>`],
  "post-3-coc2026.png": [1080, 1350, `<div style="position:relative;overflow:hidden;width:1080px;height:1350px;background:${C.nuit};color:${C.sable};padding:90px">
      ${trace(C.orange, "left:-380px;top:-520px;width:900px;opacity:.75")}
      <p class="mono" style="margin-top:330px;font-size:24px;letter-spacing:.12em;text-transform:uppercase;color:${C.orange}">Publication scientifique</p>
      <p style="margin-top:34px;font-size:76px;font-weight:700;letter-spacing:-0.035em;line-height:1.04">Présenté et publié au colloque COC’2026.</p>
      <p style="margin-top:40px;font-size:32px;line-height:1.45;color:#c9cec5">« SaytuMbay : une plateforme IoT-IA pour l’agriculture de précision au Sénégal ». IUT de l’Université Iba Der Thiam, Thiès, 25-26 mars 2026.</p>
      <p class="mono" style="margin-top:44px;font-size:26px;color:${C.sable}">hal.science/hal-05571878</p>
      <div style="position:absolute;left:90px;bottom:84px;width:300px;height:65px">${horiz(C.sable)}</div></div>`],
};

const b = await chromium.launch();
const p = await b.newPage();
for (const [file, [w, h, html]] of Object.entries(pages)) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(`<html><head><style>${css}</style></head><body>${html}</body></html>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: OUT + file });
  console.log(file);
}
await b.close();
