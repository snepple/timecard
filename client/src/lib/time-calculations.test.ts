import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateHours,
  populateWeekDates,
  formatTimeFor24Hour,
  formatHoursAsDecimal
} from './time-calculations.ts';

describe('time-calculations', () => {
  describe('calculateHours', () => {
    test('calculates normal daytime shift', () => {
      assert.strictEqual(calculateHours('09:00', '17:00'), 8);
    });

    test('calculates shift starting at 07:00 base', () => {
      assert.strictEqual(calculateHours('07:00', '15:00'), 8);
    });

    test('calculates shift crossing midnight', () => {
      // 10 PM to 2 AM
      assert.strictEqual(calculateHours('22:00', '02:00'), 4);
    });

    test('calculates shift with decimal hours', () => {
      // 8:00 to 8:45
      assert.strictEqual(calculateHours('08:00', '08:45'), 0.75);
    });

    test('returns 0 for same start and end time', () => {
      assert.strictEqual(calculateHours('09:00', '09:00'), 0);
    });

    test('returns 0 for end time before start time', () => {
      // 5 PM to 9 AM is invalid because 9 AM is considered after 5 PM in 7-7 range
      // Wait, 09:00 is after 07:00. 17:00 is after 07:00.
      // timeToMinutes('17:00') = (17-7)*60 = 600
      // timeToMinutes('09:00') = (9-7)*60 = 120
      // endMinutes (120) < startMinutes (600) -> returns 0
      assert.strictEqual(calculateHours('17:00', '09:00'), 0);
    });

    test('returns 0 for missing inputs', () => {
      assert.strictEqual(calculateHours('', '17:00'), 0);
      assert.strictEqual(calculateHours('09:00', ''), 0);
    });

    test('calculates maximum possible shift', () => {
      // 07:00 to 06:59 (next day)
      assert.strictEqual(calculateHours('07:00', '06:59'), 23.98);
    });
  });

  describe('populateWeekDates', () => {
    test('generates 7 days ending on Saturday', () => {
      const weekEnding = '2024-05-25'; // A Saturday
      const dates = populateWeekDates(weekEnding);
      assert.strictEqual(dates.length, 7);
      assert.strictEqual(dates[0], '2024-05-19'); // Sunday
      assert.strictEqual(dates[6], '2024-05-25'); // Saturday
    });
  });

  describe('formatTimeFor24Hour', () => {
    test('removes colon from time string', () => {
      assert.strictEqual(formatTimeFor24Hour('13:30'), '1330');
      assert.strictEqual(formatTimeFor24Hour('09:15'), '0915');
    });

    test('returns empty string for empty input', () => {
      assert.strictEqual(formatTimeFor24Hour(''), '');
    });
  });

  describe('formatHoursAsDecimal', () => {
    test('formats to 2 decimal places', () => {
      assert.strictEqual(formatHoursAsDecimal(8), '8.00');
      assert.strictEqual(formatHoursAsDecimal(7.5), '7.50');
      assert.strictEqual(formatHoursAsDecimal(0.753), '0.75');
    });
  });
});
