import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import Tooltip from '../ui/Tooltip';

interface DesktopNavigationButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  isActive: boolean;
  label: string;
  onPress: () => void;
}

/** One icon button in the desktop sidebar, with its tooltip. */
const DesktopNavigationButton = ({
  icon,
  isActive,
  label,
  onPress,
}: DesktopNavigationButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.desktopNavigationButton}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.navigationButton,
          isActive && styles.navigationButtonActive,
          hovered && !isActive && styles.navigationButtonHovered,
          focused && styles.navigationButtonFocused,
          pressed && styles.navigationButtonPressed,
        ]}
      >
        <Ionicons
          color={isActive ? '#6759E8' : hovered ? '#666778' : '#92939F'}
          name={icon}
          size={22}
        />
      </Pressable>
      <Tooltip
        label={label}
        position="right"
        visible={(hovered || focused) && !isActive}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  desktopNavigationButton: {
    position: 'relative',
  },
  navigationButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 15,
    borderWidth: 2,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  navigationButtonActive: {
    backgroundColor: '#E8E5FF',
  },
  navigationButtonHovered: {
    backgroundColor: '#EFEDF5',
    transform: [{ translateY: -1 }],
  },
  navigationButtonFocused: {
    borderColor: '#AFA6F5',
    shadowColor: '#6759E8',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  navigationButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.93 }],
  },
});

export default DesktopNavigationButton;
