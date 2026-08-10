import React from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

export const TaskNestingIndicator = () => (
  <Text style={styles.nestingIndicator}>↳</Text>
);

export const TaskCheckbox = ({
  completed,
  markActive,
  markComplete,
  muted = false,
  onPress,
  uncheckedBorderColor = '#C5C2D4',
}: {
  completed: boolean;
  markActive: string;
  markComplete: string;
  muted?: boolean;
  onPress: () => void;
  uncheckedBorderColor?: string;
}) => (
  <Pressable
    accessibilityLabel={completed ? markActive : markComplete}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: completed }}
    hitSlop={8}
    onPress={onPress}
    style={({ pressed }) => [
      styles.checkbox,
      {
        backgroundColor: completed
          ? muted
            ? '#D8D8DE'
            : '#6759E8'
          : 'transparent',
        borderColor: completed
          ? muted
            ? '#D8D8DE'
            : '#6759E8'
          : uncheckedBorderColor,
      },
      pressed && styles.pressed,
    ]}
  >
    {completed ? <Text style={styles.checkmark}>✓</Text> : null}
  </Pressable>
);

export const TaskMoreButton = ({
  label,
  onPress,
}: {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
}) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    hitSlop={8}
    onPress={onPress}
    style={({ pressed }) => [
      styles.moreButton,
      pressed && styles.pressed,
    ]}
  >
    <Text style={styles.moreText}>⋯</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  checkbox: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 15,
  },
  nestingIndicator: {
    color: '#A09EAC',
    fontSize: 12,
    marginRight: 6,
  },
  moreButton: {
    alignItems: 'center',
    borderRadius: 10,
    height: 28,
    justifyContent: 'center',
    marginLeft: 4,
    width: 28,
  },
  moreText: {
    color: '#9293A0',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.68,
  },
});
