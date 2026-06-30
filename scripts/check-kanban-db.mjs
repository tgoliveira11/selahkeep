import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";

function loadEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set (check .env.local).");
  process.exit(1);
}

const requiredTables = ["note_kanban_boards", "note_kanban_versions"];

const sql = postgres(connectionString, { max: 1 });

try {
  await sql`SELECT 1`;
  console.log("PostgreSQL connection: OK");

  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY(${requiredTables})
  `;
  const tableNames = new Set(tables.map((row) => row.table_name));
  const missingTables = requiredTables.filter((name) => !tableNames.has(name));
  if (missingTables.length > 0) {
    console.error("Missing kanban table(s):", missingTables.join(", "));
    console.error("Run: npm run db:migrate  (applies drizzle/0016_note_kanban.sql)");
    process.exit(1);
  }
  console.log("Kanban tables: OK");
} catch (error) {
  console.error("Kanban DB check failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
