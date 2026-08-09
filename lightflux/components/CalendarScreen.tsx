import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { inputAccentProps } from '../config/input';
import { useTodos } from '../context/TodoContext';
import { translations } from '../i18n/translations';
import { Todo } from '../types/todo';
import {
  addMonths,
  fromDateKey,
  monthGrid,
  todayKey,
  toDateKey,
} from '../utils/date';
import TaskIndicators from './tasks/TaskIndicators';
import {
  OpenTaskMenu,
  useTaskContextMenu,
} from './tasks/useTaskContextMenu';

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
  const { targetRef, openFromButton, openFromLongPress } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );

  return (
    <View
      className={`${todo.parentId ? 'ml-6 min-h-[36px]' : 'min-h-[42px]'} flex-row items-center border-b px-2 ${
        selected
          ? 'border-[#D6D2EF] bg-[#EAE7FA]'
          : 'border-[#DDDCE7] bg-transparent'
      }`}
      ref={targetRef}
    >
    {todo.parentId ? (
      <Text className="mr-1.5 text-[12px] text-[#A09EAC]">↳</Text>
    ) : null}
    <Pressable
      accessibilityLabel={todo.completed ? markActive : markComplete}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: todo.completed }}
      className={`h-5 w-5 items-center justify-center rounded-[7px] border-[1.5px] ${
        todo.completed
          ? 'border-primary bg-primary'
          : 'border-[#C5C2D4]'
      }`}
      onPress={() => onToggle(todo.id)}
    >
      {todo.completed ? (
        <Text className="text-sm font-black leading-[17px] text-white">✓</Text>
      ) : null}
    </Pressable>
    <Pressable
      accessibilityLabel={`${editLabel}: ${todo.title}`}
      accessibilityRole="button"
      className="ml-2.5 flex-1 py-1.5"
      delayLongPress={350}
      onLongPress={openFromLongPress}
      onPress={() => onEdit(todo.id)}
    >
      <Text
        className={`text-[13px] font-semibold ${
          todo.completed ? 'text-[#9A9BAA] line-through' : 'text-[#343548]'
        }`}
      >
        {todo.title}
      </Text>
    </Pressable>
    <TaskIndicators childCount={childCount} todo={todo} />
    <View
      className="ml-2 h-2 w-2 rounded"
      style={{ backgroundColor: color }}
    />
    <Pressable
      accessibilityLabel={moreActionsLabel}
      accessibilityRole="button"
      className="ml-1 h-7 w-7 items-center justify-center rounded-[10px]"
      onPress={openFromButton}
    >
      <Text className="text-[16px] font-bold text-[#9293A0]">⋯</Text>
    </Pressable>
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
  } = useTodos();
  const labels = translations[language];
  const { width } = useWindowDimensions();
  const isWide = width >= 620;
  const today = useMemo(todayKey, []);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(today);
  const [draft, setDraft] = useState('');

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
  const selectedTodos = tasksByDate.get(selectedDate) ?? [];

  const changeMonth = (amount: number) => {
    const nextMonth = addMonths(visibleMonth, amount);
    setVisibleMonth(nextMonth);
    setSelectedDate(toDateKey(nextMonth));
  };

  const goToday = () => {
    const now = new Date();
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
          <View className="flex-row items-center justify-between pb-5 pt-4">
            <View>
              <Text className="text-[24px] font-extrabold text-ink">
                {labels.calendar.title}
              </Text>
              <Text className="mt-1 text-xs text-[#858797]">
                {labels.calendar.tasksForDate(todos.length)}
              </Text>
            </View>
          </View>

          <View
            className="overflow-hidden rounded-[24px] border border-[#E7E6EE] bg-white"
            style={styles.calendarShadow}
          >
            <View className="flex-row items-center justify-between border-b border-[#ECEBF1] px-4 py-3.5">
              <Text className="text-[18px] font-extrabold text-[#303145]">
                {labels.calendar.monthTitle(
                  visibleMonth.getFullYear(),
                  visibleMonth.getMonth() + 1,
                )}
              </Text>
              <View className="flex-row items-center">
                <Pressable
                  accessibilityLabel={labels.calendar.previousMonth}
                  accessibilityRole="button"
                  className="h-9 w-9 items-center justify-center rounded-xl bg-[#F2F1F7]"
                  onPress={() => changeMonth(-1)}
                >
                  <Text className="text-xl text-[#56576A]">‹</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className="mx-2 h-9 items-center justify-center rounded-xl bg-[#EEECFF] px-3"
                  onPress={goToday}
                >
                  <Text className="text-xs font-extrabold text-primary">
                    {labels.calendar.today}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={labels.calendar.nextMonth}
                  accessibilityRole="button"
                  className="h-9 w-9 items-center justify-center rounded-xl bg-[#F2F1F7]"
                  onPress={() => changeMonth(1)}
                >
                  <Text className="text-xl text-[#56576A]">›</Text>
                </Pressable>
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
                const dateTodos = tasksByDate.get(dateKey) ?? [];
                const isCurrentMonth =
                  date.getMonth() === visibleMonth.getMonth();
                const isSelected = dateKey === selectedDate;
                const isToday = dateKey === today;

                return (
                  <Pressable
                    accessibilityLabel={`${date.toLocaleDateString(
                      language === 'zh' ? 'zh-CN' : 'en-US',
                    )}, ${labels.calendar.tasksForDate(dateTodos.length)}`}
                    accessibilityRole="button"
                    className={`border-b border-r border-[#EFEEF3] p-1.5 ${
                      isSelected ? 'bg-[#F0EEFF]' : 'bg-white'
                    }`}
                    key={dateKey}
                    onPress={() => setSelectedDate(dateKey)}
                    style={[
                      styles.dayCell,
                      { minHeight: isWide ? 92 : 64 },
                    ]}
                  >
                    <View
                      className={`h-6 min-w-6 self-start items-center justify-center rounded-xl ${
                        isToday ? 'bg-primary' : ''
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          isToday
                            ? 'text-white'
                            : isCurrentMonth
                              ? 'text-[#454659]'
                              : 'text-[#C1C2CA]'
                        }`}
                      >
                        {date.getDate()}
                      </Text>
                    </View>

                    {isWide
                      ? dateTodos.slice(0, 2).map((todo) => (
                          <View
                            className="mt-1 rounded px-1.5 py-0.5"
                            key={todo.id}
                            style={{
                              backgroundColor:
                                groupColors.get(todo.groupId ?? '') ??
                                '#E6E3FF',
                            }}
                          >
                            <Text
                              className="text-[9px] font-semibold text-[#45445A]"
                              numberOfLines={1}
                            >
                              {todo.title}
                            </Text>
                          </View>
                        ))
                      : dateTodos.length > 0 && (
                          <View className="mt-1 flex-row flex-wrap">
                            {dateTodos.slice(0, 3).map((todo) => (
                              <View
                                className="mb-0.5 mr-0.5 h-1.5 w-1.5 rounded-[3px]"
                                key={todo.id}
                                style={{
                                  backgroundColor:
                                    groupColors.get(todo.groupId ?? '') ??
                                    '#7E72ED',
                                }}
                              />
                            ))}
                          </View>
                        )}
                    {dateTodos.length > 2 && isWide ? (
                      <Text className="mt-0.5 text-[8px] text-[#999BA8]">
                        +{dateTodos.length - 2}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mt-5 rounded-[22px] bg-[#ECEAF6] p-4">
            <View className="mb-3 flex-row items-end justify-between">
              <View>
                <Text className="text-[16px] font-extrabold text-[#343548]">
                  {selectedDateLabel}
                </Text>
                <Text className="mt-1 text-[11px] text-[#848697]">
                  {labels.calendar.tasksForDate(selectedTodos.length)}
                </Text>
              </View>
            </View>

            <View
              className="mb-3 flex-row rounded-[16px] border border-transparent bg-white p-1.5 pl-4"
              nativeID="calendar-task-composer"
            >
              <TextInput
                {...inputAccentProps}
                accessibilityLabel={labels.calendar.inputPlaceholder}
                className="h-11 flex-1 text-[14px] text-[#303145]"
                onChangeText={setDraft}
                onSubmitEditing={submitTask}
                placeholder={labels.calendar.inputPlaceholder}
                placeholderTextColor="#9A9BA8"
                returnKeyType="done"
                value={draft}
              />
              <Pressable
                accessibilityLabel={labels.addTask}
                accessibilityRole="button"
                className={`h-11 items-center justify-center rounded-[13px] px-4 ${
                  draft.trim() ? 'bg-primary' : 'bg-[#C9C6DD]'
                }`}
                disabled={!draft.trim()}
                onPress={submitTask}
              >
                <Text className="text-xs font-extrabold text-white">＋</Text>
              </Pressable>
            </View>

            {selectedTodos.length === 0 ? (
              <View className="items-center py-6">
                <Text className="text-[13px] text-[#8D8E9D]">
                  {labels.calendar.empty}
                </Text>
              </View>
            ) : (
              selectedTodos.map((todo) => (
                <CalendarTask
                  childCount={
                    todos.filter((item) => item.parentId === todo.id).length
                  }
                  color={
                    groupColors.get(todo.groupId ?? '') ?? '#8B7EFF'
                  }
                  editLabel={labels.editor.title}
                  moreActionsLabel={labels.taskMenu.moreActions}
                  key={todo.id}
                  markActive={labels.markActive}
                  markComplete={labels.markComplete}
                  onEdit={onEditTask}
                  onOpenMenu={onOpenTaskMenu}
                  onToggle={toggleTodo}
                  selected={selectedTaskId === todo.id}
                  todo={todo}
                />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    alignSelf: 'center',
    maxWidth: 820,
    width: '100%',
  },
  content: {
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  calendarShadow: {
    shadowColor: '#4B4963',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  weekColumn: {
    width: `${100 / 7}%`,
  },
  dayCell: {
    width: `${100 / 7}%`,
  },
});

export default CalendarScreen;
