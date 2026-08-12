import type { Translation } from '../../types';
export const calendar: Translation['calendar'] = {
  title: '日历计划',
  monthTitle: (year, month) => `${year}年${month}月`,
  weekdays: ['日', '一', '二', '三', '四', '五', '六'],
  previousMonth: '上个月',
  nextMonth: '下个月',
  today: '今天',
  selectedDate: '当天任务',
  tasksForDate: (count) => `${count} 项任务`,
  empty: '这一天还没有安排',
  inputPlaceholder: '添加到这一天…',
};
