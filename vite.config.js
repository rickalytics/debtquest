import { defineConfig, loadEnv } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (mode === "ios" && !["local", "cloud"].includes(env.VITE_DATA_MODE))
    throw new Error(
      "Set VITE_DATA_MODE=local or cloud in .env.ios.local before building iOS.",
    );
  if (
    env.VITE_DATA_MODE === "cloud" &&
    (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)
  )
    throw new Error(
      "Cloud mode requires both Supabase public configuration values.",
    );
  const key = env.VITE_SUPABASE_ANON_KEY || "";
  let role;
  try {
    role = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString(),
    ).role;
  } catch {}
  if (role === "service_role" || key.startsWith("sb_secret_"))
    throw new Error(
      "A Supabase server secret cannot be used in a client build. Use the public key.",
    );
  return {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            data: ["dexie", "@supabase/supabase-js"],
          },
        },
        input: {
          main: resolve("index.html"),
          privacy: resolve("privacy.html"),
          support: resolve("support.html"),
        },
      },
    },
    plugins: [
      react(),
      ...(mode === "ios"
        ? []
        : [
            VitePWA({
              registerType: "autoUpdate",
              includeAssets: ["favicon.svg", "apple-touch-icon.png"],
              manifest: {
                name: "DebtQuest — A little closer. Together.",
                short_name: "DebtQuest",
                description:
                  "Private circles, small daily wins, and a little more financial freedom.",
                theme_color: "#faf9f5",
                background_color: "#faf9f5",
                display: "standalone",
                orientation: "portrait",
                scope: "/",
                start_url: "/",
                icons: [
                  {
                    src: "pwa-192x192.png",
                    sizes: "192x192",
                    type: "image/png",
                  },
                  {
                    src: "pwa-512x512.png",
                    sizes: "512x512",
                    type: "image/png",
                  },
                  {
                    src: "pwa-512x512.png",
                    sizes: "512x512",
                    type: "image/png",
                    purpose: "any maskable",
                  },
                ],
              },
              workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
              },
            }),
          ]),
    ],
  };
});
