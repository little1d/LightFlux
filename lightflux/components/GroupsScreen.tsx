import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Keyboard,
  Platform,
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
import TaskSelectionMarker from './tasks/TaskSelectionMarker';
import DraggableSubtask from './tasks/DraggableSubtask';
import ActionButton from './ui/ActionButton';
import Toast from './ui/Toast';
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

const CollapsibleGroupBody = ({
  children,
  expanded,
}: {
  children: React.ReactNode;
  expanded: boolean;
}) => {
  const transition = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const [visible, setVisible] = useState(expanded);

  useEffect(() => {
    transition.stopAnimation();
    let frame: number | undefined;

    if (expanded) {
      setVisible(true);
      transition.setValue(0);
      frame = requestAnimationFrame(() => {
        Animated.timing(transition, {
          duration: 170,
          toValue: 1,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      });
    } else {
      Animated.timing(transition, {
        duration: 130,
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished) {
          setVisible(false);
        }
      });
    }

    return () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      transition.stopAnimation();
    };
  }, [expanded, transition]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={{
        opacity: transition,
        pointerEvents: expanded ? 'auto' : 'none',
        transform: [
          {
            translateY: transition.interpolate({
              inputRange: [0, 1],
              outputRange: [-5, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
};

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
  const expansion = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(expansion, {
      duration: 170,
      toValue: isExpanded ? 1 : 0,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [expansion, isExpanded]);

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
        <Animated.View
          className="mr-2"
          style={{
            transform: [
              {
                rotate: expansion.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '90deg'],
                }),
              },
            ],
          }}
        >
          <Ionicons color="#777888" name="chevron-forward" size={17} />
        </Animated.View>
        <View
          className="mr-3 h-3 w-3 rounded-[6px]"
          style={{ backgroundColor: section.color }}
        />
        <Text className="text-[17px] font-extrabold text-[#292A3D]">
          {section.name}
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

const InlineSubtaskTitle = ({
  editLabel,
  onOpenDetails,
  onRename,
  todo,
}: {
  editLabel: string;
  onOpenDetails: () => void;
  onRename: (title: string) => void;
  todo: Todo;
}) => {
  const [draft, setDraft] = useState(todo.title);
  const [focused, setFocused] = useState(false);
  const detailsOpened = useRef(false);

  useEffect(() => {
    if (!focused) {
      setDraft(todo.title);
    }
  }, [focused, todo.title]);

  const commit = () => {
    const title = draft.trim();
    setFocused(false);
    detailsOpened.current = false;
    if (title) {
      setDraft(title);
      onRename(title);
    } else {
      setDraft(todo.title);
    }
  };

  const openDetails = () => {
    if (!detailsOpened.current) {
      detailsOpened.current = true;
      onOpenDetails();
    }
  };

  return (
    <TextInput
      {...inputAccentProps}
      accessibilityLabel={`${editLabel}: ${todo.title}`}
      className={`ml-3 h-9 flex-1 border-0 bg-transparent px-1 py-0 text-[13px] font-semibold ${
        todo.completed ? 'text-[#A1A2AD] line-through' : 'text-[#303145]'
      }`}
      maxLength={160}
      nativeID={`subtask-title-${todo.id}`}
      onBlur={commit}
      onChangeText={(value) => {
        setDraft(value);
        if (value.trim()) {
          onRename(value);
        }
      }}
      onFocus={() => {
        setFocused(true);
        openDetails();
      }}
      onPressIn={() => requestAnimationFrame(openDetails)}
      onSubmitEditing={commit}
      returnKeyType="done"
      value={draft}
    />
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
  onRename,
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
  onRename: (id: string, title: string) => void;
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
      className={`${todo.parentId ? 'ml-6 min-h-[40px] px-2' : 'min-h-[48px] px-2'} my-0.5 flex-row items-center border-b ${
        selected
          ? todo.parentId
            ? 'rounded-[8px] border-transparent bg-[#F6F4FF]'
            : 'rounded-[12px] border-transparent bg-[#EEECFF]'
          : 'border-[#ECECF1]'
      }`}
      ref={targetRef}
    >
      <TaskSelectionMarker visible={selected} />
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
      {todo.parentId ? (
        <InlineSubtaskTitle
          editLabel={editLabel}
          onOpenDetails={() => onEdit(todo.id)}
          onRename={(title) => onRename(todo.id, title)}
          todo={todo}
        />
      ) : (
        <Pressable
          accessibilityLabel={`${editLabel}: ${todo.title}`}
          accessibilityRole="button"
          className="ml-3 flex-1 py-2"
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
      )}
      <TaskIndicators childCount={childCount} todo={todo} />
      <Pressable
        accessibilityLabel={translations[language].taskMenu.moreActions}
        accessibilityRole="button"
        className="ml-1 h-7 w-7 items-center justify-center rounded-[10px]"
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
    ungroupedName,
    addGroup,
    deleteGroup,
    addTodo,
    renameGroup,
    reorderSubtask,
    toggleTodo,
    updateTodo,
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
  const [toast, setToast] = useState<{
    id: number;
    message: string;
  } | null>(null);

  const sections = useMemo<GroupSection[]>(
    () =>
      [
        {
          id: UNGROUPED_ID,
          name: ungroupedName ?? labels.groups.ungrouped,
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
    [groups, labels.groups.ungrouped, language, todos, ungroupedName],
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
  const moveSubtask = useCallback(
    (id: string, targetIndex: number) => {
      const dragged = todos.find((todo) => todo.id === id);
      if (!dragged?.parentId) {
        return;
      }

      const siblings = todos.filter(
        (todo) => todo.parentId === dragged.parentId,
      );
      const sourceIndex = siblings.findIndex((todo) => todo.id === id);
      const boundedTarget = Math.max(
        0,
        Math.min(targetIndex, siblings.length - 1),
      );
      if (sourceIndex < 0 || sourceIndex === boundedTarget) {
        return;
      }

      reorderSubtask(id, boundedTarget);
      setToast({
        id: Date.now(),
        message: labels.notifications.orderUpdated,
      });
    },
    [labels.notifications.orderUpdated, reorderSubtask, todos],
  );

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

                <CollapsibleGroupBody expanded={isExpanded}>
                  <View className="border-t border-[#ECEBF1] px-4 py-1.5">
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
                            onRename={(id, title) =>
                              updateTodo(id, { title })
                            }
                            onToggle={toggleTodo}
                            selected={selectedTaskId === todo.id}
                            todo={todo}
                          />
                        );

                        if (!todo.parentId) {
                          return (
                            <React.Fragment key={todo.id}>
                              {row}
                            </React.Fragment>
                          );
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
                            onMove={moveSubtask}
                            parentId={todo.parentId}
                          >
                            {row}
                          </DraggableSubtask>
                        );
                      })
                    )}
                  </View>
                </CollapsibleGroupBody>
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
            renameGroup(
              activeMenuSection.id === UNGROUPED_ID
                ? null
                : activeMenuSection.id,
              name,
            );
          }}
          position={groupMenu.position}
        />
      ) : null}

      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          onDismiss={() => setToast(null)}
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
