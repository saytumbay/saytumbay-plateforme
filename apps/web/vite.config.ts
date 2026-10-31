import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiMode = env.VITE_API_MODE ?? (mode === "api" ? "api" : "demo");
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
          description: "Surveiller ses parcelles et ses stocks, être prévenu à temps.",
          lang: "fr",
          start_url: "/app",
          scope: "/",
          display: "standalone",
          background_color: "#F4F7F5",
          theme_color: "#0F6B45",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest}"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          runtimeCaching: [
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
    ],
    server: {
      port: 5173,
      proxy: apiMode === "api" ? { "/api": { target: env.VITE_API_PROXY ?? "http://localhost:4000", changeOrigin: false } } : undefined,
    },
    build: {
      target: "es2022",
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router"],
            charts: ["recharts"],
            map: ["leaflet", "react-leaflet"],
            ui: ["radix-ui", "cmdk", "sonner", "motion"],
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
