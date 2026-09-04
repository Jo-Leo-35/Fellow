import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const htmlEntry = (name: string) => fileURLToPath(new URL(name, import.meta.url));

export default defineConfig({
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
});
