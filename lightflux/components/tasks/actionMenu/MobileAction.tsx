import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface MobileActionProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  tint?: string;
  value: string;
}

/** One tile in the mobile action sheet's 2x2 grid of quick actions. */
const MobileAction = ({
  icon,
  label,
  onPress,
  tint = '#6759E8',
  value,
}: MobileActionProps) => (
  <Pressable
    accessibilityLabel={`${label}: ${value}`}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.mobileAction,
      pressed && styles.mobileActionPressed,
    ]}
  >
    <View style={styles.mobileActionIcon}>
      <Ionicons color={tint} name={icon} size={18} />
    </View>
    <Text style={styles.mobileActionLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.mobileActionValue}>
      {value}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  mobileAction: {
    alignItems: 'center',
    backgroundColor: '#F7F6FA',
    borderColor: '#E7E5EC',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexBasis: 120,
    minHeight: 84,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  mobileActionPressed: {
    backgroundColor: '#EEEBFF',
    borderColor: '#C9C2F5',
    transform: [{ scale: 0.98 }],
  },
  mobileActionIcon: {
    alignItems: 'center',
    backgroundColor: '#EEEBFF',
    borderRadius: 9,
    height: 32,
    justifyContent: 'center',
    marginBottom: 6,
    width: 32,
  },
  mobileActionLabel: {
    color: '#777887',
    fontSize: 10,
    fontWeight: '600',
  },
  mobileActionValue: {
    color: '#393A4D',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    maxWidth: '100%',
  },
});

export default MobileAction;
