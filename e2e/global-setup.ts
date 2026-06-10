import { execSync } from "node:child_process";
import { loadEnvFiles } from "../src/lib/load-env";

export default async function globalSetup() {
  loadEnvFiles();

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local before running E2E tests."
    );
  }

  execSync("npm run db:migrate", {
    stdio: "inherit",
    env: process.env,
  });
}
