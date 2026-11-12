const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { reportRanges, isValidDate, isFuture } = require('../dates');
const { SLOTS } = require('../validation');

const router = express.Router();
router.use(requireAuth);

/** highest / lowest / average (1 decimal) / count for one date range. */
async function statsFor(userId, from, to) {
  const { rows } = await db.query(
    `SELECT MAX(value) AS highest,
            MIN(value) AS lowest,
            ROUND(AVG(value), 1) AS average,
            COUNT(*)::int AS count
       FROM readings
      WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  const r = rows[0];
  if (r.count === 0) return { count: 0, highest: null, lowest: null, average: null };
  return { count: r.count, highest: r.highest, lowest: r.lowest, average: Number(r.average) };
}

function parseDate(req, res) {
  const date = req.query.date;
  if (!date || !isValidDate(date)) {
    res.status(400).json({ error: 'Please choose a valid date (YYYY-MM-DD).' });
    return null;
  }
  return date;
}

function buildHandler(kind) {
  return async (req, res, next) => {
    try {
      const date = parseDate(req, res);
      if (!date) return;
      const range = reportRanges(date)[kind];
      const stats = await statsFor(req.user.id, range.from, range.to);
      const body = { type: kind, selectedDate: date, range, stats };

      if (kind === 'daily') {
        const { rows } = await db.query(
          `SELECT id, slot, value FROM readings
            WHERE user_id = $1 AND reading_date = $2
            ORDER BY array_position(ARRAY['morning','after_breakfast','after_lunch','after_dinner'], slot)`,
          [req.user.id, date]
        );
        body.readings = rows.map((r) => ({ ...r, slotLabel: SLOTS[r.slot] }));
      }
      res.json(body);
    } catch (err) {
      next(err);
    }
  };
}

router.get('/daily', buildHandler('daily'));
router.get('/month-to-date', buildHandler('monthToDate'));
router.get('/monthly', buildHandler('monthly'));

module.exports = router;
