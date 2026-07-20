const { Pool } = require("pg");

async function connectDatabase(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl });
  await pool.query("SELECT 1");
  return pool;
}

module.exports = {
  connectDatabase,
};
