import { Lunar, LunarYear, Solar } from 'lunar-typescript';

import {
  LunarMilestoneDateRule,
  Milestone,
  MilestoneDateRule,
  SolarMilestoneDateRule,
} from '../types/todo';
import { toDateKey } from './date';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SUPPORTED_YEAR = 1900;
const MAX_SUPPORTED_YEAR = 2100;

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
  if (rule.day > lunarMonth.getDayCount()) {
    return null;
  }
  const solar = Lunar.fromYmd(lunarYear, month, rule.day).getSolar();
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
  startYear: number | null,
): Date | null => {
  if (rule.calendar === 'solar') {
    const firstYear = Math.max(from.getFullYear(), startYear ?? 0);
    for (
      let year = firstYear;
      year <= MAX_SUPPORTED_YEAR;
      year += 1
    ) {
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
  const firstLunarYear = Math.max(currentLunarYear, startYear ?? 0);
  for (
    let lunarYear = firstLunarYear;
    lunarYear <= MAX_SUPPORTED_YEAR;
    lunarYear += 1
  ) {
    const candidate = lunarOccurrence(rule, lunarYear);
    if (candidate && daysBetween(from, candidate) >= 0) {
      return candidate;
    }
  }
  return null;
};

const occurrenceYear = (
  rule: MilestoneDateRule,
  occurrence: Date,
): number =>
  rule.calendar === 'solar'
    ? occurrence.getFullYear()
    : Lunar.fromSolar(
        Solar.fromYmd(
          occurrence.getFullYear(),
          occurrence.getMonth() + 1,
          occurrence.getDate(),
        ),
      ).getYear();

const sequenceNumber = (
  milestone: Milestone,
  occurrence: Date,
): number | null => {
  if (milestone.startYear === null) {
    return null;
  }
  return occurrenceYear(milestone.dateRule, occurrence) - milestone.startYear;
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
      ? nextRecurringOccurrence(
          milestone.dateRule,
          normalizedFrom,
          milestone.startYear,
        )
      : oneTimeOccurrence(milestone.dateRule);
  if (
    !date ||
    (milestone.startYear !== null &&
      occurrenceYear(milestone.dateRule, date) < milestone.startYear)
  ) {
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

export const getUpcomingMilestoneOccurrences = (
  milestone: Milestone,
  from = new Date(),
  limit = 2,
): MilestoneOccurrence[] => {
  const occurrences: MilestoneOccurrence[] = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const boundedLimit = Math.max(0, Math.min(limit, 10));

  while (occurrences.length < boundedLimit) {
    const occurrence = getMilestoneOccurrence(milestone, cursor);
    if (!occurrence || occurrence.daysFrom < 0) {
      break;
    }
    occurrences.push(occurrence);
    if (milestone.dateRule.year !== null) {
      break;
    }
    cursor = new Date(
      occurrence.date.getFullYear(),
      occurrence.date.getMonth(),
      occurrence.date.getDate() + 1,
    );
  }

  return occurrences;
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
      (!Number.isInteger(rule.year) ||
        rule.year < MIN_SUPPORTED_YEAR ||
        rule.year > MAX_SUPPORTED_YEAR))
  ) {
    return false;
  }
  if (rule.calendar === 'solar') {
    const validationYear = rule.year ?? 2024;
    return solarOccurrence(rule, validationYear) !== null;
  }
  try {
    if (rule.year !== null) {
      return lunarOccurrence(rule, rule.year) !== null;
    }
    for (
      let lunarYear = MIN_SUPPORTED_YEAR;
      lunarYear <= MAX_SUPPORTED_YEAR;
      lunarYear += 1
    ) {
      if (lunarOccurrence(rule, lunarYear)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

export const isValidMilestoneStartYear = (
  value: number | null,
): boolean =>
  value === null ||
  (Number.isInteger(value) &&
    value >= MIN_SUPPORTED_YEAR &&
    value <= MAX_SUPPORTED_YEAR);

export const normalizeReminderOffsets = (values: number[]): number[] =>
  [...new Set(values)]
    .filter(
      (value) =>
        Number.isInteger(value) && value >= 0 && value <= 365,
    )
    .sort((a, b) => a - b);
