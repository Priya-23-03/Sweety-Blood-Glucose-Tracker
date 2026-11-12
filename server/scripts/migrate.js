// Creates the tables (safe to run more than once).
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await db.query(sql);
}

if (require.main === module) {
  migrate()
    .then(() => console.log('Database tables are ready.'))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => db.pool.end());
}

module.exports = migrate;
