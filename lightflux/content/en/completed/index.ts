import type { Translation } from '../../types';
export const completed: Translation['completed'] = {
  title: 'Completed',
  count: (count) => `${count} ${count === 1 ? 'task' : 'tasks'}`,
  today: 'Today',
  yesterday: 'Yesterday',
  emptyTitle: 'No completed tasks yet',
  emptyDescription: 'Completed tasks will be organized here by date.',
};
