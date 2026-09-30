import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const githubPagesBase = "/owlbear-rodeo-dh-dice/";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? (process.env.GITHUB_ACTIONS ? githubPagesBase : "/"),
  plugins: [vue()],
  server: {
    cors: true,
  },
  build: {
    rollupOptions: {
      input: {
        action: fileURLToPath(new URL("./index.html", import.meta.url)),
        background: fileURLToPath(new URL("./background.html", import.meta.url)),
        overlay: fileURLToPath(new URL("./overlay.html", import.meta.url)),
        result: fileURLToPath(new URL("./result.html", import.meta.url)),
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
