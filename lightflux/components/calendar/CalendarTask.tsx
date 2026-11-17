import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Todo } from '../../types/todo';
import TaskIndicators from '../tasks/TaskIndicators';
import TaskPriorityIndicator, {
  TASK_PRIORITY_THEME,
} from '../tasks/TaskPriorityIndicator';
import {
  TaskCheckbox,
  TaskMoreButton,
  TaskNestingIndicator,
} from '../tasks/TaskRowControls';
import { OpenTaskMenu, useTaskContextMenu } from '../tasks/useTaskContextMenu';

const CalendarTask = ({
  todo,
  color,
  editLabel,
  moreActionsLabel,
  hovered,
  onEdit,
  onHoverIn,
  onHoverOut,
  onOpenMenu,
  onToggle,
  selected,
  showProjectColor,
  childCount,
  markActive,
  markComplete,
}: {
  todo: Todo;
  color: string;
  editLabel: string;
  moreActionsLabel: string;
  hovered: boolean;
  onEdit: (id: string) => void;
  onHoverIn: (id: string) => void;
  onHoverOut: () => void;
  onOpenMenu: OpenTaskMenu;
  onToggle: (id: string) => void;
  selected: boolean;
  showProjectColor: boolean;
  childCount: number;
  markActive: string;
  markComplete: string;
}) => {
  const { targetRef, openFromButton, openFromLongPress } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );

  return (
    <View
      accessibilityState={{ selected }}
      onPointerEnter={() => onHoverIn(todo.id)}
      onPointerLeave={onHoverOut}
      ref={targetRef}
      style={[
        styles.taskRowBase,
        todo.parentId ? styles.taskRowChild : styles.taskRowRoot,
        todo.priority !== 'none' &&
          !selected && {
            backgroundColor: TASK_PRIORITY_THEME[todo.priority].rowBackground,
          },
        selected && styles.taskRowSelected,
        hovered && !selected && styles.taskRowHovered,
      ]}
    >
      {todo.parentId ? <TaskNestingIndicator /> : null}
      <TaskCheckbox
        completed={todo.completed}
        markActive={markActive}
        markComplete={markComplete}
        onPress={() => onToggle(todo.id)}
      />
      <Pressable
        accessibilityLabel={`${editLabel}: ${todo.title}`}
        accessibilityRole="button"
        delayLongPress={350}
        onLongPress={openFromLongPress}
        onPress={() => onEdit(todo.id)}
        style={({ pressed }) => [
          styles.taskContent,
          pressed && styles.taskRowPressed,
        ]}
      >
        <Text
          style={[styles.taskTitle, todo.completed && styles.taskTitleCompleted]}
          numberOfLines={1}
        >
          {todo.title}
        </Text>
      </Pressable>
      <TaskPriorityIndicator priority={todo.priority} />
      <TaskIndicators childCount={childCount} todo={todo} />
      {showProjectColor ? (
        <View style={[styles.taskProjectDot, { backgroundColor: color }]} />
      ) : null}
      <TaskMoreButton label={moreActionsLabel} onPress={openFromButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  taskRowBase: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    flexDirection: 'row',
    marginBottom: 4,
    minHeight: 44,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  taskRowRoot: {
    minHeight: 44,
  },
  taskRowChild: {
    marginLeft: 20,
    minHeight: 38,
  },
  taskRowHovered: {
    backgroundColor: '#F5F4F8',
  },
  taskRowSelected: {
    backgroundColor: '#F2F1FC',
  },
  taskRowPressed: {
    opacity: 0.62,
  },
  taskContent: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 8,
  },
  taskTitle: {
    color: '#343548',
    fontSize: 13,
    fontWeight: '600',
  },
  taskTitleCompleted: {
    color: '#9A9BAA',
    textDecorationLine: 'line-through',
  },
  taskProjectDot: {
    borderRadius: 3,
    height: 8,
    marginLeft: 8,
    width: 8,
  },
});

export default CalendarTask;
