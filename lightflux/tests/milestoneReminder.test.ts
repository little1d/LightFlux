import { describe, expect, it } from 'vitest';

import { Milestone } from '../types/todo';
import { toDateKey } from '../utils/date';
import { buildMilestoneReminderSchedules } from '../utils/milestoneReminder';

const milestone = (
  overrides: Partial<Milestone> = {},
): Milestone => ({
  id: 'launch',
  title: 'Launch',
  type: 'anniversary',
  dateRule: {
    calendar: 'solar',
    year: null,
    month: 8,
    day: 10,
    leapDayPolicy: 'feb-28',
  },
  startYear: null,
  reminderOffsets: [0, 7],
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

describe('milestone reminder schedules', () => {
  it('builds reminder dates for the next two occurrences', () => {
    const schedules = buildMilestoneReminderSchedules(
      [milestone()],
      'zh',
      new Date(2026, 7, 1, 8),
    );

    expect(
      schedules.map((schedule) => ({
        date: toDateKey(schedule.fireDate),
        hour: schedule.fireDate.getHours(),
        offsetDays: schedule.offsetDays,
      })),
    ).toEqual([
      { date: '2026-08-03', hour: 9, offsetDays: 7 },
      { date: '2026-08-10', hour: 9, offsetDays: 0 },
      { date: '2027-08-03', hour: 9, offsetDays: 7 },
      { date: '2027-08-10', hour: 9, offsetDays: 0 },
    ]);
  });

  it('skips inactive milestones and expired reminder times', () => {
    const schedules = buildMilestoneReminderSchedules(
      [
        milestone(),
        milestone({ id: 'archived', archivedAt: 1 }),
        milestone({ id: 'trashed', trashedAt: 1 }),
      ],
      'en',
      new Date(2026, 7, 10, 10),
    );

    expect(schedules).toHaveLength(4);
    expect(schedules.every((schedule) => schedule.milestoneId === 'launch')).toBe(
      true,
    );
    expect(schedules[0]).toMatchObject({
      body: '7 days to go',
      occurrenceDateKey: '2027-08-10',
    });
  });

  it('finds future schedules for 365-day offsets after today has passed', () => {
    const schedules = buildMilestoneReminderSchedules(
      [milestone({ reminderOffsets: [365] })],
      'en',
      new Date(2026, 7, 10, 10),
    );

    expect(schedules).toHaveLength(2);
    expect(schedules[0].occurrenceDateKey).toBe('2028-08-10');
    expect(schedules[0].fireDate.getTime()).toBeGreaterThan(
      new Date(2026, 7, 10, 10).getTime(),
    );
  });
});
