import { vi, beforeEach, expect } from "vitest";
import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "jest-axe";
import {
  InMemoryRateLimitAdapter,
  resetAllInMemoryRateLimits,
} from "@/server/policies/rate-limit/in-memory-adapter";
import { setRateLimitAdapterForTests } from "@/server/policies/rate-limit";

expect.extend(toHaveNoViolations);

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
}));

beforeEach(() => {
  resetAllInMemoryRateLimits();
  setRateLimitAdapterForTests(new InMemoryRateLimitAdapter());
});

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://letters:letters_dev@localhost:5435/letters_to_god";
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "test-secret-for-vitest-only";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY =
  process.env.TWO_FACTOR_SECRET_ENCRYPTION_KEY ?? "test-two-factor-secret-encryption-key";
