import { SECURITY_HEADERS } from "./security-headers";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import fs from "node:fs";

/** Sur Vercel (variable VERCEL), le site est écrit dans .vercel/output/static (voir build.outDir) ; ce module y ajoute
 *  la configuration de Vercel : en-têtes de sécurité tirés de security-headers.ts, cache, routes de l'application.
 *  L'adresse vercel.app n'est pas indexée (noindex) : elle ne doit pas concurrencer saytumbay.com. */
function vercelOutput(): Plugin {
  const noCache = { "Cache-Control": "no-cache" };
  return {
    name: "saytumbay-vercel-output",
    apply: "build",
    closeBundle() {
      if (!process.env.VERCEL) return;
      const routes = [
        { src: "/(.*)", headers: { ...SECURITY_HEADERS, "Strict-Transport-Security": "max-age=63072000; includeSubDomains", "X-Robots-Tag": "noindex" }, continue: true },
        { src: "/assets/(.*)", headers: { "Cache-Control": "public, max-age=31536000, immutable" }, continue: true },
        { src: "/(index\\.html|sw\\.js|registerSW\\.js|manifest\\.webmanifest)", headers: noCache, continue: true },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html", headers: noCache },
      ];
      fs.writeFileSync(path.resolve(__dirname, ".vercel/output/config.json"), JSON.stringify({ version: 3, routes }, null, 2));
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Développement : démo dans le navigateur. `vite build` (production) : vraie API. `--mode demo` : démo statique.
  const apiMode = env.VITE_API_MODE ?? (mode === "api" || mode === "production" ? "api" : "demo");
  return {
    define: { "import.meta.env.VITE_API_MODE": JSON.stringify(apiMode) },
    resolve: { alias: { "@": path.resolve(__dirname, "src") } },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "prompt",
        injectRegister: false,
        includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon.png", "robots.txt"],
        manifest: {
          name: "SaytuMbay",
          short_name: "SaytuMbay",
          description: "Capteurs de sol et de stockage, alertes SMS et tableau de bord.",
          lang: "fr",
          start_url: "/app",
          scope: "/",
          display: "standalone",
          background_color: "#F4EFE6",
          theme_color: "#0F5A44",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          // Pré-cache limité à la coquille (~200 Ko compressés) : sur une connexion mobile, on ne télécharge pas
          // d'avance les graphiques, la carte ou la console. Les autres morceaux sont mis en cache à la première visite.
          globPatterns: ["index.html", "assets/index-*.{js,css}", "assets/react-*.js", "assets/ui-*.js", "assets/*.woff2", "favicon.svg", "icons/icon-192.png"],
          maximumFileSizeToCacheInBytes: 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: { cacheName: "morceaux-appli", expiration: { maxEntries: 150, maxAgeSeconds: 60 * 24 * 3600 } },
            },
            {
              urlPattern: ({ url }) => url.hostname.endsWith("arcgisonline.com") || url.hostname.endsWith("tile.openstreetmap.org"),
              handler: "CacheFirst",
              options: { cacheName: "tuiles-carte", expiration: { maxEntries: 400, maxAgeSeconds: 30 * 24 * 3600 } },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/auth"),
              handler: "NetworkFirst",
              method: "GET",
              options: { cacheName: "api-lecture", networkTimeoutSeconds: 6, expiration: { maxEntries: 200, maxAgeSeconds: 24 * 3600 } },
            },
          ],
        },
      }),
      vercelOutput(),
    ],
    preview: { headers: SECURITY_HEADERS },
    server: {
      port: 5173,
      proxy: apiMode === "api" ? { "/api": { target: env.VITE_API_PROXY ?? "http://localhost:4000", changeOrigin: false } } : undefined,
    },
    build: {
      // Sur Vercel : sortie au format « Build Output API », complétée par vercelOutput().
      outDir: process.env.VERCEL ? ".vercel/output/static" : "dist",
      target: "es2022",
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/node_modules\/(react|react-dom|scheduler|react-router)\//.test(id)) return "react";
            if (/node_modules\/(recharts|d3-|victory-vendor|decimal\.js|eventemitter3|immer|reselect|@reduxjs|react-redux)/.test(id)) return "charts";
            if (/node_modules\/(leaflet|react-leaflet|@react-leaflet)\//.test(id)) return "map";
            if (/node_modules\/(radix-ui|@radix-ui|cmdk|sonner|@floating-ui|react-remove-scroll|aria-hidden|use-sidecar|use-callback-ref|tslib)/.test(id)) return "ui";
            return undefined;
          },
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
