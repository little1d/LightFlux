import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import { translations } from '../content';
import { useTodoStore } from '../store/todoStore';
import { fromDateKey } from '../utils/date';
import {
  StatisticsRange,
  buildTaskAnalytics,
} from '../utils/taskAnalytics';
import {
  PressureChart,
  TrendChart,
  WeekdayChart,
} from './statistics/StatisticsCharts';
import { formatStatisticsPeriod } from './statistics/formatters';
import StatisticsInsights from './statistics/StatisticsInsights';
import {
  MetricCard,
  SectionHeader,
} from './statistics/StatisticsPrimitives';
import styles from './statistics/styles';

const RANGES: StatisticsRange[] = ['7d', '30d', '90d', 'year'];

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
  const compact = width < 520;
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
          contentContainerStyle={[
            styles.content,
            compact && styles.contentCompact,
          ]}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={[styles.header, compact && styles.headerCompact]}>
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
              {labels.eyebrow ? (
                <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>{labels.eyebrow}</Text>
              ) : null}
              <Text style={[styles.title, compact && styles.titleCompact]}>{labels.title}</Text>
              {!compact ? (
                <Text style={styles.subtitle}>{labels.subtitle}</Text>
              ) : null}
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
              {formatStatisticsPeriod(analytics, language)}
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

          <StatisticsInsights
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

          {!compact ? (
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
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};


export default StatisticsScreen;
