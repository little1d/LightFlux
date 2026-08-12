import { translations } from '../content';
import { Language, Milestone } from '../types/todo';
import { getUpcomingMilestoneOccurrences } from './milestoneDate';

const REMINDER_HOUR = 9;

export interface MilestoneReminderSchedule {
  key: string;
  milestoneId: string;
  occurrenceDateKey: string;
  offsetDays: number;
  fireDate: Date;
  title: string;
  body: string;
}

const reminderBody = (language: Language, offsetDays: number): string => {
  const labels = translations[language].milestones;
  return offsetDays === 0
    ? labels.reminderToday
    : labels.reminderInDays(offsetDays);
};

export const buildMilestoneReminderSchedules = (
  milestones: Milestone[],
  language: Language,
  from = new Date(),
): MilestoneReminderSchedule[] => {
  const schedules = milestones.flatMap((milestone) => {
    if (
      milestone.archivedAt !== null ||
      milestone.trashedAt !== null ||
      milestone.reminderOffsets.length === 0
    ) {
      return [];
    }

    const countByOffset = new Map<number, number>();
    return getUpcomingMilestoneOccurrences(milestone, from, 4).flatMap(
      (occurrence) => {
        return milestone.reminderOffsets.flatMap((offsetDays) => {
          if ((countByOffset.get(offsetDays) ?? 0) >= 2) {
            return [];
          }
          const fireDate = new Date(
            occurrence.date.getFullYear(),
            occurrence.date.getMonth(),
            occurrence.date.getDate(),
            REMINDER_HOUR,
          );
          fireDate.setDate(fireDate.getDate() - offsetDays);
          if (fireDate.getTime() <= from.getTime()) {
            return [];
          }
          countByOffset.set(
            offsetDays,
            (countByOffset.get(offsetDays) ?? 0) + 1,
          );
          return [
            {
              key: `${milestone.id}:${occurrence.dateKey}:${offsetDays}`,
              milestoneId: milestone.id,
              occurrenceDateKey: occurrence.dateKey,
              offsetDays,
              fireDate,
              title: milestone.title,
              body: reminderBody(language, offsetDays),
            },
          ];
        });
      },
    );
  });

  return schedules.sort(
    (left, right) => left.fireDate.getTime() - right.fireDate.getTime(),
  );
};
