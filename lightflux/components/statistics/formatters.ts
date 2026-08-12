import {
  StatisticsRange,
  TaskAnalytics,
  TrendBucket,
} from '../../utils/taskAnalytics';

export const formatStatisticsPeriod = (
  analytics: TaskAnalytics,
  language: 'zh' | 'en',
): string => {
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  const start = analytics.period.start.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const end = analytics.period.end.toLocaleDateString(locale, {
    year:
      analytics.period.start.getFullYear() ===
      analytics.period.end.getFullYear()
        ? undefined
        : 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${start} – ${end}`;
};

export const formatTrendBucket = (
  bucket: TrendBucket,
  language: 'zh' | 'en',
  range: StatisticsRange,
): string => {
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';
  if (range === '7d') {
    return bucket.start.toLocaleDateString(locale, { weekday: 'short' });
  }
  const start = bucket.start.toLocaleDateString(locale, {
    month: 'numeric',
    day: 'numeric',
  });
  const end = bucket.end.toLocaleDateString(locale, {
    month:
      bucket.start.getMonth() === bucket.end.getMonth()
        ? undefined
        : 'numeric',
    day: 'numeric',
  });
  return start === end ? start : `${start}–${end}`;
};
