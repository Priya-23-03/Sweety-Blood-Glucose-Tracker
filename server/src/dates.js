// Date helpers that work only with 'YYYY-MM-DD' strings.
// We avoid local-time Date objects so a reading can never slip to a different day.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n) => String(n).padStart(2, '0');
const fmt = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** True only for real calendar dates in YYYY-MM-DD form (rejects 2026-02-30). */
function isValidDate(str) {
  if (typeof str !== 'string') return false;
  const match = DATE_RE.exec(str);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Today's date in the server's local timezone as YYYY-MM-DD. */
function todayString(now = new Date()) {
  return fmt(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** ISO date strings compare correctly with normal string comparison. */
function isFuture(dateStr, today = todayString()) {
  return dateStr > today;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate(); // month is 1-12
}

/**
 * Date ranges for the three reports, given the selected date.
 *  daily        -> the selected date
 *  monthToDate  -> 1st of that month .. selected date
 *  monthly      -> the whole previous month (handles January -> December)
 */
function reportRanges(dateStr) {
  if (!isValidDate(dateStr)) throw new Error('Invalid date');
  const [y, m] = dateStr.split('-').map(Number);

  const prevYear = m === 1 ? y - 1 : y;
  const prevMonth = m === 1 ? 12 : m - 1;

  return {
    daily: { from: dateStr, to: dateStr },
    monthToDate: { from: fmt(y, m, 1), to: dateStr },
    monthly: {
      from: fmt(prevYear, prevMonth, 1),
      to: fmt(prevYear, prevMonth, daysInMonth(prevYear, prevMonth)),
    },
  };
}

module.exports = { isValidDate, todayString, isFuture, daysInMonth, reportRanges };
