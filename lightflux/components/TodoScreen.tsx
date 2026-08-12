import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../config/input';
import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import { Translation, translations } from '../i18n/translations';
import { buildChildCountByParent } from '../store/todoDomain';
import { useTodoStore } from '../store/todoStore';
import { Milestone, Todo, TodoFilter } from '../types/todo';
import { requestConfirmation } from '../utils/confirm';
import { fromDateKey } from '../utils/date';
import { getMilestoneOccurrence, milestoneOccursOn } from '../utils/milestoneDate';
import TaskIndicators from './tasks/TaskIndicators';
import TaskPriorityIndicator, {
  TASK_PRIORITY_THEME,
} from './tasks/TaskPriorityIndicator';
import {
  TaskCheckbox,
  TaskMoreButton,
  TaskNestingIndicator,
} from './tasks/TaskRowControls';
import TaskSelectionMarker, {
  TASK_SELECTED_ROW_STYLE,
} from './tasks/TaskSelectionMarker';
import {
  OpenTaskMenu,
  useTaskContextMenu,
} from './tasks/useTaskContextMenu';

const FILTERS: TodoFilter[] = ['all', 'active', 'completed'];

interface TodayMilestoneRowProps {
  labels: Translation['milestones'];
  milestone: Milestone;
  onCreateTask: (milestone: Milestone) => void;
  onOpen: () => void;
  sequenceNumber: number | null;
}

const TodayMilestoneRow = ({
  labels,
  milestone,
  onCreateTask,
  onOpen,
  sequenceNumber,
}: TodayMilestoneRowProps) => {
  const sequence =
    sequenceNumber && sequenceNumber > 0
      ? milestone.type === 'birthday'
        ? labels.birthdayYears(sequenceNumber)
        : labels.anniversaryYears(sequenceNumber)
      : null;

  return (
    <View
      className="mb-1.5 min-h-[52px] flex-row items-center overflow-hidden rounded-[14px] border border-[#E8E5EF] bg-white px-2.5"
      style={styles.todayMilestoneShadow}
    >
      <Pressable
        accessibilityLabel={`${labels.openMilestones}: ${milestone.title}`}
        accessibilityRole="button"
        className="flex-1 flex-row items-center py-2"
        onPress={onOpen}
        style={({ pressed }) => pressed && styles.buttonPressed}
      >
        <View
          className="h-8 w-8 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: `${milestone.color}20` }}
        >
          <Ionicons
            color={milestone.color}
            name={
              milestone.icon as React.ComponentProps<typeof Ionicons>['name']
            }
            size={16}
          />
        </View>
        <View className="ml-2.5 flex-1">
          <Text
            className="text-[13px] font-bold text-[#343548]"
            numberOfLines={1}
          >
            {milestone.title}
          </Text>
          <Text className="mt-0.5 text-[10px] font-medium text-[#898A99]">
            {labels.templates[milestone.type]}
            {sequence ? ` · ${sequence}` : ''}
            {milestone.dateRule.calendar === 'lunar'
              ? ` · ${labels.lunarDate}`
              : ''}
          </Text>
        </View>
        <View
          className="mr-2 rounded-full px-2 py-1"
          style={{ backgroundColor: `${milestone.color}18` }}
        >
          <Text
            className="text-[10px] font-extrabold"
            style={{ color: milestone.color }}
          >
            {labels.today}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`${labels.createTask}: ${milestone.title}`}
        accessibilityRole="button"
        className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#F0EEFF]"
        onPress={() => onCreateTask(milestone)}
        style={({ pressed }) => pressed && styles.addButtonPressed}
      >
        <Ionicons color="#6759E8" name="checkbox-outline" size={16} />
      </Pressable>
    </View>
  );
};

interface TodoRowProps {
  labels: Translation;
  childCount: number;
  selected: boolean;
  todo: Todo;
  onEdit: (id: string) => void;
  onOpenMenu: OpenTaskMenu;
  onToggle: (id: string) => void;
}

