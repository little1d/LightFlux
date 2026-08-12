import type { Translation } from '../../types';
export const calendar: Translation['calendar'] = {
  title: 'Calendar',
  monthTitle: (year, month) => new Date(year, month - 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }),
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  today: 'Today',
  selectedDate: 'Tasks for this day',
  tasksForDate: (count) => `${count} ${count === 1 ? 'task' : 'tasks'}`,
  empty: 'Nothing scheduled for this day',
  inputPlaceholder: 'Add to this day…',
};
