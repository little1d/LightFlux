import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { MenuSurfacePosition } from '../../ui/MenuSurface';

interface SelectFieldProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onOpen: (position: MenuSurfacePosition) => void;
  value: string;
}

/**
 * A read-only field that opens a popover menu. It reports where the menu should
 * be anchored instead of rendering the menu itself, so the caller keeps a single
 * `MenuSurface` for the whole form.
 */
const SelectField = ({ icon, label, onOpen, value }: SelectFieldProps) => {
  const ref = useRef<View>(null);

  const open = () => {
    if (Platform.OS === 'web') {
      const element = ref.current as unknown as HTMLElement | null;
      const bounds = element?.getBoundingClientRect?.();
      if (bounds) {
        onOpen({ x: bounds.left, y: bounds.bottom + 6 });
        return;
      }
    }
    ref.current?.measureInWindow((x, y, _width, height) => {
      onOpen({ x, y: y + height + 6 });
    });
  };

  return (
    <Pressable
      accessibilityLabel={`${label}: ${value}`}
      accessibilityRole="button"
      onPress={open}
      ref={ref}
      style={({ pressed }) => [
        styles.selectField,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.selectLabelRow}>
        <Ionicons color="#8A8798" name={icon} size={13} />
        <Text style={styles.selectLabel}>{label}</Text>
      </View>
      <View style={styles.selectValueRow}>
        <Text numberOfLines={1} style={styles.selectValue}>
          {value}
        </Text>
        <Ionicons color="#AAA7B5" name="chevron-down" size={13} />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  selectField: {
    backgroundColor: '#F8F7FA',
    borderColor: '#E1DFE8',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  selectLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  selectLabel: {
    color: '#8A8798',
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 5,
  },
  selectValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  selectValue: {
    color: '#3C3D50',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 5,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});

export default SelectField;