const TodoRow = ({
  labels,
  childCount,
  selected,
  todo,
  onEdit,
  onOpenMenu,
  onToggle,
}: TodoRowProps) => {
  const { targetRef, openFromButton, openFromLongPress } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );

  return (
    <View
      accessibilityState={{ selected }}
      className={`${todo.parentId ? 'ml-6 min-h-[40px]' : 'min-h-[48px]'} my-0.5 flex-row items-center rounded-[10px] border-b px-2 ${
        selected
          ? 'border-[#D6D2EF] bg-[#EEECFF]'
          : todo.completed
            ? 'border-[#ECEBF1] bg-[#FAFAFC]'
            : 'border-[#ECEBF1] bg-transparent'
      }`}
      nativeID={`today-task-${todo.id}`}
      ref={targetRef}
      style={[
        !selected &&
          !todo.completed &&
          todo.priority !== 'none' && {
            backgroundColor:
              TASK_PRIORITY_THEME[todo.priority].rowBackground,
          },
        selected && TASK_SELECTED_ROW_STYLE,
      ]}
    >
      <TaskSelectionMarker visible={selected} />
      {todo.parentId ? <TaskNestingIndicator /> : null}
      <TaskCheckbox
        completed={todo.completed}
        markActive={labels.markActive}
        markComplete={labels.markComplete}
        onPress={() => onToggle(todo.id)}
      />

      <Pressable
        accessibilityLabel={`${labels.editor.title}: ${todo.title}`}
        accessibilityRole="button"
        className="ml-2.5 flex-1 py-1.5"
        delayLongPress={350}
        onLongPress={openFromLongPress}
        onPress={() => onEdit(todo.id)}
      >
        <Text
          className={`text-[13px] font-semibold leading-[18px] ${
            todo.completed
              ? 'text-[#999AAA] line-through'
              : 'text-[#303145]'
          }`}
          numberOfLines={1}
        >
          {todo.title}
        </Text>
      </Pressable>

      <TaskPriorityIndicator priority={todo.priority} />
      <TaskIndicators childCount={childCount} todo={todo} />
      <TaskMoreButton
        label={labels.taskMenu.moreActions}
        onPress={openFromButton}
      />
    </View>
  );
};

