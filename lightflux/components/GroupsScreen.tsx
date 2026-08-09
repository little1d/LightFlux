import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { inputAccentProps } from '../config/input';
import { useTodos } from '../context/TodoContext';
import { Translation, translations } from '../i18n/translations';
import { Todo } from '../types/todo';
import { requestConfirmation } from '../utils/confirm';
import { todayKey } from '../utils/date';
import GroupActionMenu from './groups/GroupActionMenu';
import {
  GroupMenuPosition,
  OpenGroupMenu,
  useGroupContextMenu,
} from './groups/useGroupContextMenu';
import TaskIndicators from './tasks/TaskIndicators';
import DraggableSubtask from './tasks/DraggableSubtask';
import ActionButton from './ui/ActionButton';
import {
  OpenTaskMenu,
  useTaskContextMenu,
} from './tasks/useTaskContextMenu';

const UNGROUPED_ID = '__ungrouped__';

interface GroupSection {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  todos: Todo[];
}

const GroupHeader = ({
  isExpanded,
  labels,
  onAddTask,
  onOpenMenu,
  onToggle,
  section,
}: {
  isExpanded: boolean;
  labels: Translation;
  onAddTask: () => void;
  onOpenMenu: OpenGroupMenu;
  onToggle: () => void;
  section: GroupSection;
}) => {
  const { targetRef, openFromLongPress } = useGroupContextMenu(
    section.id,
    onOpenMenu,
  );
  const longPressHandled = useRef(false);

  return (
    <View className="flex-row items-center px-4 py-4" ref={targetRef}>
      <Pressable
        accessibilityLabel={
          isExpanded ? labels.groups.collapse : labels.groups.expand
        }
        accessibilityRole="button"
        className="flex-1 flex-row items-center"
        delayLongPress={350}
        onLongPress={() => {
          longPressHandled.current = true;
          openFromLongPress();
          setTimeout(() => {
            longPressHandled.current = false;
          }, 500);
        }}
        onPress={() => {
          if (!longPressHandled.current) {
            onToggle();
          }
        }}
      >
        <View
          className="mr-3 h-3 w-3 rounded-[6px]"
          style={{ backgroundColor: section.color }}
        />
        <Text className="text-[17px] font-extrabold text-[#292A3D]">
          {isExpanded ? '⌄' : '›'} {section.name}
        </Text>
        <Text className="ml-2 text-xs font-semibold text-[#A0A1AC]">
          {labels.groups.count(section.todos.length)}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel={`${labels.addTask}: ${section.name}`}
        accessibilityRole="button"
        className="h-9 w-9 items-center justify-center rounded-[13px] bg-[#F0EEFF]"
        onPress={onAddTask}
      >
        <Text className="text-xl font-medium text-primary">＋</Text>
      </Pressable>
    </View>
  );
};

