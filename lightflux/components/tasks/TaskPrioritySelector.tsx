import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TodoPriority } from '../../types/todo';
import {
  TASK_PRIORITY_THEME,
  TaskPriorityIcon,
} from './TaskPriorityIndicator';
import Tooltip from '../ui/Tooltip';

const PRIORITIES: TodoPriority[] = ['none', 'high', 'medium', 'low'];

interface PriorityOptionProps {
  label: string;
  onPress: () => void;
  priority: TodoPriority;
  selected: boolean;
}

const PriorityOption = ({
  label,
  onPress,
  priority,
  selected,
}: PriorityOptionProps) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const theme = TASK_PRIORITY_THEME[priority];

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      nativeID={`priority-option-${priority}`}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && {
          backgroundColor: theme.softBackground,
          borderColor: theme.color,
        },
        hovered && !selected && styles.optionHovered,
        focused && styles.optionFocused,
        pressed && styles.optionPressed,
      ]}
    >
      <TaskPriorityIcon priority={priority} size={16} />
      <Tooltip label={label} visible={hovered || focused} />
    </Pressable>
  );
};

interface TaskPrioritySelectorProps {
  label: string;
  labels: Record<TodoPriority, string>;
  onChange: (priority: TodoPriority) => void;
  value: TodoPriority;
}

const TaskPrioritySelector = ({
  label,
  labels,
  onChange,
  value,
}: TaskPrioritySelectorProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View accessibilityRole="radiogroup" style={styles.options}>
      {PRIORITIES.map((priority) => (
        <PriorityOption
          key={priority}
          label={labels[priority]}
          onPress={() => onChange(priority)}
          priority={priority}
          selected={value === priority}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    marginVertical: 2,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  label: {
    color: '#636474',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  options: {
    flexDirection: 'row',
    gap: 4,
  },
  option: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    position: 'relative',
    width: 30,
  },
  optionHovered: {
    backgroundColor: '#F3F2F6',
    transform: [{ translateY: -1 }],
  },
  optionFocused: {
    borderColor: '#AFA6F5',
    shadowColor: '#6759E8',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  optionPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
});

export default TaskPrioritySelector;
