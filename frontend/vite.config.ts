import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const htmlEntry = (name: string) => fileURLToPath(new URL(name, import.meta.url));
const backendTarget = process.env.VITE_BACKEND_TARGET?.trim();
const localProxy = backendTarget
  ? {
      "/api": { target: backendTarget, changeOrigin: false },
      "/health": { target: backendTarget, changeOrigin: false },
      "/docs": { target: backendTarget, changeOrigin: false },
      "/openapi.json": { target: backendTarget, changeOrigin: false },
      "/redoc": { target: backendTarget, changeOrigin: false },
    }
  : undefined;

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  envDir: fileURLToPath(new URL("..", import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        home: htmlEntry("index.html"),
        learning: htmlEntry("learning-chat.html"),
        resourceChat: htmlEntry("resource-chat.html"),
        resources: htmlEntry("resources.html"),
        alerts: htmlEntry("alerts.html"),
        teacher: htmlEntry("teacher.html"),
        government: htmlEntry("government.html"),
      },
    },
  },
  // Used only by the localhost launcher. Docker keeps using nginx for proxying.
  server: { proxy: localProxy },
  preview: { proxy: localProxy },
});
