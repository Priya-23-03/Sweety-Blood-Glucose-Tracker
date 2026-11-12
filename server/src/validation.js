const { isValidDate, isFuture, todayString } = require('./dates');

const SLOTS = {
  morning: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};
const SLOT_KEYS = Object.keys(SLOTS);
const MIN_VALUE = 40;
const MAX_VALUE = 600;
const MAX_PER_DAY = 4;

const RANGE_MESSAGE = `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`;

/**
 * Parse a glucose value. Accepts numbers or numeric strings.
 * Returns { value } on success or { error } on failure.
 */
function parseValue(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { error: 'Please enter a glucose value.' };
  }
  const text = String(raw).trim();
  // Whole numbers only: "120" is fine; "120.5", "1e2" and "abc" are not.
  if (!/^-?\d+$/.test(text)) return { error: RANGE_MESSAGE };
  const value = Number(text);
  if (value < MIN_VALUE || value > MAX_VALUE) return { error: RANGE_MESSAGE };
  return { value };
}

/**
 * Checks that do not need the database.
 * Returns { data: { date, slot, value } } or { error, field }.
 */
function validateReadingInput({ date, slot, value } = {}, today = todayString()) {
  const parsed = parseValue(value);
  if (parsed.error) return { error: parsed.error, field: 'value' };

  if (!SLOT_KEYS.includes(slot)) {
    return { error: 'Please choose a time slot.', field: 'slot' };
  }

  if (!date) return { error: 'Please choose a date.', field: 'date' };
  if (!isValidDate(date)) return { error: 'Please enter a valid date.', field: 'date' };
  if (isFuture(date, today)) return { error: 'Date cannot be in the future.', field: 'date' };

  return { data: { date, slot, value: parsed.value } };
}

/**
 * Checks against the readings already saved for that day.
 * `existing` = [{ id, slot }]; `ignoreId` lets an edit skip the reading being edited.
 * Returns an error message or null.
 */
function checkDayRules(existing, slot, ignoreId = null) {
  const others = existing.filter((r) => r.id !== ignoreId);
  if (others.some((r) => r.slot === slot)) {
    const label = SLOTS[slot];
    const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
    return `You already have ${article} ${label} reading for this date.`;
  }
  if (others.length >= MAX_PER_DAY) {
    return `You can add only ${MAX_PER_DAY} readings per day.`;
  }
  return null;
}

module.exports = {
  SLOTS, SLOT_KEYS, MIN_VALUE, MAX_VALUE, MAX_PER_DAY,
  parseValue, validateReadingInput, checkDayRules,
};
