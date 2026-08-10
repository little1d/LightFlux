import { Lunar, LunarYear, Solar } from 'lunar-typescript';

import {
  LunarMilestoneDateRule,
  Milestone,
  MilestoneDateRule,
  SolarMilestoneDateRule,
} from '../types/todo';
import { toDateKey } from './date';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MilestoneOccurrence {
  date: Date;
  dateKey: string;
  daysFrom: number;
  sequenceNumber: number | null;
}

const daySerial = (date: Date): number =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;

const daysBetween = (from: Date, to: Date): number =>
  Math.round(daySerial(to) - daySerial(from));

const localDate = (year: number, month: number, day: number): Date =>
  new Date(year, month - 1, day);

const validLocalDate = (date: Date, year: number, month: number, day: number) =>
  date.getFullYear() === year &&
  date.getMonth() === month - 1 &&
  date.getDate() === day;

const solarOccurrence = (
  rule: SolarMilestoneDateRule,
  year: number,
): Date | null => {
  const date = localDate(year, rule.month, rule.day);
  if (validLocalDate(date, year, rule.month, rule.day)) {
    return date;
  }
  if (rule.month === 2 && rule.day === 29) {
    return rule.leapDayPolicy === 'mar-1'
      ? localDate(year, 3, 1)
      : localDate(year, 2, 28);
  }
  return null;
};

const lunarOccurrence = (
  rule: LunarMilestoneDateRule,
  lunarYear: number,
): Date | null => {
  const year = LunarYear.fromYear(lunarYear);
  let month = rule.month;
  if (rule.isLeapMonth) {
    if (year.getLeapMonth() === rule.month) {
      month = -rule.month;
    } else if (rule.missingLeapMonthPolicy === 'skip-year') {
      return null;
    }
  }
  const lunarMonth = year.getMonth(month);
  if (!lunarMonth) {
    return null;
  }
  const day = Math.min(rule.day, lunarMonth.getDayCount());
  const solar = Lunar.fromYmd(lunarYear, month, day).getSolar();
  return localDate(solar.getYear(), solar.getMonth(), solar.getDay());
};

const oneTimeOccurrence = (rule: MilestoneDateRule): Date | null => {
  if (rule.year === null) {
    return null;
  }
  return rule.calendar === 'solar'
    ? solarOccurrence(rule, rule.year)
    : lunarOccurrence(rule, rule.year);
};

const nextRecurringOccurrence = (
  rule: MilestoneDateRule,
  from: Date,
): Date | null => {
  if (rule.calendar === 'solar') {
    for (let year = from.getFullYear(); year <= from.getFullYear() + 2; year += 1) {
      const candidate = solarOccurrence(rule, year);
      if (candidate && daysBetween(from, candidate) >= 0) {
        return candidate;
      }
    }
    return null;
  }

  const solar = Solar.fromYmd(
    from.getFullYear(),
    from.getMonth() + 1,
    from.getDate(),
  );
  const currentLunarYear = Lunar.fromSolar(solar).getYear();
  for (
    let lunarYear = currentLunarYear;
    lunarYear <= currentLunarYear + 20;
    lunarYear += 1
  ) {
    const candidate = lunarOccurrence(rule, lunarYear);
    if (candidate && daysBetween(from, candidate) >= 0) {
      return candidate;
    }
  }
  return null;
};

const sequenceNumber = (
  milestone: Milestone,
  occurrence: Date,
): number | null => {
  if (milestone.startYear === null) {
    return null;
  }
  const occurrenceYear =
    milestone.dateRule.calendar === 'solar'
      ? occurrence.getFullYear()
      : Lunar.fromSolar(
          Solar.fromYmd(
            occurrence.getFullYear(),
            occurrence.getMonth() + 1,
            occurrence.getDate(),
          ),
        ).getYear();
  return Math.max(0, occurrenceYear - milestone.startYear);
};

export const getMilestoneOccurrence = (
  milestone: Milestone,
  from = new Date(),
): MilestoneOccurrence | null => {
  const normalizedFrom = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate(),
  );
  const date =
    milestone.dateRule.year === null
      ? nextRecurringOccurrence(milestone.dateRule, normalizedFrom)
      : oneTimeOccurrence(milestone.dateRule);
  if (!date) {
    return null;
  }
  return {
    date,
    dateKey: toDateKey(date),
    daysFrom: daysBetween(normalizedFrom, date),
    sequenceNumber: sequenceNumber(milestone, date),
  };
};

export const milestoneOccursOn = (
  milestone: Milestone,
  dateKey: string,
): boolean => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = localDate(year, month, day);
  if (!validLocalDate(date, year, month, day)) {
    return false;
  }
  return getMilestoneOccurrence(milestone, date)?.dateKey === dateKey;
};

export const isValidMilestoneDateRule = (
  rule: MilestoneDateRule,
): boolean => {
  if (
    !Number.isInteger(rule.month) ||
    !Number.isInteger(rule.day) ||
    rule.month < 1 ||
    rule.month > 12 ||
    rule.day < 1 ||
    rule.day > (rule.calendar === 'solar' ? 31 : 30) ||
    (rule.year !== null &&
      (!Number.isInteger(rule.year) || rule.year < 1900 || rule.year > 2100))
  ) {
    return false;
  }
  if (rule.calendar === 'solar') {
    const validationYear = rule.year ?? 2024;
    return solarOccurrence(rule, validationYear) !== null;
  }
  const validationYear = rule.year ?? 2025;
  try {
    return lunarOccurrence(rule, validationYear) !== null;
  } catch {
    return false;
  }
};

export const isValidMilestoneStartYear = (
  value: number | null,
): boolean =>
  value === null ||
  (Number.isInteger(value) && value >= 1900 && value <= 2100);

export const normalizeReminderOffsets = (values: number[]): number[] =>
  [...new Set(values)]
    .filter(
      (value) =>
        Number.isInteger(value) && value >= 0 && value <= 365,
    )
    .sort((a, b) => a - b);
