import Ionicons from '@expo/vector-icons/Ionicons';
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
import { useShallow } from 'zustand/react/shallow';

import { DESKTOP_LAYOUT_BREAKPOINT } from '../config/layout';
import { translations } from '../content';
import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import { buildChildCountByParent } from '../store/todoDomain';
import { useTodoStore } from '../store/todoStore';
import { Todo } from '../types/todo';
import { addMonths, fromDateKey, monthGrid, toDateKey } from '../utils/date';
import CalendarDay from './calendar/CalendarDay';
import CalendarTask from './calendar/CalendarTask';
import CircleNavButton from './calendar/CircleNavButton';
import MobileQuickAddButton from './tasks/MobileQuickAddButton';
import { OpenTaskMenu } from './tasks/useTaskContextMenu';

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
              style={[
                styles.calendarCard,
                styles.calendarShadow,
                styles.calendarBorder,
              ]}
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
              <View nativeID="calendar-agenda-panel" style={styles.agendaList}>
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
            style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
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
