import { Text, View } from 'react-native';

import styles from './styles';

export const MetricCard = ({
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

export const SectionHeader = ({
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
