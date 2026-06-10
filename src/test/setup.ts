import { vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db/transaction", () => ({
  runInTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
}));

process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://letters:letters_dev@localhost:5432/letters_to_god";
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "test-secret-for-vitest-only";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3001";
