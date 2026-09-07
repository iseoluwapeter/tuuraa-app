import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: ["favicon.svg", "apple-touch-icon.png", "masked-icon.svg"],

      manifest: {
        name: "Tuuraa",
        short_name: "Tuuraa",
        description: "Managed last-mile logistics",
        theme_color: "#0F3D2E",
        background_color: "#0F3D2E",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",

        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.includes("supabase.co"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api",
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
});
