import type { Translation } from '../../types';
export const settings: Translation['settings'] = {
  title: 'Settings',
  languageTitle: 'Language',
  chinese: '简体中文',
  english: 'English',
  dataTitle: 'Data and statistics',
  statisticsTitle: 'Statistics',
  statisticsDescription: 'Review completion rhythm, task pressure, and planning patterns',
  visibleViewsTitle: 'Visible views',
  visibleViewsDescription: (view) => `Show ${view} in navigation`,
};
