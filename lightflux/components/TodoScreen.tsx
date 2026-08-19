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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import { inputAccentProps } from '../config/input';
import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import { Translation, translations } from '../content';
import {
  buildChildCountByParent,
  selectActiveTodos,
} from '../store/todoDomain';
import { useTodoStore } from '../store/todoStore';
import { Milestone, Todo } from '../types/todo';
import { fromDateKey } from '../utils/date';
import { getMilestoneOccurrence, milestoneOccursOn } from '../utils/milestoneDate';
import InlineTaskTitle from './tasks/InlineTaskTitle';
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
import { ToastVariant } from './ui/ToastProvider';

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
  nested: boolean;
  selected: boolean;
  todo: Todo;
  onEdit: (id: string) => void;
  onOpenMenu: OpenTaskMenu;
  onRename: (id: string, title: string) => void;
  onToggle: (id: string) => void;
}

const TodoRow = ({
  labels,
  childCount,
  nested,
  selected,
  todo,
  onEdit,
  onOpenMenu,
  onRename,
  onToggle,
}: TodoRowProps) => {
  const { targetRef, openFromButton, openFromLongPress } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );

  return (
    <View
      accessibilityState={{ selected }}
      className={`${nested ? 'ml-6 min-h-[40px]' : 'min-h-[48px]'} my-0.5 flex-row items-center rounded-[10px] border-b px-2 ${
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
      {nested ? <TaskNestingIndicator /> : null}
      <TaskCheckbox
        completed={todo.completed}
        markActive={labels.markActive}
        markComplete={labels.markComplete}
        onPress={() => onToggle(todo.id)}
      />

      <InlineTaskTitle
        editLabel={labels.editor.title}
        nested={nested}
        onOpenDetails={() => onEdit(todo.id)}
        onRename={(title) => onRename(todo.id, title)}
        openDetailsOnEdit={false}
        todo={todo}
      />

      <Pressable
        accessibilityLabel={labels.taskMenu.moreActions}
        accessibilityRole="button"
        className="mr-1 h-8 w-6 items-center justify-center"
        delayLongPress={350}
        onLongPress={openFromLongPress}
        onPress={() => onEdit(todo.id)}
      >
        <Ionicons color="#B7B8C4" name="chevron-forward" size={15} />
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
  onNotify: (message: string, variant?: ToastVariant) => void;
  selectedTaskId: string | null;
}) => {
  const [draft, setDraft] = useState('');
  const composerRef = useRef<TextInput>(null);
  const {
    language,
    todos: allTodos,
    milestones,
    addTodo: createTodo,
    toggleTodo,
    updateTodo,
  } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      milestones: state.milestones,
      addTodo: state.addTodo,
      toggleTodo: state.toggleTodo,
      updateTodo: state.updateTodo,
    })),
  );
  const dateKey = useCurrentDateKey();
  const todos = useMemo(
    () => allTodos.filter((todo) => todo.scheduledDate === dateKey),
    [allTodos, dateKey],
  );
  const activeTodos = useMemo(() => selectActiveTodos(todos), [todos]);
  const activeTodoIds = useMemo(
    () => new Set(activeTodos.map((todo) => todo.id)),
    [activeTodos],
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
    () => buildChildCountByParent(activeTodos),
    [activeTodos],
  );

  const labels = translations[language];
  const { width } = useWindowDimensions();
  const showBrandHeader = width >= 900;
  const canAddTodo = draft.trim().length > 0;

  useEffect(() => {
    if (!focusComposerRequestId) {
      return undefined;
    }
    const timer = setTimeout(() => composerRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [focusComposerRequestId]);

  const addTodo = () => {
    const title = draft.trim();
    if (!title) {
      return;
    }

    createTodo({ title, scheduledDate: dateKey });
    setDraft('');
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

  // Completing a task earns a bit of praise; the last remaining task of the day
  // gets a louder celebration. Reopening quietly confirms the change.
  const handleToggle = (id: string) => {
    const target = todos.find((todo) => todo.id === id);
    const willComplete = target ? !target.completed : false;
    toggleTodo(id);

    if (!target) {
      return;
    }
    if (!willComplete) {
      onNotify(labels.notifications.taskReopened, 'success');
      return;
    }

    const remainingActive = todos.filter(
      (todo) => !todo.completed && todo.id !== id,
    ).length;
    if (todos.length > 1 && remainingActive === 0) {
      onNotify(labels.notifications.allTasksDone, 'celebrate');
      return;
    }
    const praises = labels.notifications.taskCompleted;
    const message =
      praises[Math.floor(Math.random() * praises.length)] ?? praises[0];
    onNotify(message, 'celebrate');
  };

  const handleRename = (id: string, title: string) => {
    updateTodo(id, { title });
  };

  const listHeader = (
    <>
      {showBrandHeader ? (
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
      ) : (
        <View className="h-[58px]" />
      )}

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
            data={activeTodos}
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
                  {labels.emptyTitle.active}
                </Text>
                <Text className="max-w-[310px] text-center text-[13px] leading-5 text-[#898B9A]">
                  {labels.emptyDescription.active}
                </Text>
              </View>
            }
            ListHeaderComponent={listHeader}
            renderItem={({ item }) => (
              <TodoRow
                childCount={childCountByParent.get(item.id) ?? 0}
                labels={labels}
                nested={Boolean(
                  item.parentId && activeTodoIds.has(item.parentId),
                )}
                onEdit={onEditTask}
                onOpenMenu={onOpenTaskMenu}
                onRename={handleRename}
                onToggle={handleToggle}
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
  buttonPressed: {
    opacity: 0.68,
  },
});

export default TodoScreen;
