import { defineConfig } from "vitest/config";

// Pure-logic tests (calc.ts, format.ts) — no React plugin needed, which also
// avoids a Vite-version type clash between vitest's bundled Vite and the app's.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
