const { Pool, types } = require('pg');
const config = require('./config');

// Return DATE columns (OID 1082) as plain 'YYYY-MM-DD' strings.
// By default pg converts them to JS Date objects, which can shift the day
// depending on the server's timezone.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({ connectionString: config.databaseUrl });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
