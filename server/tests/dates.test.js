const { isValidDate, isFuture, reportRanges, todayString } = require('../src/dates');

describe('isValidDate', () => {
  test.each(['2026-10-15', '2024-02-29'])('accepts %s', (d) => expect(isValidDate(d)).toBe(true));
  test.each(['2026-02-30', '2026-13-01', '15-10-2026', '', null, undefined, '2026-1-5'])(
    'rejects %s', (d) => expect(isValidDate(d)).toBe(false)
  );
});

describe('isFuture / todayString', () => {
  test('compares ISO strings', () => {
    expect(isFuture('2026-10-16', '2026-10-15')).toBe(true);
    expect(isFuture('2026-10-15', '2026-10-15')).toBe(false);
    expect(isFuture('2026-10-14', '2026-10-15')).toBe(false);
  });
  test('todayString formats local date with zero padding', () => {
    expect(todayString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('reportRanges', () => {
  test('example from the brief: 15 Oct 2026', () => {
    expect(reportRanges('2026-10-15')).toEqual({
      daily: { from: '2026-10-15', to: '2026-10-15' },
      monthToDate: { from: '2026-10-01', to: '2026-10-15' },
      monthly: { from: '2026-09-01', to: '2026-09-30' },
    });
  });
  test('January looks back to December of the previous year', () => {
    expect(reportRanges('2026-01-10').monthly).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });
  test('previous month length is right for February and leap years', () => {
    expect(reportRanges('2026-03-05').monthly.to).toBe('2026-02-28');
    expect(reportRanges('2024-03-05').monthly.to).toBe('2024-02-29');
  });
  test('selected date on the 1st gives a one-day month-to-date', () => {
    expect(reportRanges('2026-10-01').monthToDate).toEqual({ from: '2026-10-01', to: '2026-10-01' });
  });
  test('throws on an invalid date', () => {
    expect(() => reportRanges('nope')).toThrow();
  });
});
