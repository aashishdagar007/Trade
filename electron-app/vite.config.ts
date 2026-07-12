// electron-app/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  root:    resolve(__dirname, "renderer"),
  plugins: [react()],
  base:    "./",
  build: {
    outDir:      resolve(__dirname, "renderer/dist"),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
  },
});
