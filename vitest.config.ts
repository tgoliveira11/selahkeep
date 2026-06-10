import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: [
        "src/lib/**/*.ts",
        "src/server/**/*.ts",
        "src/features/passkey/**/*.ts",
        "src/app/api/**/*.ts",
      ],
      exclude: [
        "src/test/**",
        "src/types/**",
        "src/lib/db/schema.ts",
        "src/lib/db/index.ts",
        "src/lib/auth/auth-options.ts",
        "src/lib/crypto-client/index.ts",
        "src/lib/auth/session.ts",
        "src/server/repositories/**",
        "src/server/policies/rate-limit/postgres-adapter.ts",
        "src/app/api/auth/[...nextauth]/route.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 82,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
