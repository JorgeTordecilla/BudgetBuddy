import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt",
      devOptions: {
        enabled: false,
        type: "module"
      },
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "masked-icon.svg",
        "shortcut-expense.png",
        "shortcut-income.png"
      ],
      manifest: {
        name: "BudgetBuddy",
        short_name: "BudgetBuddy",
        description: "Tu asistente de presupuesto personal",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/app/transactions",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
        ],
        shortcuts: [
          {
            name: "Add expense",
            short_name: "Expense",
            url: "/app/transactions?action=new&type=expense",
            icons: [{ src: "shortcut-expense.png", sizes: "96x96", type: "image/png" }]
          },
          {
            name: "Add income",
            short_name: "Income",
            url: "/app/transactions?action=new&type=income",
            icons: [{ src: "shortcut-income.png", sizes: "96x96", type: "image/png" }]
          }
        ]
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
