import type { Translation } from '../../types';
export const completed: Translation['completed'] = {
  title: '已完成',
  count: (count) => `${count} 项`,
  today: '今天',
  yesterday: '昨天',
  emptyTitle: '还没有已完成的任务',
  emptyDescription: '完成的任务会按日期整理在这里。',
};
