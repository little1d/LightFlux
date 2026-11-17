import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Language, Todo } from '../../types/todo';
import { TaskPriorityIcon } from '../tasks/TaskPriorityIndicator';

export interface CalendarDayProps {
  currentMonth: number;
  date: Date;
  projectColors: Map<string, string>;
  language: Language;
  onSelect: (date: Date) => void;
  selected: boolean;
  showTaskTitles: boolean;
  taskCountLabel: (count: number) => string;
  tasks: Todo[];
  today: boolean;
}

const CalendarDay = ({
  currentMonth,
  date,
  projectColors,
  language,
  onSelect,
  selected,
  showTaskTitles,
  taskCountLabel,
  tasks,
  today,
}: CalendarDayProps) => {
  const [hovered, setHovered] = useState(false);
  const inCurrentMonth = date.getMonth() === currentMonth;
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <Pressable
      accessibilityLabel={`${date.toLocaleDateString(
        language === 'zh' ? 'zh-CN' : 'en-US',
      )}, ${taskCountLabel(tasks.length)}`}
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => onSelect(date)}
      style={({ pressed }) => [
        styles.dayCell,
        { minHeight: showTaskTitles ? 84 : 62 },
        selected && styles.daySelected,
        hovered && !selected && styles.dayHovered,
        hovered && selected && styles.daySelectedHovered,
        pressed && styles.dayPressed,
      ]}
    >
      <View style={styles.dayHeader}>
        <View style={[styles.dayNumber, today && styles.todayNumber]}>
          <Text
            style={[
              styles.dayNumberText,
              !inCurrentMonth && styles.dayNumberMuted,
              isWeekend && inCurrentMonth && styles.dayNumberWeekend,
              today && styles.todayNumberText,
            ]}
          >
            {date.getDate()}
          </Text>
        </View>
        {tasks.length > 0 ? (
          <Text style={styles.dayTaskCount}>{tasks.length}</Text>
        ) : null}
      </View>

      {showTaskTitles ? (
        <>
          {tasks.slice(0, 2).map((todo) => (
            <View key={todo.id} style={styles.dayTaskPill}>
              {todo.priority !== 'none' ? (
                <View style={styles.dayTaskPriority}>
                  <TaskPriorityIcon priority={todo.priority} size={10} />
                </View>
              ) : (
                <View
                  style={[
                    styles.dayTaskDot,
                    {
                      backgroundColor:
                        projectColors.get(todo.projectId ?? '') ?? '#8B7EFF',
                    },
                  ]}
                />
              )}
              {todo.scheduledTime ? (
                <Text style={styles.dayTaskTime}>{todo.scheduledTime}</Text>
              ) : null}
              <Text numberOfLines={1} style={styles.dayTaskTitle}>
                {todo.title}
              </Text>
            </View>
          ))}
          {tasks.length > 2 ? (
            <Text style={styles.moreTasks}>+{tasks.length - 2}</Text>
          ) : null}
        </>
      ) : tasks.length > 0 ? (
        <View style={styles.compactDots}>
          {tasks.slice(0, 3).map((todo) => (
            <View
              key={todo.id}
              style={[
                styles.compactDot,
                {
                  backgroundColor:
                    projectColors.get(todo.projectId ?? '') ?? '#8B7EFF',
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  dayCell: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#EFEEF3',
    borderBottomWidth: 1,
    borderRightColor: '#EFEEF3',
    borderRightWidth: 1,
    flex: 1,
    minWidth: 0,
    padding: 7,
  },
  dayHovered: {
    backgroundColor: '#F7F6FB',
  },
  daySelected: {
    backgroundColor: '#F0EEFF',
  },
  daySelectedHovered: {
    backgroundColor: '#E8E5FF',
  },
  dayPressed: {
    opacity: 0.72,
  },
  dayHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayNumber: {
    alignItems: 'center',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    minWidth: 22,
  },
  todayNumber: {
    backgroundColor: '#6759E8',
  },
  dayNumberText: {
    color: '#454659',
    fontSize: 11,
    fontWeight: '600',
  },
  dayNumberMuted: {
    color: '#C1C2CA',
  },
  dayNumberWeekend: {
    color: '#9798A4',
  },
  todayNumberText: {
    color: '#FFFFFF',
  },
  dayTaskCount: {
    color: '#A09FAE',
    fontSize: 9,
    fontWeight: '600',
  },
  dayTaskPill: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 3,
    minHeight: 17,
    paddingHorizontal: 1,
  },
  dayTaskDot: {
    borderRadius: 3,
    height: 6,
    marginRight: 5,
    width: 6,
  },
  dayTaskPriority: {
    alignItems: 'center',
    height: 12,
    justifyContent: 'center',
    marginRight: 3,
    width: 12,
  },
  dayTaskTitle: {
    color: '#535466',
    flex: 1,
    fontSize: 9,
    fontWeight: '500',
  },
  dayTaskTime: {
    color: '#777786',
    fontSize: 8,
    fontWeight: '600',
    marginRight: 4,
  },
  moreTasks: {
    color: '#999BA8',
    fontSize: 8,
    marginTop: 2,
  },
  compactDots: {
    flexDirection: 'row',
    marginTop: 5,
  },
  compactDot: {
    borderRadius: 3,
    height: 6,
    marginRight: 3,
    width: 6,
  },
});

export default CalendarDay;
