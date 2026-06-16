import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules/**"],
    deps: {
      // Inline `@tgoliveira/secure-auth` so Vitest/Vite can resolve `next/server`
      // subpath imports correctly from the package's ESM dist.
      inline: ["@tgoliveira/secure-auth"],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: [
        "src/modules/**/*.ts",
        "src/modules/**/*.tsx",
        "src/lib/crypto-client/**/*.ts",
        "src/lib/api-client/**/*.ts",
        "src/lib/validation/**/*.ts",
        "src/lib/api-helpers.ts",
        "src/lib/db/transaction.ts",
        "src/features/passkey/**/*.ts",
        "src/app/api/**/*.ts",
      ],
      exclude: [
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
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 75,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `@tgoliveira/secure-auth` imports `next/server` from its published ESM dist.
      // Vitest's resolver (Node ESM) may not add the `.js` extension for subpath imports,
      // so we alias to the concrete module file to keep tests hermetic.
      "next/server": "next/server.js",
    },
  },
});
