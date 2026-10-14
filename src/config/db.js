const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

console.log('DB config:', {
  server: config.server,
  port: config.port,
  user: config.user,
  database: config.database,
  passwordSet: !!config.password,
});

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .then((pool) => {
        console.log('✅ SQL Server connected');
        return pool;
      })
      .catch((err) => {
        console.error('❌ SQL Server connection failed');
        console.error('   code:', err.code);
        console.error('   message:', err.message);
        poolPromise = null;
        throw err;
      });
  }
  return poolPromise;
}

// sanity check on boot
(async () => {
  try {
    await getPool();
  } catch (_) {}
})();

module.exports = { sql, getPool };