import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Keyboard, Platform } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { translations } from '../../content';
import {
  buildChildCountByParent,
  buildSiblingIndexById,
  selectActiveTodos,
} from '../../store/todoDomain';
import { useTodoStore } from '../../store/todoStore';
import { Todo } from '../../types/todo';
import { todayKey } from '../../utils/date';
import { useConfirmation } from '../ui/ConfirmationProvider';
import { ToastVariant } from '../ui/ToastProvider';
import {
  GroupMenuPosition,
  OpenGroupMenu,
} from './useGroupContextMenu';
import {
  GroupSection,
  InlineComposerState,
  UNGROUPED_ID,
} from './types';

const familyTailId = (todos: Todo[], rootId: string): string => {
  const rootIndex = todos.findIndex((todo) => todo.id === rootId);
  if (rootIndex < 0) {
    return rootId;
  }

  const familyIds = new Set([rootId]);
  let tailId = rootId;
  for (let index = rootIndex + 1; index < todos.length; index += 1) {
    const candidate = todos[index];
    if (candidate.parentId && familyIds.has(candidate.parentId)) {
      familyIds.add(candidate.id);
      tailId = candidate.id;
      continue;
    }
    break;
  }
  return tailId;
};

export const useGroupsController = (
  selectedTaskId: string | null,
  notify: (message: string, variant?: ToastVariant) => void,
) => {
  const requestConfirmation = useConfirmation();
  const {
    addGroup,
    addTodo,
    deleteGroup,
    groups,
    language,
    renameGroup,
    reorderTask,
    todos,
    toggleTodo,
    ungroupedName,
    updateTodo,
  } = useTodoStore(
    useShallow((state) => ({
      addGroup: state.addGroup,
      addTodo: state.addTodo,
      deleteGroup: state.deleteGroup,
      groups: state.groups,
      language: state.language,
      renameGroup: state.renameGroup,
      reorderTask: state.reorderTask,
      todos: state.todos,
      toggleTodo: state.toggleTodo,
      ungroupedName: state.ungroupedName,
      updateTodo: state.updateTodo,
    })),
  );
  const labels = translations[language];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [UNGROUPED_ID]: true,
  });
  const [activeComposer, setActiveComposer] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState('');
  const [inlineDraft, setInlineDraft] = useState('');
  const [inlineComposer, setInlineComposer] =
    useState<InlineComposerState | null>(null);
  const [groupDraft, setGroupDraft] = useState('');
  const [groupMenu, setGroupMenu] = useState<{
    sectionId: string;
    position?: GroupMenuPosition;
  } | null>(null);

  const activeTodos = useMemo(() => selectActiveTodos(todos), [todos]);
  const todosByGroup = useMemo(() => {
    const grouped = new Map<string | null, Todo[]>();
    activeTodos.forEach((todo) => {
      const groupTodos = grouped.get(todo.groupId) ?? [];
      groupTodos.push(todo);
      grouped.set(todo.groupId, groupTodos);
    });
    return grouped;
  }, [activeTodos]);
  const sections = useMemo<GroupSection[]>(
    () =>
      [
        {
          id: UNGROUPED_ID,
          name: ungroupedName ?? labels.groups.ungrouped,
          color: '#9A97AD',
          sortOrder: 0,
          todos: todosByGroup.get(null) ?? [],
        },
        ...groups.map((group) => ({
          ...group,
          todos: todosByGroup.get(group.id) ?? [],
        })),
      ].sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(
            right.name,
            language === 'zh' ? 'zh-CN' : 'en-US',
          ),
      ),
    [groups, labels.groups.ungrouped, language, todosByGroup, ungroupedName],
  );
  const childCountByParent = useMemo(
    () => buildChildCountByParent(activeTodos),
    [activeTodos],
  );
  const siblingIndexById = useMemo(
    () => buildSiblingIndexById(activeTodos),
    [activeTodos],
  );
  const activeMenuSection = groupMenu
    ? sections.find((section) => section.id === groupMenu.sectionId)
    : undefined;
  const openGroupMenu = useCallback<OpenGroupMenu>(
    (sectionId, position) => {
      setGroupMenu({ sectionId, position });
    },
    [],
  );
  const openInlineComposer = useCallback(
    (todo: Todo) => {
      const sectionId = todo.groupId ?? UNGROUPED_ID;
      const section = sections.find((item) => item.id === sectionId);
      setExpanded((current) => ({ ...current, [sectionId]: true }));
      setActiveComposer(null);
      setInlineDraft('');
      setInlineComposer({
        anchorId: todo.id,
        groupId: todo.groupId,
        parentId: todo.parentId,
        renderAfterId: section
          ? familyTailId(section.todos, todo.id)
          : todo.id,
        scheduledDate: todo.scheduledDate,
      });
    },
    [sections],
  );
  const moveTask = useCallback(
    (id: string, targetIndex: number) => {
      const dragged = activeTodos.find((todo) => todo.id === id);
      if (!dragged) {
        return;
      }

      const siblings = activeTodos.filter(
        (todo) =>
          todo.parentId === dragged.parentId &&
          todo.groupId === dragged.groupId,
      );
      const sourceIndex = siblings.findIndex((todo) => todo.id === id);
      const boundedTarget = Math.max(
        0,
        Math.min(targetIndex, siblings.length - 1),
      );
      if (sourceIndex < 0 || sourceIndex === boundedTarget) {
        return;
      }

      const target = siblings[boundedTarget];
      const persistedSiblings = todos.filter(
        (todo) =>
          todo.parentId === dragged.parentId &&
          todo.groupId === dragged.groupId,
      );
      const persistedTargetIndex = persistedSiblings.findIndex(
        (todo) => todo.id === target.id,
      );
      reorderTask(
        id,
        persistedTargetIndex >= 0
          ? persistedTargetIndex
          : boundedTarget,
      );
      notify(labels.notifications.orderUpdated);
    },
    [
      activeTodos,
      labels.notifications.orderUpdated,
      notify,
      reorderTask,
      todos,
    ],
  );

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const createAfterSelection = (event: KeyboardEvent) => {
      if (
        inlineComposer ||
        event.key !== 'Enter' ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target?.matches('input, textarea, select') ||
        target?.isContentEditable
      ) {
        return;
      }
      const selectedTodo = activeTodos.find(
        (todo) => todo.id === selectedTaskId,
      );
      if (!selectedTodo) {
        return;
      }

      event.preventDefault();
      openInlineComposer(selectedTodo);
    };

    document.addEventListener('keydown', createAfterSelection);
    return () =>
      document.removeEventListener('keydown', createAfterSelection);
  }, [
    activeTodos,
    inlineComposer,
    openInlineComposer,
    selectedTaskId,
  ]);

  const openComposer = (id: string) => {
    setExpanded((current) => ({ ...current, [id]: true }));
    setInlineComposer(null);
    setInlineDraft('');
    setActiveComposer(id);
    setTaskDraft('');
  };
  const cancelTaskComposer = () => {
    setActiveComposer(null);
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
    cancelTaskComposer();
    Keyboard.dismiss();
  };
  const cancelInlineComposer = () => {
    setInlineDraft('');
    setInlineComposer(null);
  };
  const submitInlineTask = () => {
    const title = inlineDraft.trim();
    if (!title || !inlineComposer) {
      return;
    }
    addTodo({
      title,
      scheduledDate: inlineComposer.scheduledDate,
      groupId: inlineComposer.groupId,
      parentId: inlineComposer.parentId,
      insertAfterId: inlineComposer.anchorId,
    });
    cancelInlineComposer();
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
  const addGroupNear = (name: string, position: 'before' | 'after') => {
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

  // Completing a task earns praise; reopening quietly confirms the change.
  const handleToggleTodo = (id: string) => {
    const target = activeTodos.find((todo) => todo.id === id);
    const willComplete = target ? !target.completed : false;
    toggleTodo(id);
    if (!target) {
      return;
    }
    if (!willComplete) {
      notify(labels.notifications.taskReopened, 'success');
      return;
    }
    const praises = labels.notifications.taskCompleted;
    const message =
      praises[Math.floor(Math.random() * praises.length)] ?? praises[0];
    notify(message, 'celebrate');
  };

  return {
    activeComposer,
    activeMenuSection,
    addGroupNear,
    cancelInlineComposer,
    cancelTaskComposer,
    childCountByParent,
    closeGroupMenu: () => setGroupMenu(null),
    deleteActiveGroup,
    expanded,
    groupDraft,
    groupMenu,
    inlineComposer,
    inlineDraft,
    labels,
    moveTask,
    openComposer,
    openGroupMenu,
    openInlineComposer,
    renameActiveGroup: (name: string) => {
      if (!activeMenuSection) {
        return;
      }
      renameGroup(
        activeMenuSection.id === UNGROUPED_ID
          ? null
          : activeMenuSection.id,
        name,
      );
    },
    renameTask: (id: string, title: string) => updateTodo(id, { title }),
    sections,
    setGroupDraft,
    setInlineDraft,
    setTaskDraft,
    siblingIndexById,
    submitGroup,
    submitInlineTask,
    submitTask,
    taskDraft,
    toggleGroup: (id: string) =>
      setExpanded((current) => ({ ...current, [id]: !current[id] })),
    toggleTodo: handleToggleTodo,
  };
};
