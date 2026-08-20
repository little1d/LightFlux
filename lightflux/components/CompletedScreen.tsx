import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import { DESKTOP_LAYOUT_BREAKPOINT } from '../config/layout';
import { translations } from '../content';
import { buildChildCountByParent } from '../store/todoDomain';
import { useTodoStore } from '../store/todoStore';
import { Todo } from '../types/todo';
import { fromDateKey, toDateKey } from '../utils/date';
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
      {nested ? <TaskNestingIndicator /> : null}
      <TaskCheckbox
        completed
        markActive={labels.markActive}
        markComplete={labels.markComplete}
        muted
        onPress={() => onToggle(todo.id)}
      />

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
      <TaskMoreButton
        label={labels.taskMenu.moreActions}
        onPress={openFromButton}
      />
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
  const childCountByParent = useMemo(
    () => buildChildCountByParent(completedTodos),
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

  const today = useCurrentDateKey();
  const todayDate = fromDateKey(today);
  const { width } = useWindowDimensions();
  const compact = width < DESKTOP_LAYOUT_BREAKPOINT;
  const yesterdayDate = new Date(todayDate);
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
        year: year === todayDate.getFullYear() ? undefined : 'numeric',
      },
    );
  };

  return (
    <View style={styles.screen}>
      <ExpoStatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <SectionList
          contentContainerStyle={[
            styles.content,
            compact && styles.contentCompact,
          ]}
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
            compact ? null : (
              <View className="pb-5 pt-4">
                <Text className="text-[24px] font-extrabold text-ink">
                  {labels.completed.title}
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <CompletedTaskRow
              childCount={childCountByParent.get(item.id) ?? 0}
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
  screen: {
    backgroundColor: '#F5F5FA',
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
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
  contentCompact: {
    paddingTop: 70,
  },
});

export default CompletedScreen;
