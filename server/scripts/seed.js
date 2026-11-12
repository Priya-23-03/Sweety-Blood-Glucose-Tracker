// Creates a demo user with ~45 days of sample readings (covers this month and last month).
const bcrypt = require('bcrypt');
const db = require('../src/db');
const migrate = require('./migrate');
const { SLOT_KEYS } = require('../src/validation');
const { todayString } = require('../src/dates');

const DEMO = { name: 'Demo Patient', email: 'demo@sweety.app', password: 'Demo@1234' };

// Typical value for each slot; fasting is lowest, after-meal readings are higher.
const BASE = { morning: 105, after_breakfast: 150, after_lunch: 140, after_dinner: 135 };

// Small deterministic generator so the seed data is the same every run.
let state = 42;
const rand = () => {
  state = (state * 1664525 + 1013904223) % 4294967296;
  return state / 4294967296;
};

function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

async function seed() {
  await migrate();

  const hash = await bcrypt.hash(DEMO.password, 10);
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [DEMO.name, DEMO.email, hash]
  );
  const userId = rows[0].id;
  await db.query('DELETE FROM readings WHERE user_id = $1', [userId]);

  const today = todayString();
  let count = 0;
  for (let back = 0; back < 45; back += 1) {
    const date = addDays(today, -back);
    for (const slot of SLOT_KEYS) {
      if (rand() < 0.15) continue; // skip a few so days have 2-4 readings
      const value = Math.round(BASE[slot] + (rand() - 0.5) * 70);
      await db.query(
        'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)',
        [userId, date, slot, Math.min(Math.max(value, 55), 320)]
      );
      count += 1;
    }
  }
  console.log(`Seeded ${count} readings.`);
  console.log(`Log in with  ${DEMO.email}  /  ${DEMO.password}`);
}

seed()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => db.pool.end());