const GroupTask = ({
  todo,
  language,
  markActive,
  markComplete,
  editLabel,
  onEdit,
  onOpenMenu,
  onToggle,
  selected,
  childCount,
}: {
  todo: Todo;
  language: 'zh' | 'en';
  markActive: string;
  markComplete: string;
  editLabel: string;
  onEdit: (id: string) => void;
  onOpenMenu: OpenTaskMenu;
  onToggle: (id: string) => void;
  selected: boolean;
  childCount: number;
}) => {
  const { targetRef, openFromButton, openFromLongPress } = useTaskContextMenu(
    todo.id,
    onOpenMenu,
  );

  return (
    <View
      className={`${todo.parentId ? 'ml-6 min-h-[36px]' : 'min-h-[42px]'} flex-row items-center border-b border-[#ECECF1] px-1.5 ${
        selected ? 'rounded-[12px] bg-[#ECEAF5]' : ''
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
          : 'border-[#BFC1CB]'
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
        className={`text-[13px] font-semibold leading-[18px] ${
          todo.completed ? 'text-[#A1A2AD] line-through' : 'text-[#303145]'
        }`}
      >
        {todo.title}
      </Text>
    </Pressable>
    <TaskIndicators childCount={childCount} todo={todo} />
    <Pressable
      accessibilityLabel={translations[language].taskMenu.moreActions}
      accessibilityRole="button"
      className="h-7 w-7 items-center justify-center rounded-[10px]"
      onPress={openFromButton}
    >
      <Text className="text-[16px] font-bold text-[#9293A0]">⋯</Text>
    </Pressable>
    </View>
  );
};

const GroupsScreen = ({
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
    addGroup,
    deleteGroup,
    addTodo,
    renameGroup,
    reorderSubtask,
    toggleTodo,
  } = useTodos();
  const labels = translations[language];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [UNGROUPED_ID]: true,
  });
  const [activeComposer, setActiveComposer] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState('');
  const [groupDraft, setGroupDraft] = useState('');
  const [groupMenu, setGroupMenu] = useState<{
    sectionId: string;
    position?: GroupMenuPosition;
  } | null>(null);

  const sections = useMemo<GroupSection[]>(
    () =>
      [
        {
          id: UNGROUPED_ID,
          name: labels.groups.ungrouped,
          color: '#9A97AD',
          sortOrder: 0,
          todos: todos.filter((todo) => todo.groupId === null),
        },
        ...groups.map((group) => ({
          ...group,
          todos: todos.filter((todo) => todo.groupId === group.id),
        })),
      ].sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name, language === 'zh' ? 'zh-CN' : 'en-US'),
      ),
    [groups, labels.groups.ungrouped, language, todos],
  );
  const openGroupMenu = useCallback<OpenGroupMenu>(
    (sectionId, position) => {
      setGroupMenu({ sectionId, position });
    },
    [],
  );
  const activeMenuSection = groupMenu
    ? sections.find((section) => section.id === groupMenu.sectionId)
    : undefined;

  const toggleGroup = (id: string) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  };

  const openComposer = (id: string) => {
    setExpanded((current) => ({ ...current, [id]: true }));
    setActiveComposer(id);
    setTaskDraft('');
  };

  const submitTask = (sectionId: string) => {
    if (!taskDraft.trim()) {
      return;
    }
    addTodo({
      title: taskDraft,
      scheduledDate: todayKey(),
      groupId: sectionId === UNGROUPED_ID ? null : sectionId,
    });
    setTaskDraft('');
    setActiveComposer(null);
    Keyboard.dismiss();
  };

  const submitGroup = () => {
    const name = groupDraft.trim();
    if (!name) {
      return;
    }
    const id = addGroup(name);
    setExpanded((current) => ({ ...current, [id]: true }));
    setGroupDraft('');
    setActiveComposer(id);
    Keyboard.dismiss();
  };

  const addGroupNear = (
    name: string,
    position: 'before' | 'after',
  ) => {
    if (!activeMenuSection) {
      return;
    }
    const id = addGroup(name, {
      anchorGroupId:
        activeMenuSection.id === UNGROUPED_ID
          ? null
          : activeMenuSection.id,
      position,
    });
    setExpanded((current) => ({ ...current, [id]: true }));
  };

  const deleteActiveGroup = () => {
    if (!activeMenuSection || activeMenuSection.id === UNGROUPED_ID) {
      return;
    }
    const groupId = activeMenuSection.id;
    setGroupMenu(null);
    requestConfirmation({
      cancelText: labels.cancel,
      confirmText: labels.groups.deleteGroup,
      message: labels.groups.deleteGroupMessage,
      onConfirm: () => {
        deleteGroup(groupId);
        setExpanded((current) => {
          const next = { ...current };
          delete next[groupId];
          return next;
        });
        if (activeComposer === groupId) {
          setActiveComposer(null);
        }
      },
      title: labels.groups.deleteGroupTitle,
    });
  };

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
                {labels.groups.title}
              </Text>
            </View>
          </View>

          <View
            className="mb-5 flex-row rounded-[18px] border border-[#E7E6ED] bg-white p-1.5 pl-4"
            nativeID="group-name-composer"
            style={styles.cardShadow}
          >
            <TextInput
              {...inputAccentProps}
              accessibilityLabel={labels.groups.groupPlaceholder}
              className="h-11 flex-1 text-[14px] text-[#303145]"
              onChangeText={setGroupDraft}
              onSubmitEditing={submitGroup}
              placeholder={labels.groups.groupPlaceholder}
              placeholderTextColor="#A0A1AD"
              returnKeyType="done"
              value={groupDraft}
            />
            <Pressable
              accessibilityLabel={labels.groups.addGroup}
              accessibilityRole="button"
              className={`h-11 items-center justify-center rounded-[13px] px-4 ${
                groupDraft.trim() ? 'bg-primary' : 'bg-[#C9C6DD]'
              }`}
              disabled={!groupDraft.trim()}
              onPress={submitGroup}
            >
              <Text className="text-xs font-extrabold text-white">
                ＋ {labels.groups.addGroup}
              </Text>
            </Pressable>
          </View>

          {sections.map((section) => {
            const isExpanded = expanded[section.id] ?? false;

            return (
              <View
                className="mb-3 overflow-hidden rounded-[20px] border border-[#E8E7EE] bg-white"
                key={section.id}
                style={styles.cardShadow}
              >
                <GroupHeader
                  isExpanded={isExpanded}
                  labels={labels}
                  onAddTask={() => openComposer(section.id)}
                  onOpenMenu={openGroupMenu}
                  onToggle={() => toggleGroup(section.id)}
                  section={section}
                />

                {isExpanded ? (
                  <View className="border-t border-[#ECEBF1] px-4 pb-2">
                    {activeComposer === section.id ? (
                      <View
                        className="mb-3 mt-3 rounded-[14px] border border-[#E0DDEE] bg-[#F8F7FB] p-3"
                        nativeID={`group-task-composer-${section.id}`}
                      >
                        <Text className="mb-2 text-[11px] font-bold text-[#777889]">
                          {labels.groups.addTaskTitle}
                        </Text>
                        <TextInput
                          {...inputAccentProps}
                          accessibilityLabel={labels.groups.taskPlaceholder}
                          autoFocus
                          className="h-11 rounded-[10px] border border-[#E3E1EA] bg-white px-3 text-[13px] text-[#303145]"
                          onChangeText={setTaskDraft}
                          onSubmitEditing={() => submitTask(section.id)}
                          placeholder={labels.groups.taskPlaceholder}
                          placeholderTextColor="#A0A1AD"
                          returnKeyType="done"
                          value={taskDraft}
                        />
                        <View className="mt-2 flex-row justify-end">
                          <ActionButton
                            label={labels.groups.cancelTask}
                            onPress={() => {
                              setActiveComposer(null);
                              setTaskDraft('');
                            }}
                            variant="ghost"
                          />
                          <View className="w-1" />
                          <ActionButton
                            disabled={!taskDraft.trim()}
                            label={labels.addTask}
                            onPress={() => submitTask(section.id)}
                          />
                        </View>
                      </View>
                    ) : null}

                    {section.todos.length === 0 &&
                    activeComposer !== section.id ? (
                      <Pressable
                        accessibilityRole="button"
                        className="items-center py-5"
                        onPress={() => openComposer(section.id)}
                      >
                        <Text className="text-xs text-[#9899A6]">
                          ＋ {labels.groups.taskPlaceholder}
                        </Text>
                      </Pressable>
                    ) : (
                      section.todos.map((todo) => {
                        const row = (
                          <GroupTask
                            childCount={
                              todos.filter((item) => item.parentId === todo.id)
                                .length
                            }
                            editLabel={labels.editor.title}
                            language={language}
                            markActive={labels.markActive}
                            markComplete={labels.markComplete}
                            onEdit={onEditTask}
                            onOpenMenu={onOpenTaskMenu}
                            onToggle={toggleTodo}
                            selected={selectedTaskId === todo.id}
                            todo={todo}
                          />
                        );

                        if (!todo.parentId) {
                          return <React.Fragment key={todo.id}>{row}</React.Fragment>;
                        }

                        const siblings = section.todos.filter(
                          (item) => item.parentId === todo.parentId,
                        );
                        return (
                          <DraggableSubtask
                            id={todo.id}
                            index={siblings.findIndex(
                              (item) => item.id === todo.id,
                            )}
                            key={todo.id}
                            label={`${labels.groups.reorderSubtask}: ${todo.title}`}
                            onMove={reorderSubtask}
                            parentId={todo.parentId}
                          >
                            {row}
                          </DraggableSubtask>
                        );
                      })
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {groupMenu && activeMenuSection ? (
        <GroupActionMenu
          groupId={
            activeMenuSection.id === UNGROUPED_ID
              ? null
              : activeMenuSection.id
          }
          groupName={activeMenuSection.name}
          onAdd={addGroupNear}
          onClose={() => setGroupMenu(null)}
          onDelete={deleteActiveGroup}
          onRename={(name) => {
            if (activeMenuSection.id !== UNGROUPED_ID) {
              renameGroup(activeMenuSection.id, name);
            }
          }}
          position={groupMenu.position}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
  content: {
    paddingBottom: 26,
    paddingHorizontal: 20,
  },
  cardShadow: {
    shadowColor: '#4B4963',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
});

export default GroupsScreen;
