import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import { Translation, translations } from '../i18n/translations';
import { useTodoStore } from '../store/todoStore';
import { fromDateKey } from '../utils/date';
import {
  AnalyticsInsight,
  GroupPressure,
  StatisticsRange,
  TaskAnalytics,
  TrendBucket,
  WeekdayRate,
  buildTaskAnalytics,
} from '../utils/taskAnalytics';

const RANGES: StatisticsRange[] = ['7d', '30d', '90d', 'year'];

const MetricCard = ({
  accent,
  detail,
  label,
  value,
  width,
}: {
  accent: string;
  detail: string;
  label: string;
  value: string;
  width: `${number}%`;
}) => (
  <View style={[styles.metricCell, { width }]}>
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, { backgroundColor: accent }]} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  </View>
);

const SectionHeader = ({
  description,
  title,
}: {
  description: string;
  title: string;
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionDescription}>{description}</Text>
  </View>
);

const formatPeriod = (
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

const formatBucket = (
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

const TrendChart = ({
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
          style={[
            styles.chartGridLine,
            { bottom: 28 + ratio * 150 },
          ]}
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
                  style={[
                    styles.plannedBar,
                    { height: plannedHeight },
                  ]}
                />
                <View
                  style={[
                    styles.completedBar,
                    { height: completedHeight },
                  ]}
                />
              </View>
              <Text numberOfLines={1} style={styles.chartBucketLabel}>
                {formatBucket(bucket, language, range)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const insightContent = (
  insight: AnalyticsInsight,
  labels: Translation['statistics'],
  language: 'zh' | 'en',
) => {
  switch (insight.type) {
    case 'stable-days': {
      const separator = language === 'zh' ? '、' : ', ';
      const days = insight.weekdays
        .map((weekday) => labels.weekdays[weekday])
        .join(separator);
      return {
        icon: 'pulse-outline' as const,
        title: labels.stableTitle,
        description: labels.stableDescription(days, insight.advantage),
        warning: false,
      };
    }
    case 'group-pressure':
      return {
        icon: 'file-tray-stacked-outline' as const,
        title: labels.pressureInsightTitle(insight.groupName),
        description: labels.pressureInsightDescription(
          insight.pending,
          insight.overdue,
        ),
        warning: true,
      };
    case 'reduce-day':
      return {
        icon: 'calendar-outline' as const,
        title: labels.reduceTitle,
        description: labels.reduceDescription(
          labels.weekdays[insight.weekday],
          insight.gap,
        ),
        warning: false,
      };
    case 'building-history':
      return {
        icon: 'analytics-outline' as const,
        title: labels.buildingTitle,
        description: labels.buildingDescription,
        warning: false,
      };
  }
};

const Insights = ({
  analytics,
  labels,
  language,
  onOpenGroups,
}: {
  analytics: TaskAnalytics;
  labels: Translation['statistics'];
  language: 'zh' | 'en';
  onOpenGroups: () => void;
}) => (
  <View style={[styles.card, styles.insightsCard]}>
    <View style={styles.insightsHeading}>
      <Text style={styles.insightsEyebrow}>{labels.insightsEyebrow}</Text>
      <Text style={styles.sectionTitle}>{labels.insightsTitle}</Text>
    </View>
    <View style={styles.insightList}>
      {analytics.insights.map((insight, index) => {
        const content = insightContent(insight, labels, language);
        return (
          <View
            key={`${insight.type}-${index}`}
            style={[
              styles.insight,
              content.warning && styles.insightWarning,
            ]}
          >
            <View
              style={[
                styles.insightIcon,
                content.warning && styles.insightIconWarning,
              ]}
            >
              <Ionicons
                color={content.warning ? '#B77900' : '#6759E8'}
                name={content.icon}
                size={16}
              />
            </View>
            <View style={styles.insightBody}>
              <Text style={styles.insightTitle}>{content.title}</Text>
              <Text style={styles.insightDescription}>
                {content.description}
              </Text>
              {insight.type === 'group-pressure' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onOpenGroups}
                  style={({ pressed }) => [
                    styles.insightAction,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.insightActionText}>
                    {labels.viewTasks}
                  </Text>
                  <Ionicons
                    color="#6759E8"
                    name="arrow-forward"
                    size={13}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  </View>
);

const PressureRow = ({
  maximum,
  row,
}: {
  maximum: number;
  row: GroupPressure;
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
            style={[
              styles.pressureCompleted,
              { width: completedWidth },
            ]}
          />
        </View>
      </View>
      <Text style={styles.pressureValue}>
        {row.completed} / {row.pending}
      </Text>
    </View>
  );
};

const PressureChart = ({
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
              key={row.groupId ?? 'ungrouped'}
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
        {labels.weekdays[value.weekday].replace(
          labels.weekdays[value.weekday].startsWith('周') ? '周' : '',
          '',
        )}
      </Text>
    </View>
  );
};

const WeekdayChart = ({
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

const StatisticsScreen = ({
  onBack,
  onOpenGroups,
}: {
  onBack: () => void;
  onOpenGroups: () => void;
}) => {
  const {
    allTodos,
    groups,
    taskEvents,
    analyticsStartedAt,
    language,
    ungroupedName,
  } = useTodoStore(
    useShallow((state) => ({
      allTodos: state.allTodos,
      groups: state.groups,
      taskEvents: state.taskEvents,
      analyticsStartedAt: state.analyticsStartedAt,
      language: state.language,
      ungroupedName: state.ungroupedName,
    })),
  );
  const [range, setRange] = useState<StatisticsRange>('30d');
  const dateKey = useCurrentDateKey();
  const { width } = useWindowDimensions();
  const labels = translations[language].statistics;
  const metricWidth = (width >= 1040 ? '25%' : '50%') as
    | '25%'
    | '50%';
  const analytics = useMemo(
    () =>
      buildTaskAnalytics({
        todos: allTodos,
        groups,
        taskEvents,
        analyticsStartedAt,
        range,
        now: fromDateKey(dateKey),
        ungroupedName:
          ungroupedName ?? translations[language].groups.ungrouped,
      }),
    [
      allTodos,
      analyticsStartedAt,
      dateKey,
      groups,
      language,
      range,
      taskEvents,
      ungroupedName,
    ],
  );
  const rateValue =
    analytics.completionRate === null
      ? '–'
      : `${analytics.completionRate}%`;
  const pendingValue = `${
    analytics.pendingDelta > 0 ? '+' : ''
  }${analytics.pendingDelta}`;
  const rateDetail =
    analytics.completionRateDelta === null
      ? labels.rateNoComparison
      : labels.rateDelta(analytics.completionRateDelta);

  return (
    <View style={styles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityLabel={labels.back}
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <Ionicons color="#686979" name="chevron-back" size={20} />
            </Pressable>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>{labels.eyebrow}</Text>
              <Text style={styles.title}>{labels.title}</Text>
              <Text style={styles.subtitle}>{labels.subtitle}</Text>
            </View>
          </View>

          <View style={styles.rangeSelector}>
            {RANGES.map((item) => {
              const selected = item === range;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  key={item}
                  onPress={() => setRange(item)}
                  style={({ pressed }) => [
                    styles.rangeButton,
                    selected && styles.rangeButtonSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.rangeText,
                      selected && styles.rangeTextSelected,
                    ]}
                  >
                    {labels.ranges[item]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.periodRow}>
            <Text style={styles.periodText}>
              {formatPeriod(analytics, language)}
            </Text>
            {analytics.estimated ? (
              <View style={styles.estimatedPill}>
                <Text style={styles.estimatedText}>
                  {labels.estimated}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.metricGrid}>
            <MetricCard
              accent="#845EF7"
              detail={labels.completedDetail(analytics.completedCount)}
              label={labels.completedTasks}
              value={`${analytics.completedCount}`}
              width={metricWidth}
            />
            <MetricCard
              accent="#20B986"
              detail={rateDetail}
              label={labels.completionRate}
              value={rateValue}
              width={metricWidth}
            />
            <MetricCard
              accent="#E9A400"
              detail={labels.pendingDetail(
                analytics.createdCount,
                analytics.completedCount,
              )}
              label={labels.pendingChange}
              value={pendingValue}
              width={metricWidth}
            />
            <MetricCard
              accent="#EE6675"
              detail={labels.overdueDetail(
                analytics.highPriorityOverdue,
              )}
              label={labels.currentOverdue}
              value={`${analytics.currentOverdue}`}
              width={metricWidth}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.trendHeader}>
              <SectionHeader
                description={labels.trendDescription}
                title={labels.trendTitle}
              />
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, styles.legendPlanned]} />
                  <Text style={styles.legendText}>{labels.planned}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, styles.legendCompleted]}
                  />
                  <Text style={styles.legendText}>{labels.completed}</Text>
                </View>
              </View>
            </View>
            <TrendChart
              analytics={analytics}
              labels={labels}
              language={language}
              range={range}
            />
          </View>

          <Insights
            analytics={analytics}
            labels={labels}
            language={language}
            onOpenGroups={onOpenGroups}
          />

          <View
            style={[
              styles.lowerGrid,
              width < 900 && styles.lowerGridCompact,
            ]}
          >
            <View style={styles.lowerCell}>
              <PressureChart analytics={analytics} labels={labels} />
            </View>
            <View style={styles.lowerCell}>
              <WeekdayChart analytics={analytics} labels={labels} />
            </View>
          </View>

          <View style={styles.definition}>
            <View style={styles.definitionIcon}>
              <Ionicons
                color="#6759E8"
                name="information"
                size={14}
              />
            </View>
            <Text style={styles.definitionText}>
              {labels.definition}
              {analytics.estimated
                ? ` ${labels.estimatedDefinition}`
                : ''}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F7F7FA',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    alignSelf: 'center',
    maxWidth: 1080,
    width: '100%',
  },
  content: {
    paddingBottom: 42,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: 24,
    paddingRight: 90,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E2EA',
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    marginRight: 15,
    width: 40,
  },
  backButtonPressed: {
    backgroundColor: '#F0EEFF',
    transform: [{ scale: 0.94 }],
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: '#7B6FE1',
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  title: {
    color: '#28293A',
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#777886',
    fontSize: 13,
    marginTop: 6,
  },
  rangeSelector: {
    backgroundColor: '#ECECF1',
    borderColor: '#DCDCE4',
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 24,
    padding: 4,
  },
  rangeButton: {
    alignItems: 'center',
    borderRadius: 9,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  rangeButtonSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#3E3B55',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  rangeText: {
    color: '#686976',
    fontSize: 12,
    fontWeight: '700',
  },
  rangeTextSelected: {
    color: '#6759E8',
  },
  periodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  periodText: {
    color: '#90919D',
    fontFamily: 'monospace',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  estimatedPill: {
    backgroundColor: '#FFF3BF',
    borderRadius: 8,
    marginLeft: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  estimatedText: {
    color: '#A46B00',
    fontSize: 10,
    fontWeight: '700',
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metricCell: {
    padding: 6,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E3EA',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 145,
    overflow: 'hidden',
    padding: 17,
    position: 'relative',
  },
  metricAccent: {
    borderBottomRightRadius: 3,
    borderTopRightRadius: 3,
    bottom: 17,
    left: 0,
    position: 'absolute',
    top: 17,
    width: 3,
  },
  metricLabel: {
    color: '#666775',
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginTop: 13,
  },
  metricDetail: {
    color: '#8A8B98',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 11,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4E3EA',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
  },
  sectionHeader: {
    flex: 1,
  },
  sectionTitle: {
    color: '#303143',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionDescription: {
    color: '#8B8C98',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  trendHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 4,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: 12,
  },
  legendDot: {
    borderRadius: 3,
    height: 8,
    marginRight: 5,
    width: 10,
  },
  legendPlanned: {
    backgroundColor: '#E3DCFF',
    borderColor: '#C4B6FF',
    borderWidth: 1,
  },
  legendCompleted: {
    backgroundColor: '#8B6DF2',
  },
  legendPending: {
    backgroundColor: '#FFE28A',
  },
  legendText: {
    color: '#8A8B98',
    fontSize: 10,
  },
  chart: {
    height: 220,
    marginTop: 18,
    paddingLeft: 30,
    position: 'relative',
  },
  chartGridLine: {
    backgroundColor: '#ECECF1',
    height: 1,
    left: 30,
    position: 'absolute',
    right: 0,
  },
  chartGridLabel: {
    color: '#A0A1AC',
    fontFamily: 'monospace',
    fontSize: 9,
    position: 'absolute',
    right: '100%',
    top: -6,
    width: 26,
  },
  chartBuckets: {
    bottom: 0,
    flexDirection: 'row',
    left: 38,
    position: 'absolute',
    right: 3,
    top: 8,
  },
  chartBucket: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 42,
  },
  chartBars: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 155,
    justifyContent: 'center',
    width: '100%',
  },
  plannedBar: {
    backgroundColor: '#E3DCFF',
    borderColor: '#C4B6FF',
    borderRadius: 6,
    borderWidth: 1,
    marginHorizontal: 2,
    maxWidth: 24,
    width: '28%',
  },
  completedBar: {
    backgroundColor: '#8B6DF2',
    borderRadius: 6,
    marginHorizontal: 2,
    maxWidth: 24,
    width: '28%',
  },
  chartBucketLabel: {
    color: '#8E8F9C',
    fontSize: 9,
    marginTop: 7,
    maxWidth: 76,
  },
  insightsCard: {
    borderLeftColor: '#A88BFF',
    borderLeftWidth: 3,
  },
  insightsHeading: {
    marginBottom: 14,
  },
  insightsEyebrow: {
    color: '#9697A3',
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  insightList: {
    gap: 9,
  },
  insight: {
    backgroundColor: '#F1F1F4',
    borderColor: 'transparent',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 13,
  },
  insightWarning: {
    backgroundColor: '#FFF9DF',
    borderColor: '#F3D66E',
  },
  insightIcon: {
    alignItems: 'center',
    backgroundColor: '#E9E5FF',
    borderRadius: 10,
    height: 30,
    justifyContent: 'center',
    marginRight: 11,
    width: 30,
  },
  insightIconWarning: {
    backgroundColor: '#FFF0B3',
  },
  insightBody: {
    flex: 1,
  },
  insightTitle: {
    color: '#363747',
    fontSize: 12,
    fontWeight: '800',
  },
  insightDescription: {
    color: '#777885',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  insightAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginTop: 7,
  },
  insightActionText: {
    color: '#6759E8',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 4,
  },
  lowerGrid: {
    flexDirection: 'row',
    marginHorizontal: -9,
  },
  lowerGridCompact: {
    flexDirection: 'column',
  },
  lowerCell: {
    flex: 1,
    paddingHorizontal: 9,
  },
  pressureList: {
    gap: 14,
    marginTop: 4,
  },
  pressureRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  pressureName: {
    color: '#646573',
    fontSize: 11,
    marginRight: 10,
    width: 58,
  },
  pressureTrack: {
    flex: 1,
    height: 10,
  },
  pressureScale: {
    backgroundColor: '#FFE28A',
    borderRadius: 6,
    height: 10,
    overflow: 'hidden',
  },
  pressureCompleted: {
    backgroundColor: '#8B6DF2',
    height: '100%',
  },
  pressureValue: {
    color: '#9394A0',
    fontFamily: 'monospace',
    fontSize: 10,
    marginLeft: 10,
    textAlign: 'right',
    width: 55,
  },
  emptyText: {
    color: '#92939F',
    fontSize: 12,
    marginVertical: 26,
    textAlign: 'center',
  },
  weekdayChart: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    height: 174,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  weekdayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  weekdayRate: {
    color: '#92939F',
    fontFamily: 'monospace',
    fontSize: 9,
    marginBottom: 5,
  },
  weekdayBarArea: {
    alignItems: 'center',
    borderBottomColor: '#E9E9EF',
    borderBottomWidth: 1,
    height: 120,
    justifyContent: 'flex-end',
    width: '100%',
  },
  weekdayBar: {
    backgroundColor: '#5EDCB8',
    borderRadius: 6,
    maxWidth: 30,
    width: '54%',
  },
  weekdayBarStrong: {
    backgroundColor: '#20C997',
  },
  weekdayLabel: {
    color: '#777885',
    fontSize: 9,
    marginTop: 7,
    maxWidth: 42,
  },
  definition: {
    backgroundColor: '#ECECF1',
    borderColor: '#D9D9E2',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: 18,
    padding: 13,
  },
  definitionIcon: {
    alignItems: 'center',
    backgroundColor: '#E1DCFF',
    borderRadius: 10,
    height: 22,
    justifyContent: 'center',
    marginRight: 10,
    width: 22,
  },
  definitionText: {
    color: '#858692',
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});

export default StatisticsScreen;
