import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';

import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import { translations } from '../content';
import { buildChildCountByParent } from '../store/todoDomain';
import { useTodoStore } from '../store/todoStore';
import { Language, Todo } from '../types/todo';
import {
  addMonths,
  fromDateKey,
  monthGrid,
  toDateKey,
} from '../utils/date';
import TaskIndicators from './tasks/TaskIndicators';
import TaskPriorityIndicator, {
  TaskPriorityIcon,
  TASK_PRIORITY_THEME,
} from './tasks/TaskPriorityIndicator';
import {
  TaskCheckbox,
  TaskMoreButton,
  TaskNestingIndicator,
} from './tasks/TaskRowControls';
import TaskSelectionMarker from './tasks/TaskSelectionMarker';
import {
  OpenTaskMenu,
  useTaskContextMenu,
} from './tasks/useTaskContextMenu';
import ActionButton from './ui/ActionButton';
import IconButton from './ui/IconButton';

interface CalendarDayProps {
  currentMonth: number;
  date: Date;
  groupColors: Map<string, string>;
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
  groupColors,
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
                        groupColors.get(todo.groupId ?? '') ?? '#8B7EFF',
                    },
                  ]}
                />
              )}
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
                    groupColors.get(todo.groupId ?? '') ?? '#8B7EFF',
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
};

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
  childCount: number;
  markActive: string;
  markComplete: string;
}) => {
  const { targetRef, openFromButton, openFromLongPress } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );

  return (
    <Pressable
      accessibilityLabel={`${editLabel}: ${todo.title}`}
      accessibilityRole="button"
      onHoverIn={() => onHoverIn(todo.id)}
      onHoverOut={onHoverOut}
      onPress={() => onEdit(todo.id)}
      onLongPress={openFromLongPress}
      delayLongPress={350}
      ref={targetRef}
      style={({ pressed }) => [
        styles.taskRowBase,
        todo.parentId ? styles.taskRowChild : styles.taskRowRoot,
        todo.priority !== 'none' &&
          !selected && {
            backgroundColor: TASK_PRIORITY_THEME[todo.priority].rowBackground,
          },
        selected && styles.taskRowSelected,
        hovered && !selected && styles.taskRowHovered,
        pressed && styles.taskRowPressed,
      ]}
    >
      <TaskSelectionMarker visible={selected} />
      {todo.parentId ? <TaskNestingIndicator /> : null}
      <TaskCheckbox
        completed={todo.completed}
        markActive={markActive}
        markComplete={markComplete}
        onPress={() => onToggle(todo.id)}
      />
      <View style={styles.taskContent}>
        <Text
          style={[
            styles.taskTitle,
            todo.completed && styles.taskTitleCompleted,
          ]}
          numberOfLines={1}
        >
          {todo.title}
        </Text>
      </View>
      <TaskPriorityIndicator priority={todo.priority} />
      <TaskIndicators childCount={childCount} todo={todo} />
      <View
        style={[styles.taskGroupDot, { backgroundColor: color }]}
      />
      <TaskMoreButton
        label={moreActionsLabel}
        onPress={openFromButton}
      />
    </Pressable>
  );
};

