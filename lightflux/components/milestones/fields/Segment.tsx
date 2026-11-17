import { Pressable, StyleSheet, Text } from 'react-native';

interface SegmentProps {
  label: string;
  onPress: () => void;
  selected: boolean;
}

/**
 * A single selectable chip. Used for the leap-day and leap-month policies, the
 * reminder offsets and the colour-independent toggles, which is why callers
 * import it as `ToggleChip` when the choice is not mutually exclusive.
 */
const Segment = ({ label, onPress, selected }: SegmentProps) => (
  <Pressable
    accessibilityRole="radio"
    accessibilityState={{ checked: selected }}
    onPress={onPress}
    style={({ pressed }) => [
      styles.segment,
      selected && styles.segmentSelected,
      pressed && styles.pressed,
    ]}
  >
    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
      {label}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  segment: {
    backgroundColor: '#F3F2F6',
    borderColor: '#F3F2F6',
    borderRadius: 9,
    borderWidth: 1,
    marginBottom: 5,
    marginRight: 5,
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  segmentSelected: {
    backgroundColor: '#F0EEFF',
    borderColor: '#BFB7F5',
  },
  segmentText: {
    color: '#686978',
    fontSize: 11,
    fontWeight: '600',
  },
  segmentTextSelected: {
    color: '#6759E8',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});

export default Segment;
