import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Translation } from '../../content';
import { Todo } from '../../types/todo';
import DraggableTaskRow from '../tasks/DraggableTaskRow';
import { TaskDragState } from '../tasks/taskDrag';
import { OpenTaskMenu } from '../tasks/useTaskContextMenu';
import ProjectProgressBar, {
  PROJECT_COMPLETE_COLOR,
} from './ProjectProgressBar';
import { progressPercent } from './projectProgressStats';
import {
  ProjectMenuPosition,
  OpenProjectMenu,
  useProjectContextMenu,
} from './useProjectContextMenu';
import {
  ProjectTask,
  InlineTaskComposer,
} from './ProjectTaskRows';
import {
  ProjectSection,
  InlineComposerState,
} from './types';
import { useProjectCardDrag } from './useProjectCardDrag';

const CollapsibleProjectBody = ({
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

const ProjectHeader = ({
  dragBind,
  isExpanded,
  labels,
  onAddTask,
  onOpenMenu,
  onToggle,
  progress,
  section,
  selected,
}: {
  dragBind: { onPointerDown?: (event: unknown) => void };
  isExpanded: boolean;
  labels: Translation;
  onAddTask: () => void;
  onOpenMenu: OpenProjectMenu;
  onToggle: () => void;
  progress: ProjectSection['progress'];
  section: ProjectSection;
  selected: boolean;
}) => {
  const { targetRef, openFromLongPress } = useProjectContextMenu(
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

  const complete = progress.total > 0 && progress.ratio >= 1;

  return (
    <View
      accessibilityState={{ selected }}
      className="px-4 py-3"
      ref={targetRef}
      style={selected && styles.projectHeaderSelected}
      {...dragBind}
    >
      <View className="flex-row items-center">
        <Pressable
          accessibilityLabel={
            isExpanded ? labels.projects.collapse : labels.projects.expand
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
          <Text className="text-[17px] font-semibold text-[#292A3D]">
            {section.name}
          </Text>
          {progress.total > 0 ? (
            <Text
              className="ml-2 text-xs font-semibold tabular-nums"
              style={{ color: complete ? PROJECT_COMPLETE_COLOR : '#A0A1AC' }}
            >
              {progressPercent(progress.ratio)}%
            </Text>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityLabel={`${labels.addTask}: ${section.name}`}
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-[13px] bg-[#F0EEFF]"
          onPress={onAddTask}
          style={({ pressed }) => ({
            opacity: pressed ? 0.65 : 1,
            transform: [{ scale: pressed ? 0.88 : 1 }],
          })}
        >
          <Text className="text-xl font-medium text-primary">＋</Text>
        </Pressable>
      </View>
      {progress.total > 0 ? (
        <ProjectProgressBar color={section.color} ratio={progress.ratio} />
      ) : null}
    </View>
  );
};

const ProjectSectionCard = ({
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
  onOpenProjectMenu,
  onOpenInlineComposer,
  onOpenTaskComposer,
  onOpenTaskMenu,
  onReorderProject,
  onRenameTask,
  onSubmitInlineTask,
  onSubmitTask,
  onTaskDraftChange,
  onToggle,
  onToggleTask,
  projectCount,
  projectIndex,
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
  onOpenProjectMenu: (
    sectionId: string,
    position?: ProjectMenuPosition,
  ) => void;
  onOpenInlineComposer: (todo: Todo) => void;
  onOpenTaskComposer: () => void;
  onOpenTaskMenu: OpenTaskMenu;
  onReorderProject: (targetIndex: number) => void;
  onRenameTask: (id: string, title: string) => void;
  onSubmitInlineTask: () => void;
  onSubmitTask: () => void;
  onTaskDraftChange: (value: string) => void;
  onToggle: () => void;
  onToggleTask: (id: string) => void;
  projectCount: number;
  projectIndex: number;
  section: ProjectSection;
  selected: boolean;
  selectedTaskId: string | null;
  siblingIndexById: Map<string, number>;
  taskDraft: string;
}) => {
  const [taskDrag, setTaskDrag] = useState<TaskDragState | null>(null);
  const { bind, dragging, offset } = useProjectCardDrag({
    index: projectIndex,
    onReorder: onReorderProject,
    total: projectCount,
  });

  return (
    <View
      className="mb-3 overflow-hidden rounded-[20px] border border-[#E8E7EE] bg-white"
      style={[
        styles.cardShadow,
        selected && styles.projectCardSelected,
        dragging && styles.projectCardDragging,
        { transform: dragging ? [{ translateY: offset }] : undefined },
      ]}
      testID="lf-card-in"
    >
      <ProjectHeader
        dragBind={bind}
        isExpanded={expanded}
        labels={labels}
        onAddTask={onOpenTaskComposer}
        onOpenMenu={onOpenProjectMenu}
        onToggle={onToggle}
        progress={section.progress}
        section={section}
        selected={selected}
      />

      <CollapsibleProjectBody expanded={expanded}>
        <View className="border-t border-[#ECEBF1] px-4 py-1">
        {activeComposer === section.id ? (
          <View className="my-1.5">
            <InlineTaskComposer
              draft={taskDraft}
              nested={false}
              onCancel={onCancelTaskComposer}
              onChange={onTaskDraftChange}
              onSubmit={onSubmitTask}
              placeholder={labels.projects.taskPlaceholder}
            />
          </View>
        ) : null}

        {section.todos.length === 0 && activeComposer !== section.id ? (
          <Pressable
            accessibilityRole="button"
            className="items-center py-5"
            onPress={onOpenTaskComposer}
          >
            <Text className="text-xs text-[#9899A6]">
              ＋ {labels.projects.taskPlaceholder}
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
                  label={`${labels.projects.reorderTask}: ${todo.title}`}
                  nested={nested}
                  onDragStateChange={setTaskDrag}
                  onMove={onMoveTask}
                  scopeId={
                    todo.parentId
                      ? `parent:${todo.parentId}`
                      : `project:${section.id}:root`
                  }
                >
                  <ProjectTask
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
                        : labels.projects.taskPlaceholder
                    }
                  />
                ) : null}
              </React.Fragment>
            );
          })
        )}
        </View>
      </CollapsibleProjectBody>
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
  projectCardSelected: {
    borderColor: '#CFC9FA',
    shadowColor: '#6759E8',
    shadowOpacity: 0.12,
  },
  projectCardDragging: {
    borderColor: '#C9C3F6',
    opacity: 0.96,
    shadowColor: '#5A4ED0',
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
  },
  projectHeaderSelected: {
    backgroundColor: '#F3F1FF',
    position: 'relative',
  },
});

export default ProjectSectionCard;
