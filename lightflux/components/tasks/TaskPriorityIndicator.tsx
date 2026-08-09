import Ionicons from '@expo/vector-icons/Ionicons';
import React, { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { TodoPriority } from '../../types/todo';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface PriorityTheme {
  color: string;
  icon: IconName;
  rowBackground: string;
  softBackground: string;
}

export const TASK_PRIORITY_THEME: Record<TodoPriority, PriorityTheme> = {
  none: {
    color: '#9294A1',
    icon: 'remove-outline',
    rowBackground: 'transparent',
    softBackground: '#F1F1F4',
  },
  high: {
    color: '#CE5264',
    icon: 'chevron-up',
    rowBackground: '#FFF7F8',
    softBackground: '#FCECEF',
  },
  medium: {
    color: '#C67A2D',
    icon: 'remove',
    rowBackground: '#FFFAF3',
    softBackground: '#FFF0DD',
  },
  low: {
    color: '#5278C9',
    icon: 'chevron-down',
    rowBackground: '#F6F8FF',
    softBackground: '#EAF0FF',
  },
};

export const TaskPriorityIcon = ({
  priority,
  size = 13,
}: {
  priority: TodoPriority;
  size?: number;
}) => {
  const theme = TASK_PRIORITY_THEME[priority];
  return <Ionicons color={theme.color} name={theme.icon} size={size} />;
};

const TaskPriorityIndicator = ({
  priority,
}: {
  priority: TodoPriority;
}) => {
  if (priority === 'none') {
    return null;
  }

  const theme = TASK_PRIORITY_THEME[priority];
  return (
    <View
      pointerEvents="none"
      style={[
        styles.indicator,
        { backgroundColor: theme.softBackground },
      ]}
    >
      <TaskPriorityIcon priority={priority} />
    </View>
  );
};

const styles = StyleSheet.create({
  indicator: {
    alignItems: 'center',
    borderRadius: 7,
    height: 22,
    justifyContent: 'center',
    marginLeft: 6,
    width: 22,
  },
});

export default TaskPriorityIndicator;
