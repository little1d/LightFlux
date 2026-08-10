import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface MenuItemProps {
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  onPress: () => void;
  selected?: boolean;
  trailing?: React.ReactNode;
}

const MenuItem = ({
  danger = false,
  disabled = false,
  icon,
  label,
  onPress,
  selected = false,
  trailing,
}: MenuItemProps) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="menuitem"
      disabled={disabled}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        selected && styles.selected,
        hovered && !selected && styles.hovered,
        focused && styles.focused,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          danger && styles.dangerLabel,
          selected && styles.selectedLabel,
        ]}
      >
        {label}
      </Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: 'row',
    marginVertical: 2,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  selected: {
    backgroundColor: '#F0EEFF',
  },
  hovered: {
    backgroundColor: '#F3F2F6',
  },
  focused: {
    backgroundColor: '#F5F3FF',
    borderColor: '#B9B2F2',
  },
  pressed: {
    backgroundColor: '#EAE8F1',
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.4,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    width: 20,
  },
  label: {
    color: '#38394C',
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  dangerLabel: {
    color: '#C84F60',
  },
  selectedLabel: {
    color: '#6759E8',
    fontWeight: '700',
  },
  trailing: {
    marginLeft: 10,
  },
});

export default MenuItem;
