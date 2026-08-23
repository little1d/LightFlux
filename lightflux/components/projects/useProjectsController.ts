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
import { INBOX_PROJECT_ID, Todo } from '../../types/todo';
import { todayKey } from '../../utils/date';
import { useConfirmation } from '../ui/ConfirmationProvider';
import { ToastVariant } from '../ui/ToastProvider';
import {
  ProjectMenuPosition,
  OpenProjectMenu,
} from './useProjectContextMenu';
import {
  ProjectSection,
  InlineComposerState,
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

export const useProjectsController = (
  selectedTaskId: string | null,
  notify: (message: string, variant?: ToastVariant) => void,
) => {
  const requestConfirmation = useConfirmation();
  const {
    addProject,
    addTodo,
    deleteProject,
    projects,
    language,
    renameProject,
    reorderTask,
    todos,
    toggleTodo,
    updateTodo,
  } = useTodoStore(
    useShallow((state) => ({
      addProject: state.addProject,
      addTodo: state.addTodo,
      deleteProject: state.deleteProject,
      projects: state.projects,
      language: state.language,
      renameProject: state.renameProject,
      reorderTask: state.reorderTask,
      todos: state.todos,
      toggleTodo: state.toggleTodo,
      updateTodo: state.updateTodo,
    })),
  );
  const labels = translations[language];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [INBOX_PROJECT_ID]: true,
  });
  const [activeComposer, setActiveComposer] = useState<string | null>(null);
  const [taskDraft, setTaskDraft] = useState('');
  const [inlineDraft, setInlineDraft] = useState('');
  const [inlineComposer, setInlineComposer] =
    useState<InlineComposerState | null>(null);
  const [projectDraft, setProjectDraft] = useState('');
  const [projectMenu, setProjectMenu] = useState<{
    sectionId: string;
    position?: ProjectMenuPosition;
  } | null>(null);

  const activeTodos = useMemo(() => selectActiveTodos(todos), [todos]);
  const todosByProject = useMemo(() => {
    const mapped = new Map<string, Todo[]>();
    activeTodos.forEach((todo) => {
      const projectTodos = mapped.get(todo.projectId) ?? [];
      projectTodos.push(todo);
      mapped.set(todo.projectId, projectTodos);
    });
    return mapped;
  }, [activeTodos]);
  const sections = useMemo<ProjectSection[]>(
    () =>
      projects
        .map((project) => ({
          ...project,
          todos: todosByProject.get(project.id) ?? [],
        }))
        .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.name.localeCompare(
            right.name,
            language === 'zh' ? 'zh-CN' : 'en-US',
          ),
      ),
    [projects, language, todosByProject],
  );
  const childCountByParent = useMemo(
    () => buildChildCountByParent(activeTodos),
    [activeTodos],
  );
  const siblingIndexById = useMemo(
    () => buildSiblingIndexById(activeTodos),
    [activeTodos],
  );
  const activeMenuSection = projectMenu
    ? sections.find((section) => section.id === projectMenu.sectionId)
    : undefined;
  const openProjectMenu = useCallback<OpenProjectMenu>(
    (sectionId, position) => {
      setProjectMenu({ sectionId, position });
    },
    [],
  );
  const openInlineComposer = useCallback(
    (todo: Todo) => {
      const sectionId = todo.projectId;
      const section = sections.find((item) => item.id === sectionId);
      setExpanded((current) => ({ ...current, [sectionId]: true }));
      setActiveComposer(null);
      setInlineDraft('');
      setInlineComposer({
        anchorId: todo.id,
        projectId: todo.projectId,
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
          todo.projectId === dragged.projectId,
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
          todo.projectId === dragged.projectId,
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
      projectId: sectionId,
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
      projectId: inlineComposer.projectId,
      parentId: inlineComposer.parentId,
      insertAfterId: inlineComposer.anchorId,
    });
    cancelInlineComposer();
    Keyboard.dismiss();
  };
  const submitProject = () => {
    const name = projectDraft.trim();
    if (!name) {
      return;
    }
    const id = addProject(name);
    setExpanded((current) => ({ ...current, [id]: true }));
    setProjectDraft('');
    setActiveComposer(id);
    Keyboard.dismiss();
  };
  const addProjectNear = (name: string, position: 'before' | 'after') => {
    if (!activeMenuSection) {
      return;
    }
    const id = addProject(name, {
      anchorProjectId: activeMenuSection.id,
      position,
    });
    setExpanded((current) => ({ ...current, [id]: true }));
  };
  const deleteActiveProject = () => {
    if (!activeMenuSection || activeMenuSection.id === INBOX_PROJECT_ID) {
      return;
    }
    const projectId = activeMenuSection.id;
    setProjectMenu(null);
    requestConfirmation({
      cancelText: labels.cancel,
      confirmText: labels.projects.deleteProject,
      message: labels.projects.deleteProjectMessage,
      onConfirm: () => {
        deleteProject(projectId);
        setExpanded((current) => {
          const next = { ...current };
          delete next[projectId];
          return next;
        });
        if (activeComposer === projectId) {
          setActiveComposer(null);
        }
      },
      title: labels.projects.deleteProjectTitle,
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
    addProjectNear,
    cancelInlineComposer,
    cancelTaskComposer,
    childCountByParent,
    closeProjectMenu: () => setProjectMenu(null),
    deleteActiveProject,
    expanded,
    projectDraft,
    projectMenu,
    inlineComposer,
    inlineDraft,
    labels,
    moveTask,
    openComposer,
    openProjectMenu,
    openInlineComposer,
    renameActiveProject: (name: string) => {
      if (!activeMenuSection) {
        return;
      }
      renameProject(
        activeMenuSection.id,
        name,
      );
    },
    renameTask: (id: string, title: string) => updateTodo(id, { title }),
    sections,
    setProjectDraft,
    setInlineDraft,
    setTaskDraft,
    siblingIndexById,
    submitProject,
    submitInlineTask,
    submitTask,
    taskDraft,
    toggleProject: (id: string) =>
      setExpanded((current) => ({ ...current, [id]: !current[id] })),
    toggleTodo: handleToggleTodo,
  };
};
