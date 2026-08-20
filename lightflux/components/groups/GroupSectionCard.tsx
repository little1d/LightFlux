import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { inputAccentProps } from '../../config/input';
import { Translation } from '../../content';
import { Todo } from '../../types/todo';
import DraggableTaskRow from '../tasks/DraggableTaskRow';
import { TaskDragState } from '../tasks/taskDrag';
import { OpenTaskMenu } from '../tasks/useTaskContextMenu';
import ActionButton from '../ui/ActionButton';
import {
  GroupMenuPosition,
  OpenGroupMenu,
  useGroupContextMenu,
} from './useGroupContextMenu';
import {
  GroupTask,
  InlineTaskComposer,
} from './GroupsTaskRows';
import {
  GroupSection,
  InlineComposerState,
} from './types';

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
  selected,
}: {
  isExpanded: boolean;
  labels: Translation;
  onAddTask: () => void;
  onOpenMenu: OpenGroupMenu;
  onToggle: () => void;
  section: GroupSection;
  selected: boolean;
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
    <View
      accessibilityState={{ selected }}
      className="flex-row items-center px-4 py-4"
      ref={targetRef}
      style={selected && styles.groupHeaderSelected}
    >
      {selected ? <View style={styles.groupSelectionMarker} /> : null}
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

const GroupSectionCard = ({
  activeComposer,
  childCountByParent,
  expanded,
  inlineComposer,
  inlineDraft,
  labels,
  onCancelInlineComposer,
  onCancelTaskComposer,
  onEditTask,
  onInlineDraftChange,
  onMoveTask,
  onOpenGroupMenu,
  onOpenInlineComposer,
  onOpenTaskComposer,
  onOpenTaskMenu,
  onRenameTask,
  onSubmitInlineTask,
  onSubmitTask,
  onTaskDraftChange,
  onToggle,
  onToggleTask,
  section,
  selected,
  selectedTaskId,
  siblingIndexById,
  taskDraft,
}: {
  activeComposer: string | null;
  childCountByParent: Map<string, number>;
  expanded: boolean;
  inlineComposer: InlineComposerState | null;
  inlineDraft: string;
  labels: Translation;
  onCancelInlineComposer: () => void;
  onCancelTaskComposer: () => void;
  onEditTask: (id: string) => void;
  onInlineDraftChange: (value: string) => void;
  onMoveTask: (id: string, targetIndex: number) => void;
  onOpenGroupMenu: (
    sectionId: string,
    position?: GroupMenuPosition,
  ) => void;
  onOpenInlineComposer: (todo: Todo) => void;
  onOpenTaskComposer: () => void;
  onOpenTaskMenu: OpenTaskMenu;
  onRenameTask: (id: string, title: string) => void;
  onSubmitInlineTask: () => void;
  onSubmitTask: () => void;
  onTaskDraftChange: (value: string) => void;
  onToggle: () => void;
  onToggleTask: (id: string) => void;
  section: GroupSection;
  selected: boolean;
  selectedTaskId: string | null;
  siblingIndexById: Map<string, number>;
  taskDraft: string;
}) => {
  const [taskDrag, setTaskDrag] = useState<TaskDragState | null>(null);

  return (
    <View
      className="mb-3 overflow-hidden rounded-[20px] border border-[#E8E7EE] bg-white"
      style={[styles.cardShadow, selected && styles.groupCardSelected]}
    >
      <GroupHeader
        isExpanded={expanded}
        labels={labels}
        onAddTask={onOpenTaskComposer}
        onOpenMenu={onOpenGroupMenu}
        onToggle={onToggle}
        section={section}
        selected={selected}
      />

      <CollapsibleGroupBody expanded={expanded}>
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
              onChangeText={onTaskDraftChange}
              onSubmitEditing={onSubmitTask}
              placeholder={labels.groups.taskPlaceholder}
              placeholderTextColor="#A0A1AD"
              returnKeyType="done"
              value={taskDraft}
            />
            <View className="mt-2 flex-row justify-end">
              <ActionButton
                label={labels.groups.cancelTask}
                onPress={onCancelTaskComposer}
                variant="ghost"
              />
              <View className="w-1" />
              <ActionButton
                disabled={!taskDraft.trim()}
                label={labels.addTask}
                onPress={onSubmitTask}
              />
            </View>
          </View>
        ) : null}

        {section.todos.length === 0 && activeComposer !== section.id ? (
          <Pressable
            accessibilityRole="button"
            className="items-center py-5"
            onPress={onOpenTaskComposer}
          >
            <Text className="text-xs text-[#9899A6]">
              ＋ {labels.groups.taskPlaceholder}
            </Text>
          </Pressable>
        ) : (
          section.todos.map((todo) => {
            const nested = Boolean(todo.parentId);
            return (
              <React.Fragment key={todo.id}>
                <DraggableTaskRow
                  dragState={taskDrag}
                  id={todo.id}
                  index={siblingIndexById.get(todo.id) ?? 0}
                  itemCount={
                    section.todos.filter(
                      (item) => item.parentId === todo.parentId,
                    ).length
                  }
                  label={`${labels.groups.reorderTask}: ${todo.title}`}
                  nested={nested}
                  onDragStateChange={setTaskDrag}
                  onMove={onMoveTask}
                  scopeId={
                    todo.parentId
                      ? `parent:${todo.parentId}`
                      : `group:${section.id}:root`
                  }
                >
                  <GroupTask
                    childCount={childCountByParent.get(todo.id) ?? 0}
                    editLabel={labels.editor.title}
                    markActive={labels.markActive}
                    markComplete={labels.markComplete}
                    moreActionsLabel={labels.taskMenu.moreActions}
                    nested={nested}
                    onCreateNext={() => onOpenInlineComposer(todo)}
                    onEdit={onEditTask}
                    onOpenMenu={onOpenTaskMenu}
                    onRename={onRenameTask}
                    onToggle={onToggleTask}
                    selected={selectedTaskId === todo.id}
                    todo={todo}
                  />
                </DraggableTaskRow>
                {inlineComposer?.renderAfterId === todo.id ? (
                  <InlineTaskComposer
                    draft={inlineDraft}
                    nested={Boolean(inlineComposer.parentId)}
                    onCancel={onCancelInlineComposer}
                    onChange={onInlineDraftChange}
                    onSubmit={onSubmitInlineTask}
                    placeholder={
                      inlineComposer.parentId
                        ? labels.taskMenu.subtaskPlaceholder
                        : labels.groups.taskPlaceholder
                    }
                  />
                ) : null}
              </React.Fragment>
            );
          })
        )}
        </View>
      </CollapsibleGroupBody>
    </View>
  );
};

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: '#4B4963',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  groupCardSelected: {
    borderColor: '#CFC9FA',
    shadowColor: '#6759E8',
    shadowOpacity: 0.12,
  },
  groupHeaderSelected: {
    backgroundColor: '#F3F1FF',
    position: 'relative',
  },
  groupSelectionMarker: {
    backgroundColor: '#7768EE',
    borderRadius: 2,
    bottom: 10,
    left: 0,
    position: 'absolute',
    top: 10,
    width: 3,
  },
});

export default GroupSectionCard;
