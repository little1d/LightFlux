import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { Translation } from '../../content';
import {
  AnalyticsInsight,
  TaskAnalytics,
} from '../../utils/taskAnalytics';
import styles from './styles';

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

const StatisticsInsights = ({
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

export default StatisticsInsights;
