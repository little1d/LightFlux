import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import Tooltip, { TooltipPosition } from './Tooltip';

interface IconButtonProps {
  disabled?: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  showTooltip?: boolean;
  size?: 'compact' | 'small' | 'medium' | 'large';
  tooltipPosition?: TooltipPosition;
  variant?: 'neutral' | 'primary' | 'transparent' | 'solid';
}

const IconButton = ({
  disabled = false,
  icon,
  label,
  onPress,
  showTooltip = true,
  size = 'medium',
  tooltipPosition = 'top',
  variant = 'neutral',
}: IconButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const iconColor =
    variant === 'solid'
      ? '#FFFFFF'
      : variant === 'primary'
        ? '#6759E8'
        : '#666778';

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={disabled}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={(event) => {
          setHovered(false);
          onPress(event);
        }}
        style={({ pressed }) => [
          styles.base,
          size === 'compact'
            ? styles.compact
            : size === 'small'
              ? styles.small
              : size === 'large'
                ? styles.large
                : styles.medium,
          styles[variant],
          hovered && !disabled && styles[`${variant}Hovered`],
          focused && !disabled && styles.focused,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <Ionicons
          color={iconColor}
          name={icon}
          size={
            size === 'compact' || size === 'small'
              ? 16
              : size === 'large'
                ? 20
                : 18
          }
        />
      </Pressable>
      {showTooltip ? (
        <Tooltip
          label={label}
          position={tooltipPosition}
          visible={(hovered || focused) && !disabled}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  base: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
  },
  compact: {
    height: 28,
    width: 28,
  },
  small: {
    height: 32,
    width: 32,
  },
  medium: {
    height: 36,
    width: 36,
  },
  large: {
    height: 40,
    width: 40,
  },
  neutral: {
    backgroundColor: '#F3F2F6',
  },
  neutralHovered: {
    backgroundColor: '#E9E7F0',
  },
  primary: {
    backgroundColor: '#F0EEFF',
  },
  primaryHovered: {
    backgroundColor: '#E4E0FF',
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  transparentHovered: {
    backgroundColor: '#EFEDF5',
  },
  solid: {
    backgroundColor: '#6759E8',
  },
  solidHovered: {
    backgroundColor: '#594CCD',
  },
  focused: {
    borderColor: '#AFA6F5',
    shadowColor: '#6759E8',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.92 }],
  },
  disabled: {
    opacity: 0.42,
  },
});

export default IconButton;
