import type { Translation } from '../../types';
export const settings: Translation['settings'] = {
  title: '设置',
  languageTitle: '语言',
  chinese: '简体中文',
  english: 'English',
  dataTitle: '数据与统计',
  statisticsTitle: '统计',
  statisticsDescription: '查看完成节奏、任务压力与安排规律',
  visibleViewsTitle: '显示页面',
  visibleViewsDescription: (view) => `在导航中显示「${view}」`,
};
