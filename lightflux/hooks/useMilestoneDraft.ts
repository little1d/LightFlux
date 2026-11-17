import { useMemo, useState } from 'react';
import { Keyboard } from 'react-native';

import type { Translation } from '../content';
import { requestMilestoneNotificationPermission } from '../services/milestoneNotifications';
import { MILESTONE_TYPE_THEME } from '../store/milestoneDomain';
import type {
  Milestone,
  MilestoneDateRule,
  MilestoneType,
  NewMilestone,
} from '../types/todo';
import {
  isValidMilestoneDateRule,
  isValidMilestoneStartYear,
} from '../utils/milestoneDate';

interface UseMilestoneDraftArgs {
  initial?: Milestone;
  labels: Translation['milestones'];
  onSave: (milestone: NewMilestone) => void;
  template: MilestoneType;
}

/**
 * Owns every draft field of the milestone editor, plus the validation and the
 * permission request behind saving. The editor card keeps only the presentation
 * state that has no business being here: the open popover and the entrance
 * animation (which holds an `Animated.Value` tied to the view lifetime).
 */
const useMilestoneDraft = ({
  initial,
  labels,
  onSave,
  template,
}: UseMilestoneDraftArgs) => {
  const now = useMemo(() => new Date(), []);
  const initialRule = initial?.dateRule;
  const type = initial?.type ?? template;

  const [title, setTitle] = useState(initial?.title ?? '');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>(
    initialRule?.calendar ?? 'solar',
  );
  const [recurring, setRecurring] = useState(
    initialRule ? initialRule.year === null : template !== 'countdown',
  );
  const [year, setYear] = useState(
    String(initialRule?.year ?? now.getFullYear()),
  );
  const [month, setMonth] = useState(
    String(initialRule?.month ?? now.getMonth() + 1),
  );
  const [day, setDay] = useState(String(initialRule?.day ?? now.getDate()));
  const [startYear, setStartYear] = useState(
    initial?.startYear ? String(initial.startYear) : '',
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [reminderOffsets, setReminderOffsets] = useState<number[]>(
    initial?.reminderOffsets ?? [],
  );
  const [isLeapMonth, setIsLeapMonth] = useState(
    initialRule?.calendar === 'lunar' ? initialRule.isLeapMonth : false,
  );
  const [missingLeapMonthPolicy, setMissingLeapMonthPolicy] = useState<
    'regular-month' | 'skip-year'
  >(
    initialRule?.calendar === 'lunar'
      ? initialRule.missingLeapMonthPolicy
      : 'regular-month',
  );
  const [leapDayPolicy, setLeapDayPolicy] = useState<'feb-28' | 'mar-1'>(
    initialRule?.calendar === 'solar' ? initialRule.leapDayPolicy : 'feb-28',
  );
  const [color, setColor] = useState(
    initial?.color ?? MILESTONE_TYPE_THEME[type].color,
  );
  const [error, setError] = useState('');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  const dateRule = (): MilestoneDateRule => {
    const base = {
      year: recurring ? null : Number(year),
      month: Number(month),
      day: Number(day),
    };
    return calendar === 'solar'
      ? { calendar: 'solar', ...base, leapDayPolicy }
      : {
          calendar: 'lunar',
          ...base,
          isLeapMonth,
          missingLeapMonthPolicy,
        };
  };

  const save = async () => {
    if (isRequestingPermission) {
      return;
    }
    setError('');
    const normalizedTitle = title.trim();
    const rule = dateRule();
    const normalizedStartYear =
      recurring && startYear.trim() ? Number(startYear) : null;
    if (
      !normalizedTitle ||
      !isValidMilestoneDateRule(rule) ||
      !isValidMilestoneStartYear(normalizedStartYear)
    ) {
      setError(labels.invalidDate);
      return;
    }
    if (reminderOffsets.length > 0) {
      setIsRequestingPermission(true);
      const permissionGranted = await requestMilestoneNotificationPermission();
      setIsRequestingPermission(false);
      if (!permissionGranted) {
        setError(labels.notificationPermissionDenied);
        return;
      }
    }
    onSave({
      title: normalizedTitle,
      type,
      dateRule: rule,
      startYear: normalizedStartYear,
      reminderOffsets,
      notes,
      icon: MILESTONE_TYPE_THEME[type].icon,
      color,
      pinned: initial?.pinned ?? false,
    });
    Keyboard.dismiss();
  };

  const toggleReminder = (offset: number) =>
    setReminderOffsets((current) =>
      current.includes(offset)
        ? current.filter((value) => value !== offset)
        : [...current, offset],
    );

  return {
    calendar,
    color,
    day,
    error,
    isLeapMonth,
    isRequestingPermission,
    leapDayPolicy,
    missingLeapMonthPolicy,
    month,
    notes,
    recurring,
    reminderOffsets,
    save,
    setCalendar,
    setColor,
    setDay,
    setIsLeapMonth,
    setLeapDayPolicy,
    setMissingLeapMonthPolicy,
    setMonth,
    setNotes,
    setRecurring,
    setStartYear,
    setTitle,
    setYear,
    startYear,
    title,
    toggleReminder,
    type,
    year,
  };
};

export default useMilestoneDraft;
