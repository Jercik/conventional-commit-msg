import { coverageConfigDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxWorkers: 4,
    globals: true,
    environment: "node",
    testTimeout: 30_000,
    passWithNoTests: true,
    coverage: {
      reporter: ["text", "html"],
      exclude: ["bin/*", ...coverageConfigDefaults.exclude],
    },
  },
});
