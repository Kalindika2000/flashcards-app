import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.smoke.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "./coverage",
      include: [
        "lib/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "features/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.smoke.test.tsx",
        "**/types/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
