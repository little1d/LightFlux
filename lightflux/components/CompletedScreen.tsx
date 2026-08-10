import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { translations } from '../i18n/translations';
import { useTodoStore } from '../store/todoStore';
import { Todo } from '../types/todo';
import { toDateKey } from '../utils/date';
import TaskIndicators from './tasks/TaskIndicators';
import TaskSelectionMarker from './tasks/TaskSelectionMarker';
import {
  OpenTaskMenu,
  useTaskContextMenu,
} from './tasks/useTaskContextMenu';

interface CompletedSection {
  data: Todo[];
  dateKey: string;
  latestTimestamp: number;
}

const completedTimestamp = (todo: Todo) =>
  todo.completedAt ?? todo.updatedAt;

const CompletedTaskRow = ({
  childCount,
  nested,
  onEdit,
  onOpenMenu,
  onToggle,
  selected,
  todo,
}: {
  childCount: number;
  nested: boolean;
  onEdit: (id: string) => void;
  onOpenMenu: OpenTaskMenu;
  onToggle: (id: string) => void;
  selected: boolean;
  todo: Todo;
}) => {
  const language = useTodoStore((state) => state.language);
  const labels = translations[language];
  const { targetRef, openFromButton, openFromLongPress } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );

  return (
    <View
      className={`${nested ? 'ml-6 min-h-[38px]' : 'min-h-[44px]'} flex-row items-center border-b px-2 ${
        selected
          ? 'border-[#D6D2EF] bg-[#EEECFF]'
          : 'border-[#ECEBF1] bg-transparent'
      }`}
      ref={targetRef}
    >
      <TaskSelectionMarker visible={selected} />
      {nested ? (
        <Text className="mr-1.5 text-[12px] text-[#AAA9B3]">↳</Text>
      ) : null}
      <Pressable
        accessibilityLabel={labels.markActive}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: true }}
        className="h-5 w-5 items-center justify-center rounded-[6px] bg-[#D8D8DE]"
        hitSlop={8}
        onPress={() => onToggle(todo.id)}
      >
        <Text className="text-xs font-black leading-[15px] text-white">✓</Text>
      </Pressable>

      <Pressable
        accessibilityLabel={`${labels.editor.title}: ${todo.title}`}
        accessibilityRole="button"
        className="ml-2.5 flex-1 py-2"
        delayLongPress={350}
        onLongPress={openFromLongPress}
        onPress={() => onEdit(todo.id)}
      >
        <Text
          className="text-[13px] font-medium leading-[18px] text-[#888995]"
          numberOfLines={1}
        >
          {todo.title}
        </Text>
      </Pressable>

      <TaskIndicators childCount={childCount} todo={todo} />
      <Pressable
        accessibilityLabel={labels.taskMenu.moreActions}
        accessibilityRole="button"
        className="ml-1 h-7 w-7 items-center justify-center rounded-[10px]"
        hitSlop={8}
        onPress={openFromButton}
      >
        <Text className="text-[16px] font-bold text-[#A0A1AC]">⋯</Text>
      </Pressable>
    </View>
  );
};

const CompletedScreen = ({
  onEditTask,
  onOpenTaskMenu,
  selectedTaskId,
}: {
  onEditTask: (id: string) => void;
  onOpenTaskMenu: OpenTaskMenu;
  selectedTaskId: string | null;
}) => {
  const { language, todos, toggleTodo } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      toggleTodo: state.toggleTodo,
    })),
  );
  const labels = translations[language];
  const completedTodos = useMemo(
    () =>
      todos
        .filter((todo) => todo.completed)
        .sort((a, b) => completedTimestamp(b) - completedTimestamp(a)),
    [todos],
  );
  const completedIds = useMemo(
    () => new Set(completedTodos.map((todo) => todo.id)),
    [completedTodos],
  );
  const sections = useMemo<CompletedSection[]>(() => {
    const grouped = new Map<string, Todo[]>();

    completedTodos.forEach((todo) => {
      const dateKey = toDateKey(new Date(completedTimestamp(todo)));
      const current = grouped.get(dateKey) ?? [];
      current.push(todo);
      grouped.set(dateKey, current);
    });

    return Array.from(grouped, ([dateKey, data]) => ({
      data,
      dateKey,
      latestTimestamp: Math.max(...data.map(completedTimestamp)),
    })).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [completedTodos]);

  const today = toDateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toDateKey(yesterdayDate);

  const dateLabel = (dateKey: string) => {
    if (dateKey === today) {
      return labels.completed.today;
    }
    if (dateKey === yesterday) {
      return labels.completed.yesterday;
    }

    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(
      language === 'zh' ? 'zh-CN' : 'en-US',
      {
        day: 'numeric',
        month: 'long',
        weekday: 'short',
        year: year === new Date().getFullYear() ? undefined : 'numeric',
      },
    );
  };

  return (
    <View className="flex-1 bg-canvas">
      <ExpoStatusBar style="dark" />
      <SafeAreaView className="flex-1">
        <SectionList
          contentContainerStyle={styles.content}
          keyExtractor={(todo) => todo.id}
          ListEmptyComponent={
            <View className="min-h-[380px] items-center justify-center px-8">
              <View className="mb-4 h-14 w-14 items-center justify-center rounded-[20px] bg-[#ECEBF1]">
                <Text className="text-[24px] font-black text-[#8D8E9A]">✓</Text>
              </View>
              <Text className="text-[17px] font-extrabold text-[#393A4D]">
                {labels.completed.emptyTitle}
              </Text>
              <Text className="mt-2 max-w-[320px] text-center text-[13px] leading-5 text-[#8A8C9A]">
                {labels.completed.emptyDescription}
              </Text>
            </View>
          }
          ListHeaderComponent={
            <View className="pb-5 pt-4">
              <Text className="text-[24px] font-extrabold text-ink">
                {labels.completed.title}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <CompletedTaskRow
              childCount={
                completedTodos.filter((todo) => todo.parentId === item.id)
                  .length
              }
              nested={Boolean(
                item.parentId && completedIds.has(item.parentId),
              )}
              onEdit={onEditTask}
              onOpenMenu={onOpenTaskMenu}
              onToggle={toggleTodo}
              selected={selectedTaskId === item.id}
              todo={item}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center bg-canvas px-1 pb-1.5 pt-4">
              <Text className="text-[14px] font-extrabold text-[#343548]">
                {dateLabel(section.dateKey)}
              </Text>
              <Text className="ml-2 text-[11px] font-semibold text-[#A0A1AC]">
                {labels.completed.count(section.data.length)}
              </Text>
            </View>
          )}
          sections={sections}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          style={styles.list}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    alignSelf: 'center',
    maxWidth: 860,
    width: '100%',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
});

export default CompletedScreen;
