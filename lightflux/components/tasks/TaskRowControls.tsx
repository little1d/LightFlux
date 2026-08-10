import { useState } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import IconButton from '../ui/IconButton';
import Tooltip from '../ui/Tooltip';

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
}) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const label = completed ? markActive : markComplete;

  return (
    <View style={styles.checkboxWrapper}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        hitSlop={8}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.checkbox,
          {
            backgroundColor: completed
              ? muted
                ? '#D8D8DE'
                : '#6759E8'
              : hovered
                ? '#F5F3FF'
                : 'transparent',
            borderColor: completed
              ? muted
                ? '#D8D8DE'
                : '#6759E8'
              : hovered
                ? '#8E82EC'
                : uncheckedBorderColor,
          },
          focused && styles.checkboxFocused,
          pressed && styles.pressed,
        ]}
      >
        {completed ? <Text style={styles.checkmark}>✓</Text> : null}
      </Pressable>
      <Tooltip label={label} visible={hovered || focused} />
    </View>
  );
};

export const TaskMoreButton = ({
  label,
  onPress,
}: {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
}) => (
  <View style={styles.moreButtonPosition}>
    <IconButton
      icon="ellipsis-horizontal"
      label={label}
      onPress={onPress}
      size="compact"
      variant="transparent"
    />
  </View>
);

const styles = StyleSheet.create({
  checkboxWrapper: {
    position: 'relative',
  },
  checkbox: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  checkboxFocused: {
    borderColor: '#8E82EC',
    shadowColor: '#6759E8',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
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
  moreButtonPosition: {
    marginLeft: 4,
  },
  pressed: {
    opacity: 0.68,
  },
});
