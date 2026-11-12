const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validateReadingInput, checkDayRules, SLOT_KEYS, SLOTS } = require('../validation');
const { isValidDate } = require('../dates');

const router = express.Router();
router.use(requireAuth); // every query below is scoped to req.user.id

const COLUMNS = `id, reading_date AS date, slot, value`;
const SLOT_ORDER = `array_position(ARRAY['morning','after_breakfast','after_lunch','after_dinner'], slot)`;
const DUPLICATE_KEY = '23505';

const decorate = (r) => ({ ...r, slotLabel: SLOTS[r.slot] });

async function readingsOnDay(userId, date) {
  const { rows } = await db.query(
    'SELECT id, slot FROM readings WHERE user_id = $1 AND reading_date = $2',
    [userId, date]
  );
  return rows;
}

// GET /readings?page=1&limit=20[&date=YYYY-MM-DD]
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const params = [req.user.id];
    let where = 'user_id = $1';

    if (req.query.date) {
      if (!isValidDate(req.query.date)) return res.status(400).json({ error: 'Please enter a valid date.' });
      params.push(req.query.date);
      where += ` AND reading_date = $${params.length}`;
    }

    const total = await db.query(`SELECT COUNT(*)::int AS n FROM readings WHERE ${where}`, params);
    const { rows } = await db.query(
      `SELECT ${COLUMNS} FROM readings WHERE ${where}
       ORDER BY reading_date DESC, ${SLOT_ORDER}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ data: rows.map(decorate), page, limit, total: total.rows[0].n });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = validateReadingInput(req.body);
    if (result.error) return res.status(400).json({ error: result.error, field: result.field });
    const { date, slot, value } = result.data;

    const dayError = checkDayRules(await readingsOnDay(req.user.id, date), slot);
    if (dayError) return res.status(409).json({ error: dayError });

    const { rows } = await db.query(
      `INSERT INTO readings (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [req.user.id, date, slot, value]
    );
    res.status(201).json({ reading: decorate(rows[0]) });
  } catch (err) {
    if (err.code === DUPLICATE_KEY) {
      // Two requests raced past the check above; the DB constraint caught it.
      return res.status(409).json({ error: `You already have a reading for that slot on this date.` });
    }
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(404).json({ error: 'Reading not found.' });

    const current = await db.query('SELECT id FROM readings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (current.rowCount === 0) return res.status(404).json({ error: 'Reading not found.' });

    const result = validateReadingInput(req.body);
    if (result.error) return res.status(400).json({ error: result.error, field: result.field });
    const { date, slot, value } = result.data;

    const dayError = checkDayRules(await readingsOnDay(req.user.id, date), slot, id);
    if (dayError) return res.status(409).json({ error: dayError });

    const { rows } = await db.query(
      `UPDATE readings SET reading_date = $1, slot = $2, value = $3, updated_at = now()
       WHERE id = $4 AND user_id = $5 RETURNING ${COLUMNS}`,
      [date, slot, value, id, req.user.id]
    );
    res.json({ reading: decorate(rows[0]) });
  } catch (err) {
    if (err.code === DUPLICATE_KEY) {
      return res.status(409).json({ error: `You already have a reading for that slot on this date.` });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(404).json({ error: 'Reading not found.' });
    const { rowCount } = await db.query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Reading not found.' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.SLOT_KEYS = SLOT_KEYS;
