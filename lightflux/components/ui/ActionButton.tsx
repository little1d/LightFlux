import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

interface ActionButtonProps {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  size?: 'small' | 'medium';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

const ActionButton = ({
  disabled = false,
  label,
  onPress,
  size = 'medium',
  variant = 'primary',
}: ActionButtonProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.medium,
        styles[variant],
        hovered && !disabled && styles[`${variant}Hovered`],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.label,
          size === 'small' && styles.smallLabel,
          variant === 'primary'
            ? styles.lightLabel
            : variant === 'danger'
              ? styles.dangerLabel
              : styles.darkLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 9,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  small: {
    minHeight: 32,
  },
  medium: {
    minHeight: 36,
  },
  primary: {
    backgroundColor: '#6759E8',
  },
  primaryHovered: {
    backgroundColor: '#594CCD',
  },
  secondary: {
    backgroundColor: '#ECEAF5',
  },
  secondaryHovered: {
    backgroundColor: '#E1DEEF',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  ghostHovered: {
    backgroundColor: '#F0EFF4',
  },
  danger: {
    backgroundColor: '#FCEDEF',
  },
  dangerHovered: {
    backgroundColor: '#F8DFE3',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    backgroundColor: '#C9C6DD',
    opacity: 0.78,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  smallLabel: {
    fontSize: 11,
  },
  lightLabel: {
    color: '#FFFFFF',
  },
  darkLabel: {
    color: '#555667',
  },
  dangerLabel: {
    color: '#C84F60',
  },
});

export default ActionButton;
