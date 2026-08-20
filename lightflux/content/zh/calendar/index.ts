import type { Translation } from '../../types';
export const calendar: Translation['calendar'] = {
  title: '日历计划',
  monthTitle: (year, month) => `${year}年${month}月`,
  weekdays: ['日', '一', '二', '三', '四', '五', '六'],
  previousMonth: '上个月',
  nextMonth: '下个月',
  today: '今天',
  tasksForDate: (count) => `${count} 项任务`,
};
