import path from "path";
import { defineConfig } from "vitest/config";

const SETUP_FILES = ["./src/test/setup.ts"];

const coverageInclude = [
  "src/modules/**/*.ts",
  "src/modules/**/*.tsx",
  "src/lib/crypto-client/**/*.ts",
  "src/lib/api-client/**/*.ts",
  "src/lib/validation/**/*.ts",
  "src/lib/api-helpers.ts",
  "src/lib/db/transaction.ts",
  "src/features/passkey/**/*.ts",
  "src/app/api/**/*.ts",
];

const coverageExclude = [
  "src/test/**",
  "src/types/**",
  "src/lib/db/schema.ts",
  "src/lib/db/index.ts",
  "src/lib/crypto-client/index.ts",
  "src/modules/**/repositories/**",
  "src/modules/**/index.ts",
  "src/modules/**/server.ts",
  "src/modules/ui/components/**",
  "src/modules/ui/primitives/confirm-dialog.tsx",
  "src/modules/ui/primitives/error-state.tsx",
  "src/modules/ui/primitives/form-field.tsx",
  "src/modules/ui/primitives/input.tsx",
  "src/modules/ui/primitives/page-header.tsx",
  "src/modules/ui/primitives/textarea.tsx",
  "src/modules/rate-limit/adapters/postgres-adapter.ts",
  "src/app/api/auth/[...nextauth]/route.ts",
  "**/*.d.ts",
];

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: false,
    deps: {
      inline: ["@tgoliveira/secure-auth"],
      optimizer: {
        ssr: {
          enabled: true,
          include: ["@tgoliveira/secure-auth", "@tgoliveira/vault-core", "hash-wasm"],
        },
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: coverageInclude,
      exclude: coverageExclude,
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 75,
        statements: 90,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          setupFiles: SETUP_FILES,
          include: ["src/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "happy-dom",
          setupFiles: SETUP_FILES,
          include: ["src/**/*.test.tsx"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/server": "next/server.js",
    },
  },
});
