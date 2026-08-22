const mysql = require("mysql2/promise");
const logger = require("./logger");

let pool;

function getPool() {
  if (!pool) {
    const url = process.env.TIDB_URL || process.env.DATABASE_URL;
    const common = {
      waitForConnections: true,
      connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: "Z",
      ssl: process.env.TIDB_SSL === "false" ? undefined : { rejectUnauthorized: false },
    };

    pool = url
      ? mysql.createPool(url)
      : mysql.createPool({
          host: process.env.TIDB_HOST || process.env.DB_HOST || "127.0.0.1",
          port: Number(process.env.TIDB_PORT || process.env.DB_PORT || 4000),
          user: process.env.TIDB_USER || process.env.DB_USERNAME || process.env.DB_USER,
          password: process.env.TIDB_PASSWORD || process.env.DB_PASSWORD,
          database: process.env.TIDB_DATABASE || process.env.DB_DATABASE || "vexatrade",
          ...common,
        });
  }
  return pool;
}

async function connectDB() {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS app_documents (
        id CHAR(36) NOT NULL,
        collection VARCHAR(64) NOT NULL,
        data JSON NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        PRIMARY KEY (id),
        INDEX idx_collection_created (collection, created_at),
        INDEX idx_collection_updated (collection, updated_at)
      ) ENGINE=InnoDB
    `);
    logger.info("TiDB MySQL connected and schema ready");
  } finally {
    conn.release();
  }
}

async function closeDB() {
  if (pool) await pool.end();
  pool = null;
}

module.exports = { connectDB, closeDB, getPool };
