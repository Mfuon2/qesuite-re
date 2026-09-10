import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import packageJson from "./package.json" with { type: "json" };

const buildVersion = `${packageJson.version}-${Date.now()}`;

export default defineConfig({
  plugins: [react(), cloudflare()],
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion)
  },
  server: {
    host: true
  }
});
