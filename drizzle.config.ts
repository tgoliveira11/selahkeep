import { defineConfig } from "drizzle-kit";
import { loadEnvFiles } from "./src/lib/load-env";

loadEnvFiles();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and set DATABASE_URL before running db:migrate."
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