const CalendarScreen = ({
  onAddTask,
  onEditTask,
  onOpenTaskMenu,
  selectedTaskId,
}: {
  onAddTask: (dateKey: string) => void;
  onEditTask: (id: string) => void;
  onOpenTaskMenu: OpenTaskMenu;
  selectedTaskId: string | null;
}) => {
  const { language, todos, groups, toggleTodo } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      groups: state.groups,
      toggleTodo: state.toggleTodo,
    })),
  );
  const labels = translations[language];
  const today = useCurrentDateKey();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [contentWidth, setContentWidth] = useState(0);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);

  const showTaskTitles = contentWidth >= 610;
  const days = useMemo(() => monthGrid(visibleMonth), [visibleMonth]);
  const tasksByDate = useMemo(() => {
    const result = new Map<string, Todo[]>();
    todos.forEach((todo) => {
      const current = result.get(todo.scheduledDate) ?? [];
      current.push(todo);
      result.set(todo.scheduledDate, current);
    });
    return result;
  }, [todos]);
  const groupColors = useMemo(
    () => new Map(groups.map((group) => [group.id, group.color])),
    [groups],
  );
  const childCountByParent = useMemo(
    () => buildChildCountByParent(todos),
    [todos],
  );
  const selectedTodos = tasksByDate.get(selectedDate) ?? [];
  const currentMonthKey = `${visibleMonth.getFullYear()}-${visibleMonth.getMonth()}`;
  const now = fromDateKey(today);
  const todayMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const isAtToday =
    selectedDate === today && currentMonthKey === todayMonthKey;

  const changeMonth = (amount: number) => {
    const nextMonth = addMonths(visibleMonth, amount);
    setVisibleMonth(nextMonth);
    setSelectedDate(toDateKey(nextMonth));
  };

  const selectDate = (date: Date) => {
    setSelectedDate(toDateKey(date));
    if (
      date.getFullYear() !== visibleMonth.getFullYear() ||
      date.getMonth() !== visibleMonth.getMonth()
    ) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const goToday = () => {
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(today);
  };

  const selectedDateLabel = fromDateKey(selectedDate).toLocaleDateString(
    language === 'zh' ? 'zh-CN' : 'en-US',
    { month: 'long', day: 'numeric', weekday: 'long' },
  );

  return (
    <View style={styles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[styles.content, compact && styles.contentCompact]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.header}>
            <Text style={[styles.title, compact && styles.titleCompact]}>
              {labels.calendar.title}
            </Text>
          </View>

          <View
            onLayout={(event) => {
              const nextWidth = Math.round(event.nativeEvent.layout.width);
              if (nextWidth !== contentWidth) {
                setContentWidth(nextWidth);
              }
            }}
            style={styles.workspace}
          >
            <View
              nativeID="calendar-month-panel"
              style={[styles.calendarCard, styles.calendarShadow, styles.calendarBorder]}
            >
              <View style={styles.calendarHeader}>
                <Text style={styles.monthTitle}>
                  {labels.calendar.monthTitle(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth() + 1,
                  )}
                </Text>
                <View style={styles.headerControls}>
                  {!isAtToday ? (
                    <View style={styles.headerSpacer}>
                      <ActionButton
                        label={labels.calendar.today}
                        onPress={goToday}
                        size="small"
                        variant="ghost"
                      />
                    </View>
                  ) : null}
                  <IconButton
                    icon="chevron-back"
                    label={labels.calendar.previousMonth}
                    onPress={() => changeMonth(-1)}
                    size="small"
                  />
                  <View style={styles.controlGap} />
                  <IconButton
                    icon="chevron-forward"
                    label={labels.calendar.nextMonth}
                    onPress={() => changeMonth(1)}
                    size="small"
                  />
                </View>
              </View>

              <View style={styles.weekdayHeader}>
                {labels.calendar.weekdays.map((weekday) => (
                  <View
                    key={weekday}
                    style={[styles.weekColumn, styles.weekdayCell]}
                  >
                    <Text style={styles.weekdayText}>
                      {weekday}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {days.map((date) => {
                  const dateKey = toDateKey(date);
                  return (
                    <CalendarDay
                      currentMonth={visibleMonth.getMonth()}
                      date={date}
                      groupColors={groupColors}
                      key={dateKey}
                      language={language}
                      onSelect={selectDate}
                      selected={dateKey === selectedDate}
                      showTaskTitles={showTaskTitles}
                      taskCountLabel={labels.calendar.tasksForDate}
                      tasks={tasksByDate.get(dateKey) ?? []}
                      today={dateKey === today}
                    />
                  );
                })}
              </View>
            </View>

            {selectedTodos.length > 0 ? (
              <View
                nativeID="calendar-agenda-panel"
                style={styles.agendaList}
              >
                {selectedTodos.map((todo) => (
                  <CalendarTask
                    childCount={childCountByParent.get(todo.id) ?? 0}
                    color={
                      groupColors.get(todo.groupId ?? '') ?? '#8B7EFF'
                    }
                    editLabel={labels.editor.title}
                    hovered={hoveredTask === todo.id}
                    key={todo.id}
                    markActive={labels.markActive}
                    markComplete={labels.markComplete}
                    moreActionsLabel={labels.taskMenu.moreActions}
                    onEdit={onEditTask}
                    onHoverIn={setHoveredTask}
                    onHoverOut={() => setHoveredTask(null)}
                    onOpenMenu={onOpenTaskMenu}
                    onToggle={toggleTodo}
                    selected={selectedTaskId === todo.id}
                    todo={todo}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
        <Pressable
          accessibilityLabel={`${labels.addTask}: ${selectedDateLabel}`}
          accessibilityRole="button"
          onPress={() => onAddTask(selectedDate)}
          style={({ pressed }) => [
            styles.fab,
            compact && styles.fabCompact,
            pressed && styles.fabPressed,
          ]}
        >
          <Ionicons color="#FFFFFF" name="add" size={compact ? 26 : 28} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F3F3F6',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scroll: {
    alignSelf: 'center',
    maxWidth: 1180,
    width: '100%',
  },
  content: {
    paddingBottom: 96,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  contentCompact: {
    paddingBottom: 96,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    paddingBottom: 12,
  },
  title: {
    color: '#232238',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  titleCompact: {
    fontSize: 22,
    letterSpacing: -0.3,
  },
  workspace: {
    width: '100%',
  },
  calendarCard: {
    minWidth: 0,
    width: '100%',
  },
  calendarBorder: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E4EC',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  calendarShadow: {
    shadowColor: '#4B4963',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  calendarHeader: {
    alignItems: 'center',
    borderBottomColor: '#ECEBF1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  monthTitle: {
    color: '#303145',
    fontSize: 18,
    fontWeight: '800',
  },
  headerControls: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerSpacer: {
    marginRight: 8,
  },
  controlGap: {
    width: 6,
  },
  weekdayHeader: {
    backgroundColor: '#FAFAFC',
    borderBottomColor: '#ECEBF1',
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  weekdayCell: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  weekdayText: {
    color: '#9597A5',
    fontSize: 10,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  agendaList: {
    marginTop: 10,
  },
  weekColumn: {
    width: `${100 / 7}%`,
  },
  dayCell: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#EFEEF3',
    borderBottomWidth: 1,
    borderRightColor: '#EFEEF3',
    borderRightWidth: 1,
    padding: 7,
    width: `${100 / 7}%`,
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
    fontWeight: '700',
  },
  dayNumberMuted: {
    color: '#C1C2CA',
  },
  todayNumberText: {
    color: '#FFFFFF',
  },
  dayTaskCount: {
    color: '#A09FAE',
    fontSize: 9,
    fontWeight: '700',
  },
  dayTaskPill: {
    alignItems: 'center',
    backgroundColor: '#F5F4F8',
    borderRadius: 6,
    flexDirection: 'row',
    marginTop: 4,
    minHeight: 18,
    paddingHorizontal: 5,
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
    color: '#555667',
    flex: 1,
    fontSize: 9,
    fontWeight: '600',
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
    backgroundColor: '#EEECFF',
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
  taskGroupDot: {
    borderRadius: 3,
    height: 8,
    marginLeft: 8,
    width: 8,
  },
  fab: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 28,
    bottom: 24,
    elevation: 8,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    shadowColor: '#4B3FC4',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    width: 56,
    zIndex: 60,
  },
  fabCompact: {
    borderRadius: 26,
    bottom: 86,
    height: 52,
    right: 18,
    width: 52,
  },
  fabPressed: {
    backgroundColor: '#594CCD',
    transform: [{ scale: 0.94 }],
  },
});

export default CalendarScreen;
