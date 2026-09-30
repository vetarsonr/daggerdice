import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

const githubPagesBase = "/daggerdice/";

export default defineConfig({
  base: "/daggerdice/",
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
