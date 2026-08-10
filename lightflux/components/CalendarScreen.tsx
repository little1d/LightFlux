import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../config/input';
import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import { translations } from '../i18n/translations';
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
              <View
                style={[
                  styles.dayTaskDot,
                  {
                    backgroundColor:
                      groupColors.get(todo.groupId ?? '') ?? '#8B7EFF',
                  },
                ]}
              />
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
  onEdit,
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
  onEdit: (id: string) => void;
  onOpenMenu: OpenTaskMenu;
  onToggle: (id: string) => void;
  selected: boolean;
  childCount: number;
  markActive: string;
  markComplete: string;
}) => {
  const [hovered, setHovered] = useState(false);
  const { targetRef, openFromButton, openFromLongPress } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );

  return (
    <View
      className={`${todo.parentId ? 'ml-5 min-h-[38px]' : 'min-h-[44px]'} mb-1 flex-row items-center overflow-hidden rounded-[11px] px-2`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      ref={targetRef}
      style={[
        styles.taskRow,
        selected && styles.taskRowSelected,
        hovered && !selected && styles.taskRowHovered,
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
      <Pressable
        accessibilityLabel={`${editLabel}: ${todo.title}`}
        accessibilityRole="button"
        className="ml-2.5 flex-1 py-2"
        delayLongPress={350}
        onLongPress={openFromLongPress}
        onPress={() => onEdit(todo.id)}
        style={({ pressed }) => pressed && styles.taskTitlePressed}
      >
        <Text
          className={`text-[13px] font-semibold ${
            todo.completed ? 'text-[#9A9BAA] line-through' : 'text-[#343548]'
          }`}
          numberOfLines={1}
        >
          {todo.title}
        </Text>
      </Pressable>
      <TaskIndicators childCount={childCount} todo={todo} />
      <View
        className="ml-2 h-2 w-2 rounded"
        style={{ backgroundColor: color }}
      />
      <TaskMoreButton
        label={moreActionsLabel}
        onPress={openFromButton}
      />
    </View>
  );
};

const CalendarScreen = ({
  onEditTask,
  onOpenTaskMenu,
  selectedTaskId,
}: {
  onEditTask: (id: string) => void;
  onOpenTaskMenu: OpenTaskMenu;
  selectedTaskId: string | null;
}) => {
  const {
    language,
    todos,
    groups,
    addTodo,
    toggleTodo,
  } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      groups: state.groups,
      addTodo: state.addTodo,
      toggleTodo: state.toggleTodo,
    })),
  );
  const labels = translations[language];
  const today = useCurrentDateKey();
  const [contentWidth, setContentWidth] = useState(0);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [draft, setDraft] = useState('');

  const sideBySide = contentWidth >= 880;
  const calendarWidth = sideBySide ? contentWidth - 350 : contentWidth;
  const showTaskTitles = calendarWidth >= 610;
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

  const submitTask = () => {
    if (!draft.trim()) {
      return;
    }
    addTodo({ title: draft, scheduledDate: selectedDate });
    setDraft('');
    Keyboard.dismiss();
  };

  const selectedDateLabel = fromDateKey(selectedDate).toLocaleDateString(
    language === 'zh' ? 'zh-CN' : 'en-US',
    { month: 'long', day: 'numeric', weekday: 'long' },
  );

  return (
    <View className="flex-1 bg-canvas">
      <ExpoStatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
        >
          <View className="pb-5 pt-4">
            <Text className="text-[24px] font-extrabold text-ink">
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
            style={sideBySide ? styles.workspaceWide : styles.workspaceStack}
          >
            <View
              className="overflow-hidden rounded-[22px] border border-[#E5E4EC] bg-white"
              nativeID="calendar-month-panel"
              style={[
                styles.calendarCard,
                sideBySide && styles.calendarColumn,
                styles.calendarShadow,
              ]}
            >
              <View className="flex-row items-center justify-between border-b border-[#ECEBF1] px-4 py-3.5">
                <Text className="text-[18px] font-extrabold text-[#303145]">
                  {labels.calendar.monthTitle(
                    visibleMonth.getFullYear(),
                    visibleMonth.getMonth() + 1,
                  )}
                </Text>
                <View className="flex-row items-center">
                  {!isAtToday ? (
                    <View className="mr-2">
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
                  <View className="w-1.5" />
                  <IconButton
                    icon="chevron-forward"
                    label={labels.calendar.nextMonth}
                    onPress={() => changeMonth(1)}
                    size="small"
                  />
                </View>
              </View>

              <View className="flex-row border-b border-[#ECEBF1] bg-[#FAFAFC]">
                {labels.calendar.weekdays.map((weekday) => (
                  <View
                    className="items-center py-2.5"
                    key={weekday}
                    style={styles.weekColumn}
                  >
                    <Text className="text-[10px] font-bold text-[#9597A5]">
                      {weekday}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row flex-wrap">
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

            <View
              className="rounded-[22px] border border-[#E5E4EC] bg-white p-4"
              nativeID="calendar-agenda-panel"
              style={[
                styles.agendaCard,
                sideBySide ? styles.agendaSide : styles.agendaStack,
                styles.calendarShadow,
              ]}
            >
              <View className="mb-4">
                <Text className="text-[16px] font-extrabold text-[#343548]">
                  {selectedDateLabel}
                </Text>
                <Text className="mt-1 text-[11px] font-semibold text-[#898A99]">
                  {labels.calendar.tasksForDate(selectedTodos.length)}
                </Text>
              </View>

              <View
                className="mb-4 flex-row items-center rounded-[13px] border border-[#E5E3ED] bg-[#F8F7FA] p-1.5 pl-3"
                nativeID="calendar-task-composer"
              >
                <TextInput
                  {...inputAccentProps}
                  accessibilityLabel={labels.calendar.inputPlaceholder}
                  className="h-9 flex-1 text-[13px] text-[#303145]"
                  onChangeText={setDraft}
                  onSubmitEditing={submitTask}
                  placeholder={labels.calendar.inputPlaceholder}
                  placeholderTextColor="#9A9BA8"
                  returnKeyType="done"
                  value={draft}
                />
                <ActionButton
                  disabled={!draft.trim()}
                  label={labels.addTask}
                  onPress={submitTask}
                  size="small"
                />
              </View>

              {selectedTodos.length === 0 ? (
                <View className="items-center py-9">
                  <View className="mb-3 h-8 w-8 items-center justify-center rounded-[11px] bg-[#F0EEFF]">
                    <Text className="text-[16px] font-bold text-primary">＋</Text>
                  </View>
                  <Text className="text-[12px] text-[#8D8E9D]">
                    {labels.calendar.empty}
                  </Text>
                </View>
              ) : (
                selectedTodos.map((todo) => (
                  <CalendarTask
                    childCount={childCountByParent.get(todo.id) ?? 0}
                    color={
                      groupColors.get(todo.groupId ?? '') ?? '#8B7EFF'
                    }
                    editLabel={labels.editor.title}
                    key={todo.id}
                    markActive={labels.markActive}
                    markComplete={labels.markComplete}
                    moreActionsLabel={labels.taskMenu.moreActions}
                    onEdit={onEditTask}
                    onOpenMenu={onOpenTaskMenu}
                    onToggle={toggleTodo}
                    selected={selectedTaskId === todo.id}
                    todo={todo}
                  />
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    alignSelf: 'center',
    maxWidth: 1180,
    width: '100%',
  },
  content: {
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  workspaceWide: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    width: '100%',
  },
  workspaceStack: {
    width: '100%',
  },
  calendarCard: {
    minWidth: 0,
  },
  calendarColumn: {
    flex: 1,
  },
  agendaCard: {
    alignSelf: 'stretch',
  },
  agendaSide: {
    marginLeft: 16,
    minHeight: 580,
    width: 334,
  },
  agendaStack: {
    marginTop: 16,
  },
  calendarShadow: {
    shadowColor: '#4B4963',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
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
  taskRow: {
    backgroundColor: '#FFFFFF',
  },
  taskRowHovered: {
    backgroundColor: '#F5F4F8',
  },
  taskRowSelected: {
    backgroundColor: '#EEECFF',
  },
  taskTitlePressed: {
    opacity: 0.62,
  },
});

export default CalendarScreen;
