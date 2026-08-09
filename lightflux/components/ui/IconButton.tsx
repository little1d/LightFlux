import Ionicons from '@expo/vector-icons/Ionicons';
import React, { ComponentProps, useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
} from 'react-native';

interface IconButtonProps {
  disabled?: boolean;
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  size?: 'small' | 'medium';
  variant?: 'neutral' | 'primary';
}

const IconButton = ({
  disabled = false,
  icon,
  label,
  onPress,
  size = 'medium',
  variant = 'neutral',
}: IconButtonProps) => {
  const [hovered, setHovered] = useState(false);
  const iconColor = variant === 'primary' ? '#6759E8' : '#666778';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.medium,
        variant === 'primary' ? styles.primary : styles.neutral,
        hovered &&
          !disabled &&
          (variant === 'primary'
            ? styles.primaryHovered
            : styles.neutralHovered),
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons
        color={iconColor}
        name={icon}
        size={size === 'small' ? 16 : 18}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
  },
  small: {
    height: 32,
    width: 32,
  },
  medium: {
    height: 36,
    width: 36,
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
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.92 }],
  },
  disabled: {
    opacity: 0.42,
  },
});

export default IconButton;
