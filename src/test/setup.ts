import { vi, beforeEach, afterEach, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "@/server/policies/rate-limit/in-memory-adapter";
import { setRateLimitAdapterForTests } from "@/server/policies/rate-limit";

expect.extend(toHaveNoViolations);

// Unmount React Testing Library trees after every test so DOM-heavy renders
// (Tiptap editor, notes pages) are released and memory does not accumulate
// across a worker's files. See vitest.config.ts for the worker heap size.
afterEach(() => {
  cleanup();
});

vi.mock("server-only", () => ({}));

// next/font is a Next build-time macro; stub it so layout modules import in Vitest.
vi.mock("next/font/google", () => ({
  Schibsted_Grotesk: () => ({ variable: "font-sans", className: "font-sans", style: {} }),
}));

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
}));

beforeEach(() => {
  resetAllInMemoryRateLimits();
  setRateLimitAdapterForTests(new InMemoryRateLimitAdapter());
  if (typeof localStorage !== "undefined" && typeof localStorage.clear === "function") {
    localStorage.clear();
  }
});

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://letters:letters_dev@localhost:5435/letters_to_god";
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "test-secret-for-vitest-only";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY =
  process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY ?? "test-two-factor-secret-encryption-key";
