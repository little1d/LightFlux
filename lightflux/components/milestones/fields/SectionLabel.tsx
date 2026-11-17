import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

const SectionLabel = ({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) => (
  <View style={styles.sectionLabel}>
    <Ionicons color="#767286" name={icon} size={14} />
    <Text style={styles.sectionLabelText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  sectionLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  sectionLabelText: {
    color: '#646174',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default SectionLabel;
