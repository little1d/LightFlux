import { Text, View } from 'react-native';

import { Translation } from '../../content';
import {
  ProjectPressure,
  StatisticsRange,
  TaskAnalytics,
  WeekdayRate,
} from '../../utils/taskAnalytics';
import { formatTrendBucket } from './formatters';
import { SectionHeader } from './StatisticsPrimitives';
import styles from './styles';

export const TrendChart = ({
  analytics,
  labels,
  language,
  range,
}: {
  analytics: TaskAnalytics;
  labels: Translation['statistics'];
  language: 'zh' | 'en';
  range: StatisticsRange;
}) => {
  const maximum = Math.max(
    1,
    ...analytics.trend.flatMap((bucket) => [
      bucket.planned,
      bucket.completed,
    ]),
  );
  const chartMaximum = Math.max(4, Math.ceil(maximum / 4) * 4);

  return (
    <View accessibilityLabel={labels.trendTitle} style={styles.chart}>
      {[1, 0.66, 0.33, 0].map((ratio) => (
        <View
          key={ratio}
          style={[styles.chartGridLine, { bottom: 28 + ratio * 150 }]}
        >
          <Text style={styles.chartGridLabel}>
            {Math.round(chartMaximum * ratio)}
          </Text>
        </View>
      ))}
      <View style={styles.chartBuckets}>
        {analytics.trend.map((bucket) => {
          const plannedHeight =
            bucket.planned === 0
              ? 2
              : Math.max(6, (bucket.planned / chartMaximum) * 150);
          const completedHeight =
            bucket.completed === 0
              ? 2
              : Math.max(6, (bucket.completed / chartMaximum) * 150);
          return (
            <View
              key={`${bucket.start.getTime()}-${bucket.end.getTime()}`}
              style={styles.chartBucket}
            >
              <View style={styles.chartBars}>
                <View
                  style={[styles.plannedBar, { height: plannedHeight }]}
                />
                <View
                  style={[styles.completedBar, { height: completedHeight }]}
                />
              </View>
              <Text numberOfLines={1} style={styles.chartBucketLabel}>
                {formatTrendBucket(bucket, language, range)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const PressureRow = ({
  maximum,
  row,
}: {
  maximum: number;
  row: ProjectPressure;
}) => {
  const total = row.completed + row.pending;
  const scaledWidth = `${Math.max(8, (total / maximum) * 100)}%` as const;
  const completedWidth = `${
    total === 0 ? 0 : (row.completed / total) * 100
  }%` as const;

  return (
    <View style={styles.pressureRow}>
      <Text numberOfLines={1} style={styles.pressureName}>
        {row.name}
      </Text>
      <View style={styles.pressureTrack}>
        <View style={[styles.pressureScale, { width: scaledWidth }]}>
          <View
            style={[styles.pressureCompleted, { width: completedWidth }]}
          />
        </View>
      </View>
      <Text style={styles.pressureValue}>
        {row.completed} / {row.pending}
      </Text>
    </View>
  );
};

export const PressureChart = ({
  analytics,
  labels,
}: {
  analytics: TaskAnalytics;
  labels: Translation['statistics'];
}) => {
  const maximum = Math.max(
    1,
    ...analytics.pressure.map((row) => row.completed + row.pending),
  );

  return (
    <View style={styles.card}>
      <SectionHeader
        description={labels.pressureDescription}
        title={labels.pressureTitle}
      />
      {analytics.pressure.length > 0 ? (
        <View style={styles.pressureList}>
          {analytics.pressure.map((row) => (
            <PressureRow
              key={row.projectId ?? 'inbox'}
              maximum={maximum}
              row={row}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>{labels.noPlannedTasks}</Text>
      )}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendCompleted]} />
          <Text style={styles.legendText}>{labels.completed}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendPending]} />
          <Text style={styles.legendText}>{labels.pending}</Text>
        </View>
      </View>
    </View>
  );
};

const WeekdayColumn = ({
  labels,
  value,
}: {
  labels: Translation['statistics'];
  value: WeekdayRate;
}) => {
  const height = value.rate === null ? 3 : Math.max(6, value.rate * 1.12);
  const label = labels.weekdays[value.weekday];

  return (
    <View style={styles.weekdayColumn}>
      <Text style={styles.weekdayRate}>
        {value.rate === null ? '–' : `${value.rate}%`}
      </Text>
      <View style={styles.weekdayBarArea}>
        <View
          style={[
            styles.weekdayBar,
            value.rate !== null &&
              value.rate >= 75 &&
              styles.weekdayBarStrong,
            { height },
          ]}
        />
      </View>
      <Text numberOfLines={1} style={styles.weekdayLabel}>
        {label.replace(label.startsWith('周') ? '周' : '', '')}
      </Text>
    </View>
  );
};

export const WeekdayChart = ({
  analytics,
  labels,
}: {
  analytics: TaskAnalytics;
  labels: Translation['statistics'];
}) => (
  <View style={styles.card}>
    <SectionHeader
      description={labels.weeklyDescription}
      title={labels.weeklyTitle}
    />
    <View style={styles.weekdayChart}>
      {analytics.weekdays.map((weekday) => (
        <WeekdayColumn
          key={weekday.weekday}
          labels={labels}
          value={weekday}
        />
      ))}
    </View>
  </View>
);
