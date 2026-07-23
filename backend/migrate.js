const fs = require("node:fs/promises");
const path = require("node:path");
const { Pool } = require("pg");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
  quiet: true,
});

const migrationsPath = path.join(__dirname, "migrations");

async function getMigrationNames() {
  const entries = await fs.readdir(migrationsPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Add it to backend/.env before running migrations.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  let client;
  let transactionStarted = false;

  try {
    const migrationNames = await getMigrationNames();
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1)::bigint)",
      ["reporting-for-hsd:migrations"],
    );

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const appliedResult = await client.query("SELECT name FROM schema_migrations");
    const appliedNames = new Set(appliedResult.rows.map((row) => row.name));
    const pendingNames = migrationNames.filter((name) => !appliedNames.has(name));

    for (const migrationName of pendingNames) {
      const migrationPath = path.join(migrationsPath, migrationName);
      const sql = await fs.readFile(migrationPath, "utf8");

      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1)",
        [migrationName],
      );
    }

    await client.query("COMMIT");
    transactionStarted = false;

    if (pendingNames.length === 0) {
      console.log("No pending migrations.");
      return;
    }

    console.log(`Applied migrations: ${pendingNames.join(", ")}`);
  } catch (error) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Migration rollback failed:");
        console.error(rollbackError);
      }
    }

    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error("Database migration failed:");
  console.error(error);
  process.exitCode = 1;
});