const TodoScreen = ({
  focusComposerRequestId,
  onEditTask,
  onOpenTaskMenu,
  onOpenMilestones,
  onNotify,
  selectedTaskId,
}: {
  focusComposerRequestId?: number;
  onEditTask: (id: string) => void;
  onOpenTaskMenu: OpenTaskMenu;
  onOpenMilestones: () => void;
  onNotify: (message: string) => void;
  selectedTaskId: string | null;
}) => {
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [draft, setDraft] = useState('');
  const composerRef = useRef<TextInput>(null);
  const {
    language,
    todos: allTodos,
    milestones,
    addTodo: createTodo,
    toggleTodo,
    trashTodos,
  } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      milestones: state.milestones,
      addTodo: state.addTodo,
      toggleTodo: state.toggleTodo,
      trashTodos: state.trashTodos,
    })),
  );
  const dateKey = useCurrentDateKey();
  const todos = useMemo(
    () => allTodos.filter((todo) => todo.scheduledDate === dateKey),
    [allTodos, dateKey],
  );
  const todayMilestones = useMemo(() => {
    const referenceDate = fromDateKey(dateKey);
    return milestones
      .filter((milestone) => milestoneOccursOn(milestone, dateKey))
      .map((milestone) => ({
        milestone,
        sequenceNumber:
          getMilestoneOccurrence(milestone, referenceDate)?.sequenceNumber ??
          null,
      }));
  }, [dateKey, milestones]);
  const childCountByParent = useMemo(
    () => buildChildCountByParent(allTodos),
    [allTodos],
  );

  const labels = translations[language];
  const completedCount = todos.filter((todo) => todo.completed).length;
  const activeCount = todos.length - completedCount;
  const progress = todos.length === 0 ? 0 : completedCount / todos.length;
  const progressWidth = `${Math.round(progress * 100)}%` as `${number}%`;
  const canAddTodo = draft.trim().length > 0;

  useEffect(() => {
    if (!focusComposerRequestId) {
      return undefined;
    }
    const timer = setTimeout(() => composerRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [focusComposerRequestId]);

  const visibleTodos = useMemo(() => {
    if (filter === 'active') {
      return todos.filter((todo) => !todo.completed);
    }

    if (filter === 'completed') {
      return todos.filter((todo) => todo.completed);
    }

    return todos;
  }, [filter, todos]);

  const addTodo = () => {
    const title = draft.trim();
    if (!title) {
      return;
    }

    createTodo({ title, scheduledDate: dateKey });
    setDraft('');
    setFilter('all');
    Keyboard.dismiss();
  };

  const createMilestoneTask = (milestone: Milestone) => {
    createTodo({
      title: milestone.title,
      scheduledDate: dateKey,
      milestoneId: milestone.id,
    });
    onNotify(labels.milestones.relatedTaskCreated);
  };

  const requestClearCompleted = () => {
    requestConfirmation({
      cancelText: labels.cancel,
      confirmText: labels.clear,
      message: labels.clearMessage,
      onConfirm: () =>
        trashTodos(
          todos.filter((todo) => todo.completed).map((todo) => todo.id),
        ),
      title: labels.clearTitle,
    });
  };

  const listHeader = (
    <>
      <View className="flex-row items-center justify-between pb-[22px] pt-[18px]">
        <View className="shrink flex-row items-center">
          <View
            className="mr-[11px] h-11 w-11 items-center justify-center rounded-[14px] bg-primary"
            style={styles.brandMarkShadow}
          >
            <Text className="text-2xl font-extrabold leading-7 text-white">
              ✓
            </Text>
          </View>
          <View>
            <Text className="text-[21px] font-extrabold tracking-[-0.4px] text-ink">
              {labels.appName}
            </Text>
            <Text className="mt-0.5 text-xs text-[#777B8D]">
              {labels.tagline}
            </Text>
          </View>
        </View>
      </View>

      {todos.length > 0 ? (
        <View
          className="mb-[18px] overflow-hidden rounded-[26px] bg-[#25233B] p-[22px]"
          style={styles.summaryShadow}
        >
          <View style={styles.summaryGlow} />
          <Text className="mb-[13px] text-[11px] font-bold tracking-[1.2px] text-[#B7B3D7]">
            {labels.overview}
          </Text>
          <View className="flex-row items-center justify-between">
            <View>
              <View className="flex-row items-end">
                <Text className="text-[42px] font-extrabold leading-[46px] tracking-[-1.5px] text-white">
                  {activeCount}
                </Text>
                <Text className="mb-1.5 ml-2 text-[13px] font-semibold text-[#DAD7EC]">
                  {labels.taskUnit}
                </Text>
              </View>
              <Text className="mt-0.5 text-[13px] text-[#9D99B7]">
                {labels.remaining}
              </Text>
            </View>
            <View className="h-[50px] w-[50px] items-center justify-center rounded-[25px] border border-white/15 bg-white/10">
              <Text className="text-[13px] font-extrabold text-white">
                {Math.round(progress * 100)}%
              </Text>
            </View>
          </View>
          <View className="mt-5 h-1.5 overflow-hidden rounded bg-white/10">
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text className="mt-[9px] text-xs text-[#ABA7C3]">
            {labels.progress(completedCount, todos.length)}
          </Text>
        </View>
      ) : null}

      {todayMilestones.length > 0 ? (
        <View className="mb-[18px]">
          <Pressable
            accessibilityLabel={labels.milestones.openMilestones}
            accessibilityRole="button"
            className="mb-2 flex-row items-center justify-between px-0.5"
            onPress={onOpenMilestones}
            style={({ pressed }) => pressed && styles.buttonPressed}
          >
            <Text className="text-[12px] font-extrabold text-[#515264]">
              {labels.milestones.todaySection}
            </Text>
            <Ionicons color="#898A99" name="chevron-forward" size={15} />
          </Pressable>
          {todayMilestones.map(({ milestone, sequenceNumber }) => (
            <TodayMilestoneRow
              key={milestone.id}
              labels={labels.milestones}
              milestone={milestone}
              onCreateTask={createMilestoneTask}
              onOpen={onOpenMilestones}
              sequenceNumber={sequenceNumber}
            />
          ))}
        </View>
      ) : null}

      <View
        className="mb-5 flex-row items-center rounded-[20px] border border-[#E8E7EF] bg-surface p-[7px] pl-[17px]"
        nativeID="today-task-composer"
        style={styles.composerShadow}
      >
        <TextInput
          {...inputAccentProps}
          accessibilityLabel={labels.inputPlaceholder}
          className="min-h-[46px] flex-1 py-2.5 text-[15px] text-[#292A3D]"
          maxLength={120}
          onChangeText={setDraft}
          onSubmitEditing={addTodo}
          placeholder={labels.inputPlaceholder}
          placeholderTextColor="#9297A8"
          ref={composerRef}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          value={draft}
        />
        <Pressable
          accessibilityLabel={labels.addTask}
          accessibilityRole="button"
          className={`ml-2.5 h-11 flex-row items-center justify-center rounded-[15px] px-3.5 ${
            canAddTodo ? 'bg-primary' : 'bg-[#C8C5DD]'
          }`}
          disabled={!canAddTodo}
          onPress={addTodo}
          style={({ pressed }) => [
            pressed && canAddTodo && styles.addButtonPressed,
          ]}
        >
          <Text className="mr-1 text-[17px] font-medium text-white">＋</Text>
          <Text className="text-[13px] font-extrabold text-white">
            {labels.addTask}
          </Text>
        </Pressable>
      </View>

      {todos.length > 0 ? (
        <View className="mb-3.5 min-h-[34px] flex-row items-center justify-between">
          <View className="flex-row rounded-[17px] bg-[#EAE9F1] p-[3px]">
            {FILTERS.map((item) => {
              const isSelected = item === filter;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  className={`rounded-[14px] px-[13px] py-[7px] ${
                    isSelected ? 'bg-white' : ''
                  }`}
                  key={item}
                  onPress={() => setFilter(item)}
                  style={({ pressed }) => [
                    isSelected && styles.selectedFilterShadow,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    className={`text-xs ${
                      isSelected
                        ? 'font-extrabold text-[#39374F]'
                        : 'font-semibold text-[#777A8B]'
                    }`}
                  >
                    {labels.filters[item]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {completedCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={requestClearCompleted}
              style={({ pressed }) => pressed && styles.buttonPressed}
            >
              <Text className="py-2 pl-2.5 text-xs font-bold text-[#7772AD]">
                {labels.clearCompleted}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </>
  );

  return (
    <View className="flex-1 overflow-hidden bg-canvas">
      <ExpoStatusBar style="dark" />
      <View style={styles.backgroundOrbTop} />
      <View style={styles.backgroundOrbBottom} />
      <SafeAreaView className="flex-1" style={styles.safeAreaInset}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <FlatList
            contentContainerStyle={styles.listContent}
            data={visibleTodos}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(todo) => todo.id}
            ListEmptyComponent={
              <View className="min-h-[235px] flex-1 items-center justify-center px-[30px] py-9">
                <View className="mb-4 h-[60px] w-[60px] -rotate-[5deg] items-center justify-center rounded-[30px] bg-[#E9E6FF]">
                  <Text className="text-[28px] font-extrabold text-[#7265E8]">
                    ✓
                  </Text>
                </View>
                <Text className="mb-[7px] text-center text-[17px] font-extrabold text-[#3B3B50]">
                  {labels.emptyTitle[filter]}
                </Text>
                <Text className="max-w-[310px] text-center text-[13px] leading-5 text-[#898B9A]">
                  {labels.emptyDescription[filter]}
                </Text>
              </View>
            }
            ListHeaderComponent={listHeader}
            renderItem={({ item }) => (
              <TodoRow
                childCount={childCountByParent.get(item.id) ?? 0}
                labels={labels}
                onEdit={onEditTask}
                onOpenMenu={onOpenTaskMenu}
                onToggle={toggleTodo}
                selected={selectedTaskId === item.id}
                todo={item}
              />
            )}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeAreaInset: {
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight : 0,
  },
  list: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backgroundOrbTop: {
    backgroundColor: '#E2DEFF',
    borderRadius: 180,
    height: 280,
    opacity: 0.72,
    position: 'absolute',
    right: -125,
    top: -105,
    width: 280,
  },
  backgroundOrbBottom: {
    backgroundColor: '#DFF4EE',
    borderRadius: 130,
    bottom: -85,
    height: 220,
    left: -95,
    opacity: 0.72,
    position: 'absolute',
    width: 220,
  },
  brandMarkShadow: {
    shadowColor: '#6759E8',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
  },
  summaryShadow: {
    shadowColor: '#25233B',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
  },
  summaryGlow: {
    backgroundColor: '#7669F1',
    borderRadius: 95,
    height: 170,
    opacity: 0.32,
    position: 'absolute',
    right: -45,
    top: -60,
    width: 170,
  },
  progressFill: {
    backgroundColor: '#8B7EFF',
    borderRadius: 4,
    height: '100%',
  },
  composerShadow: {
    shadowColor: '#45435F',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 13,
  },
  todayMilestoneShadow: {
    shadowColor: '#45435F',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  addButtonPressed: {
    backgroundColor: '#574ACD',
    transform: [{ scale: 0.98 }],
  },
  selectedFilterShadow: {
    shadowColor: '#4E4B69',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  buttonPressed: {
    opacity: 0.68,
  },
});

export default TodoScreen;
