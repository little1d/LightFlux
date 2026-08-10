import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { translations } from '../../i18n/translations';
import { useTodoStore } from '../../store/todoStore';
import { TodoPriority } from '../../types/todo';
import Tooltip from '../ui/Tooltip';

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
    icon: 'remove-circle-outline',
    rowBackground: 'transparent',
    softBackground: '#F1F1F4',
  },
  high: {
    color: '#CE5264',
    icon: 'alert-circle',
    rowBackground: '#FFF7F8',
    softBackground: '#FCECEF',
  },
  medium: {
    color: '#C67A2D',
    icon: 'flag',
    rowBackground: '#FFFAF3',
    softBackground: '#FFF0DD',
  },
  low: {
    color: '#5278C9',
    icon: 'arrow-down-circle',
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
  const language = useTodoStore((state) => state.language);
  const [hovered, setHovered] = useState(false);
  if (priority === 'none') {
    return null;
  }

  const theme = TASK_PRIORITY_THEME[priority];
  return (
    <View
      accessibilityLabel={translations[language].taskMenu.priorityOptions[priority]}
      accessible
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      style={[
        styles.indicator,
        { backgroundColor: theme.softBackground },
      ]}
    >
      <TaskPriorityIcon priority={priority} />
      <Tooltip
        label={translations[language].taskMenu.priorityOptions[priority]}
        visible={hovered}
      />
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
    position: 'relative',
    width: 22,
  },
});

export default TaskPriorityIndicator;
