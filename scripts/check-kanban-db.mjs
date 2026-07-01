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

function describeDatabaseTarget(connectionString) {
  try {
    const url = new URL(connectionString);
    const database = url.pathname.replace(/^\//, "") || "(default)";
    console.log(`Database target: ${url.hostname}/${database}`);
    console.log(
      "Ensure this matches Vercel Production DATABASE_URL (see docs/VERCEL_ENVIRONMENT_VARIABLES.md)."
    );
  } catch {
    console.log("Database target: (could not parse DATABASE_URL host)");
  }
}

loadEnvLocal();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set (check .env.local).");
  process.exit(1);
}

describeDatabaseTarget(connectionString);

const requiredTables = ["note_kanban_boards", "note_kanban_versions"];

const requiredBoardColumns = [
  "id",
  "note_id",
  "vault_id",
  "encrypted_board",
  "encrypted_wrapped_key",
  "board_encryption_version",
  "version_number",
  "created_at",
  "updated_at",
];

const requiredVersionColumns = [
  "id",
  "board_id",
  "note_id",
  "vault_id",
  "version_number",
  "encrypted_board",
  "encrypted_wrapped_key",
  "board_encryption_version",
  "created_at",
];

const sql = postgres(connectionString, { max: 1 });

async function assertColumns(tableName, requiredColumns) {
  const columns = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
  `;
  const columnNames = new Set(columns.map((row) => row.column_name));
  const missingColumns = requiredColumns.filter((name) => !columnNames.has(name));
  if (missingColumns.length > 0) {
    console.error(`Missing ${tableName} column(s):`, missingColumns.join(", "));
    console.error("Run: npm run db:migrate  (applies drizzle/0016_note_kanban.sql)");
    process.exit(1);
  }
  console.log(`${tableName} columns: OK`);
}

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

  await assertColumns("note_kanban_boards", requiredBoardColumns);
  await assertColumns("note_kanban_versions", requiredVersionColumns);

  await sql`
    SELECT id, note_id, vault_id, encrypted_board, encrypted_wrapped_key, board_encryption_version, version_number, created_at, updated_at
    FROM note_kanban_boards
    LIMIT 0
  `;
  await sql`
    SELECT id, board_id, note_id, vault_id, version_number, encrypted_board, encrypted_wrapped_key, board_encryption_version, created_at
    FROM note_kanban_versions
    LIMIT 0
  `;
  console.log("Kanban probe queries: OK");
} catch (error) {
  console.error("Kanban DB check failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
