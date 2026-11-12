import { MIN_VALUE, MAX_VALUE } from './constants';

/** Same rules as the server, so people get instant feedback. Returns { field: message }. */
export function validateReading({ date, slot, value }, today) {
  const errors = {};
  const text = String(value ?? '').trim();

  if (text === '') errors.value = 'Please enter a glucose value.';
  else if (!/^-?\d+$/.test(text) || Number(text) < MIN_VALUE || Number(text) > MAX_VALUE) {
    errors.value = `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`;
  }
  if (!slot) errors.slot = 'Please choose a time slot.';
  if (!date) errors.date = 'Please choose a date.';
  else if (date > today) errors.date = 'Date cannot be in the future.';
  return errors;
}

/** Display-only hint, not medical advice. */
export function rangeHint(value) {
  if (value < 70) return { text: 'Low', className: 'low' };
  if (value > 180) return { text: 'High', className: 'high' };
  return { text: 'In range', className: 'ok' };
}
