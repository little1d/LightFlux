import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
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
import { DESKTOP_LAYOUT_BREAKPOINT } from '../config/layout';
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
import {
  OpenTaskMenu,
  useTaskContextMenu,
} from './tasks/useTaskContextMenu';
import MobileQuickAddButton from './tasks/MobileQuickAddButton';

interface CalendarDayProps {
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

interface CircleNavButtonProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}

const CircleNavButton = ({ icon, label, onPress }: CircleNavButtonProps) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRound,
        hovered && styles.navRoundHover,
        pressed && styles.navRoundPressed,
      ]}
    >
      <Ionicons
        color={hovered ? '#6759E8' : '#858692'}
        name={icon}
        size={16}
      />
    </Pressable>
  );
};

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
          style={[
            styles.taskTitle,
            todo.completed && styles.taskTitleCompleted,
          ]}
          numberOfLines={1}
        >
          {todo.title}
        </Text>
      </Pressable>
      <TaskPriorityIndicator priority={todo.priority} />
      <TaskIndicators childCount={childCount} todo={todo} />
      {showProjectColor ? (
        <View
          style={[styles.taskProjectDot, { backgroundColor: color }]}
        />
      ) : null}
      <TaskMoreButton
        label={moreActionsLabel}
        onPress={openFromButton}
      />
    </View>
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
  const { language, todos, projects, toggleTodo } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      projects: state.projects,
      toggleTodo: state.toggleTodo,
    })),
  );
  const labels = translations[language];
  const today = useCurrentDateKey();
  const { width } = useWindowDimensions();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);

  // Density follows the measured viewport width (the ScrollView's own width,
  // capped at maxWidth). We deliberately measure the viewport rather than the
  // padded inner content: the inner content width depends on `compact` (which
  // toggles the horizontal padding), so measuring it would create a feedback
  // loop — shrinking past the threshold flips padding, which changes the inner
  // width back across the threshold, and the layout jitters. The viewport width
  // is independent of that decision, so the thresholds stay stable.
  const showTaskTitles = viewportWidth >= 600;
  const compact = viewportWidth > 0 && viewportWidth < 560;
  const mobileFab = width < DESKTOP_LAYOUT_BREAKPOINT;
  const days = useMemo(() => monthGrid(visibleMonth), [visibleMonth]);
  // Chunk the flat day list into weeks so each row is a flex container whose
  // seven cells split the measured width evenly. Flex sizing (rather than a
  // hardcoded `${100/7}%`) keeps the grid within the viewport at every width.
  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      result.push(days.slice(index, index + 7));
    }
    return result;
  }, [days]);
  const tasksByDate = useMemo(() => {
    const result = new Map<string, Todo[]>();
    todos.forEach((todo) => {
      const current = result.get(todo.scheduledDate) ?? [];
      current.push(todo);
      result.set(todo.scheduledDate, current);
    });
    return result;
  }, [todos]);
  const projectColors = useMemo(
    () => new Map(projects.map((project) => [project.id, project.color])),
    [projects],
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
  const selectedDateObject = fromDateKey(selectedDate);
  const agendaDateTitle =
    language === 'zh'
      ? `${selectedDateObject.getMonth() + 1}月${selectedDateObject.getDate()}日 ${selectedDateObject.toLocaleDateString('zh-CN', { weekday: 'short' })}`
      : selectedDateObject.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          weekday: 'short',
        });

  return (
    <View style={styles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            mobileFab && styles.contentNarrow,
            compact && styles.contentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
          onLayout={(event) => {
            const nextWidth = Math.round(event.nativeEvent.layout.width);
            if (nextWidth !== viewportWidth) {
              setViewportWidth(nextWidth);
            }
          }}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View style={styles.workspace}>
            <View
              nativeID="calendar-month-panel"
              style={[styles.calendarCard, styles.calendarShadow, styles.calendarBorder]}
            >
              <View style={styles.calendarHeader}>
                <View style={styles.monthTitleGroup}>
                  <Text style={styles.monthTitleBig}>
                    {visibleMonth.toLocaleDateString(
                      language === 'zh' ? 'zh-CN' : 'en-US',
                      { month: language === 'zh' ? 'numeric' : 'long' },
                    )}
                  </Text>
                  <Text style={styles.monthYear}>
                    {visibleMonth.getFullYear()}
                  </Text>
                </View>
                <View style={styles.headerControls}>
                  {!isAtToday ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={goToday}
                      style={({ pressed }) => [
                        styles.todayPill,
                        pressed && styles.todayPillPressed,
                      ]}
                    >
                      <Text style={styles.todayPillText}>
                        {labels.calendar.today}
                      </Text>
                    </Pressable>
                  ) : null}
                  <CircleNavButton
                    icon="chevron-back"
                    label={labels.calendar.previousMonth}
                    onPress={() => changeMonth(-1)}
                  />
                  <View style={styles.controlGap} />
                  <CircleNavButton
                    icon="chevron-forward"
                    label={labels.calendar.nextMonth}
                    onPress={() => changeMonth(1)}
                  />
                </View>
              </View>

              <View style={styles.weekdayHeader}>
                {labels.calendar.weekdays.map((weekday, index) => {
                  const isWeekend = index === 0 || index === 6;
                  return (
                    <View
                      key={weekday}
                      style={[styles.weekColumn, styles.weekdayCell]}
                    >
                      <Text
                        style={[
                          styles.weekdayText,
                          isWeekend && styles.weekdayTextWeekend,
                        ]}
                      >
                        {weekday}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.daysGrid}>
                {weeks.map((week) => (
                  <View key={toDateKey(week[0])} style={styles.weekRow}>
                    {week.map((date) => {
                      const dateKey = toDateKey(date);
                      return (
                        <CalendarDay
                          currentMonth={visibleMonth.getMonth()}
                          date={date}
                          projectColors={projectColors}
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
                ))}
              </View>
            </View>

            {selectedTodos.length > 0 ? (
              <View
                nativeID="calendar-agenda-panel"
                style={styles.agendaList}
              >
                <View style={styles.agendaHeader}>
                  <Text style={styles.agendaHeaderTitle}>
                    {agendaDateTitle}
                  </Text>
                  <Text style={styles.agendaHeaderCount}>
                    {labels.calendar.tasksForDate(selectedTodos.length)}
                  </Text>
                </View>
                {selectedTodos.map((todo) => (
                  <CalendarTask
                    childCount={childCountByParent.get(todo.id) ?? 0}
                    color={
                      projectColors.get(todo.projectId ?? '') ?? '#8B7EFF'
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
                    showProjectColor={!mobileFab}
                    todo={todo}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
        {mobileFab ? (
          <MobileQuickAddButton
            insideContentPane
            label={`${labels.addTask}: ${selectedDateLabel}`}
            onPress={() => onAddTask(selectedDate)}
          />
        ) : (
          <Pressable
            accessibilityLabel={`${labels.addTask}: ${selectedDateLabel}`}
            accessibilityRole="button"
            onPress={() => onAddTask(selectedDate)}
            style={({ pressed }) => [
              styles.fab,
              pressed && styles.fabPressed,
            ]}
          >
            <Ionicons color="#FFFFFF" name="add" size={28} />
          </Pressable>
        )}
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
    maxWidth: 900,
    width: '100%',
  },
  content: {
    paddingBottom: 96,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  contentNarrow: {
    paddingTop: 70,
  },
  contentCompact: {
    paddingBottom: 96,
    paddingHorizontal: 16,
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
  monthTitleGroup: {
    alignItems: 'baseline',
    flexDirection: 'row',
  },
  monthTitleBig: {
    color: '#2B2C3E',
    fontSize: 23,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  monthYear: {
    color: '#A8A9B5',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  headerControls: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  todayPill: {
    backgroundColor: '#F1EEFE',
    borderRadius: 9,
    marginRight: 10,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  todayPillPressed: {
    backgroundColor: '#E7E3FC',
  },
  todayPillText: {
    color: '#6759E8',
    fontSize: 11,
    fontWeight: '600',
  },
  navRound: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  navRoundHover: {
    backgroundColor: '#F3F1FE',
  },
  navRoundPressed: {
    backgroundColor: '#E9E5FC',
  },
  controlGap: {
    width: 4,
  },
  weekdayHeader: {
    borderBottomColor: '#F0EFF4',
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  weekdayCell: {
    alignItems: 'center',
    paddingVertical: 9,
  },
  weekdayText: {
    color: '#9597A5',
    fontSize: 10,
    fontWeight: '600',
  },
  weekdayTextWeekend: {
    color: '#B2B3BE',
  },
  daysGrid: {
    flexDirection: 'column',
  },
  agendaList: {
    marginTop: 10,
  },
  agendaHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  agendaHeaderTitle: {
    color: '#3A3B4D',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  agendaHeaderCount: {
    color: '#A0A1AC',
    fontSize: 11,
    fontWeight: '500',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekColumn: {
    flex: 1,
    minWidth: 0,
  },
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
  fabPressed: {
    backgroundColor: '#594CCD',
    transform: [{ scale: 0.94 }],
  },
});

export default CalendarScreen;
