require('dotenv').config();
const sql = require('mssql');
const fs  = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const config = {
  server: process.env.DB_SERVER,
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let poolPromise = null;
function getPool() {
  if (!poolPromise) poolPromise = sql.connect(config);
  return poolPromise;
}

async function initDb() {
  const file = fs.readFileSync(path.join(__dirname, 'sql', 'init.sql'), 'utf8');
  const batches = file.split(/^\s*GO\s*$/im).filter(b => b.trim());

  const pool = await sql.connect({ ...config, database: 'master' });
  for (const b of batches) await pool.request().batch(b);
  await pool.close();

  const p = await getPool();
  const users = await p.request().query(
    `SELECT Id, Login, Password FROM dbo.Users WHERE Password = 'PLACEHOLDER'`
  );
  const seeds = { admin: 'Admin123!', user: 'User123!' };
  for (const u of users.recordset) {
    const hash = await bcrypt.hash(seeds[u.Login] || 'changeme', 10);
    await p.request()
      .input('id', sql.Int, u.Id)
      .input('pwd', sql.NVarChar(255), hash)
      .query('UPDATE dbo.Users SET Password=@pwd WHERE Id=@id');
  }
  console.log('✅ БД инициализирована');
}

module.exports = { sql, getPool, initDb };

if (require.main === module && process.argv.includes('--init')) {
  initDb().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}