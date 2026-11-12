const { parseValue, validateReadingInput, checkDayRules } = require('../src/validation');

const TODAY = '2026-10-15';
const valid = { date: '2026-10-15', slot: 'morning', value: 110 };

describe('parseValue', () => {
  test.each([undefined, null, '', '   '])('requires a value (%p)', (v) => {
    expect(parseValue(v).error).toBe('Please enter a glucose value.');
  });
  test.each([39, 601, 0, -5, '39', '601'])('rejects out of range %p', (v) => {
    expect(parseValue(v).error).toBe('Value must be between 40 and 600 mg/dl.');
  });
  test.each([120.5, '120.5', 'abc', '1e2'])('rejects non-whole numbers %p', (v) => {
    expect(parseValue(v).error).toBe('Value must be between 40 and 600 mg/dl.');
  });
  test.each([[40, 40], [600, 600], ['125', 125]])('accepts %p', (input, expected) => {
    expect(parseValue(input).value).toBe(expected);
  });
});

describe('validateReadingInput', () => {
  test('accepts a valid reading and converts the value to a number', () => {
    expect(validateReadingInput({ ...valid, value: '110' }, TODAY).data).toEqual(valid);
  });
  test('rejects a future date', () => {
    const r = validateReadingInput({ ...valid, date: '2026-10-16' }, TODAY);
    expect(r.error).toBe('Date cannot be in the future.');
    expect(r.field).toBe('date');
  });
  test('allows today', () => {
    expect(validateReadingInput(valid, TODAY).error).toBeUndefined();
  });
  test('rejects an unknown slot and a missing date', () => {
    expect(validateReadingInput({ ...valid, slot: 'midnight' }, TODAY).field).toBe('slot');
    expect(validateReadingInput({ ...valid, date: '' }, TODAY).field).toBe('date');
  });
  test('reports the value error first', () => {
    expect(validateReadingInput({}, TODAY).error).toBe('Please enter a glucose value.');
  });
});

describe('checkDayRules', () => {
  const existing = [
    { id: 1, slot: 'morning' },
    { id: 2, slot: 'after_lunch' },
  ];
  test('allows a free slot', () => {
    expect(checkDayRules(existing, 'after_dinner')).toBeNull();
  });
  test('blocks a duplicate slot with the slot name in the message', () => {
    expect(checkDayRules(existing, 'after_lunch')).toBe('You already have an After lunch reading for this date.');
    expect(checkDayRules(existing, 'morning')).toBe('You already have a Morning (fasting) reading for this date.');
  });
  test('editing a reading does not clash with itself', () => {
    expect(checkDayRules(existing, 'after_lunch', 2)).toBeNull();
  });
  test('blocks a 5th reading in a day', () => {
    const full = [1, 2, 3, 4].map((id) => ({ id, slot: `other_${id}` }));
    expect(checkDayRules(full, 'after_dinner')).toBe('You can add only 4 readings per day.');
  });
});
