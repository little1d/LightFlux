import { describe, expect, it } from 'vitest';

import { Milestone } from '../types/todo';
import {
  getMilestoneOccurrence,
  getUpcomingMilestoneOccurrences,
  isValidMilestoneDateRule,
  milestoneOccursOn,
} from '../utils/milestoneDate';

const milestone = (
  overrides: Partial<Milestone> = {},
): Milestone => ({
  id: 'milestone',
  title: 'Milestone',
  type: 'anniversary',
  dateRule: {
    calendar: 'solar',
    year: null,
    month: 8,
    day: 10,
    leapDayPolicy: 'feb-28',
  },
  startYear: null,
  reminderOffsets: [],
  notes: '',
  icon: 'heart-outline',
  color: '#6759E8',
  pinned: false,
  archivedAt: null,
  trashedAt: null,
  createdAt: 1,
  updatedAt: 1,
  revision: 1,
  ...overrides,
});

describe('milestone date calculation', () => {
  it('uses the configured fallback for February 29', () => {
    const february = milestone({
      dateRule: {
        calendar: 'solar',
        year: null,
        month: 2,
        day: 29,
        leapDayPolicy: 'feb-28',
      },
    });
    const march = milestone({
      dateRule: {
        calendar: 'solar',
        year: null,
        month: 2,
        day: 29,
        leapDayPolicy: 'mar-1',
      },
    });

    expect(
      getMilestoneOccurrence(february, new Date(2025, 0, 1))?.dateKey,
    ).toBe('2025-02-28');
    expect(
      getMilestoneOccurrence(march, new Date(2025, 0, 1))?.dateKey,
    ).toBe('2025-03-01');
  });

  it('calculates a recurring lunar date', () => {
    const lunarNewYear = milestone({
      type: 'holiday',
      dateRule: {
        calendar: 'lunar',
        year: null,
        month: 1,
        day: 1,
        isLeapMonth: false,
        missingLeapMonthPolicy: 'regular-month',
      },
    });

    expect(
      getMilestoneOccurrence(lunarNewYear, new Date(2026, 0, 1))?.dateKey,
    ).toBe('2026-02-17');
    expect(milestoneOccursOn(lunarNewYear, '2026-02-17')).toBe(true);
  });

  it('supports leap lunar months and regular-month fallback', () => {
    const leapMonth = milestone({
      dateRule: {
        calendar: 'lunar',
        year: null,
        month: 6,
        day: 1,
        isLeapMonth: true,
        missingLeapMonthPolicy: 'regular-month',
      },
    });

    expect(
      getMilestoneOccurrence(leapMonth, new Date(2025, 6, 1))?.dateKey,
    ).toBe('2025-07-25');
    expect(
      getMilestoneOccurrence(leapMonth, new Date(2026, 0, 1)),
    ).not.toBeNull();
  });

  it('accepts recurring leap months outside 2025 and searches the full range', () => {
    const leapFebruary = milestone({
      dateRule: {
        calendar: 'lunar',
        year: null,
        month: 2,
        day: 1,
        isLeapMonth: true,
        missingLeapMonthPolicy: 'skip-year',
      },
    });

    expect(isValidMilestoneDateRule(leapFebruary.dateRule)).toBe(true);
    expect(
      getMilestoneOccurrence(leapFebruary, new Date(2043, 0, 1))?.daysFrom,
    ).toBeGreaterThan(20 * 365);
  });

  it('uses startYear as the lower bound for recurring milestones', () => {
    const future = milestone({ startYear: 2030 });

    expect(
      getMilestoneOccurrence(future, new Date(2026, 7, 10)),
    ).toMatchObject({
      dateKey: '2030-08-10',
      sequenceNumber: 0,
    });
    expect(milestoneOccursOn(future, '2026-08-10')).toBe(false);
  });

  it('skips lunar years where day thirty does not exist', () => {
    const recurring = milestone({
      dateRule: {
        calendar: 'lunar',
        year: null,
        month: 2,
        day: 30,
        isLeapMonth: false,
        missingLeapMonthPolicy: 'regular-month',
      },
    });
    const oneTime = milestone({
      dateRule: {
        ...recurring.dateRule,
        year: 2025,
      },
    });

    expect(isValidMilestoneDateRule(oneTime.dateRule)).toBe(false);
    expect(
      getMilestoneOccurrence(recurring, new Date(2025, 0, 1))?.date.getFullYear(),
    ).toBeGreaterThan(2025);
  });

  it('returns consecutive upcoming occurrences for reminder scheduling', () => {
    const recurring = milestone();

    expect(
      getUpcomingMilestoneOccurrences(recurring, new Date(2026, 0, 1), 2).map(
        (occurrence) => occurrence.dateKey,
      ),
    ).toEqual(['2026-08-10', '2027-08-10']);
  });

  it('keeps one-time past milestones and calculates sequence numbers', () => {
    const oneTime = milestone({
      type: 'countdown',
      dateRule: {
        calendar: 'solar',
        year: 2026,
        month: 8,
        day: 1,
        leapDayPolicy: 'feb-28',
      },
    });
    const anniversary = milestone({ startYear: 2020 });

    expect(
      getMilestoneOccurrence(oneTime, new Date(2026, 7, 10))?.daysFrom,
    ).toBe(-9);
    expect(
      getMilestoneOccurrence(anniversary, new Date(2026, 0, 1))
        ?.sequenceNumber,
    ).toBe(6);
  });
});
