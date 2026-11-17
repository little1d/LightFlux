import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, useWindowDimensions } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { DESKTOP_LAYOUT_BREAKPOINT } from '../../../config/layout';
import { useTodoStore } from '../../../store/todoStore';
import type { Todo, TodoPriority } from '../../../types/todo';
import type { TaskMenuPosition } from '../useTaskContextMenu';

export const MENU_WIDTH = 240;
export const EDIT_MENU_WIDTH = 300;
export const PROJECT_FLYOUT_WIDTH = 216;

export type MenuMode =
  | 'date'
  | 'time'
  | 'project'
  | 'priority'
  | 'rename'
  | 'subtask'
  | null;

interface UseTaskActionMenuArgs {
  todoId: string;
  position?: TaskMenuPosition;
  onClose: () => void;
  onTrash: (todoId: string) => void;
}

/**
 * All behaviour behind the task action menu: the store slice, the current mode
 * and draft, and every mutation reachable from the menu. Callers render one of
 * two presentations on top of it (a mobile sheet or a desktop popover), and
 * must only call this once a todo is known to exist.
 */
const useTaskActionMenu = ({
  todoId,
  position,
  onClose,
  onTrash,
}: UseTaskActionMenuArgs) => {
  const {
    language,
    todos,
    projects,
    addTodo,
    moveTodoToProject,
    trashTodo,
    updateTodo,
  } = useTodoStore(
    useShallow((state) => ({
      language: state.language,
      todos: state.todos,
      projects: state.projects,
      addTodo: state.addTodo,
      moveTodoToProject: state.moveTodoToProject,
      trashTodo: state.trashTodo,
      updateTodo: state.updateTodo,
    })),
  );
  const [mode, setMode] = useState<MenuMode>(null);
  const [draft, setDraft] = useState('');
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewport = useWindowDimensions();
  const mobileSheet = viewport.width < DESKTOP_LAYOUT_BREAKPOINT;
  const compactEdit = viewport.width < 360;
  const desktopWeb = Platform.OS === 'web' && !mobileSheet;
  const orderedProjects = [...projects].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt,
  );
  const flyoutOnLeft =
    desktopWeb &&
    position !== undefined &&
    position.x + MENU_WIDTH + PROJECT_FLYOUT_WIDTH + 20 > viewport.width;

  useEffect(
    () => () => {
      if (flyoutCloseTimer.current) {
        clearTimeout(flyoutCloseTimer.current);
      }
    },
    [],
  );

  const cancelFlyoutClose = () => {
    if (flyoutCloseTimer.current) {
      clearTimeout(flyoutCloseTimer.current);
      flyoutCloseTimer.current = null;
    }
  };
  const openFlyoutOnHover = () => {
    if (!desktopWeb) {
      return;
    }
    cancelFlyoutClose();
    setFlyoutOpen(true);
  };
  const scheduleFlyoutClose = () => {
    if (!desktopWeb) {
      return;
    }
    cancelFlyoutClose();
    flyoutCloseTimer.current = setTimeout(() => setFlyoutOpen(false), 140);
  };

  const todo = todos.find((item) => item.id === todoId);

  const openMode = (nextMode: Exclude<MenuMode, null>, title = '') => {
    if (nextMode === 'rename' || nextMode === 'subtask') {
      setDraft(title);
    }
    setMode(nextMode);
  };

  const closeMode = () => setMode(null);

  const submit = (target: Todo) => {
    const title = draft.trim();
    if (!title || (mode !== 'rename' && mode !== 'subtask')) {
      return;
    }

    if (mode === 'rename') {
      updateTodo(target.id, { title });
    } else {
      addTodo({
        title,
        scheduledDate: target.scheduledDate,
        projectId: target.projectId,
        parentId: target.id,
      });
    }
    Keyboard.dismiss();
    onClose();
  };

  const moveToProject = (target: Todo, projectId: string) => {
    moveTodoToProject(target.id, projectId);
    onClose();
  };

  const moveToTrash = (target: Todo) => {
    trashTodo(target.id);
    onTrash(target.id);
    onClose();
  };

  const setPriority = (target: Todo, priority: TodoPriority) => {
    updateTodo(target.id, { priority });
    onClose();
  };

  const setScheduledDate = (target: Todo, scheduledDate: string) => {
    updateTodo(target.id, { scheduledDate });
    onClose();
  };

  const setScheduledTime = (
    target: Todo,
    scheduledTime: string | null,
  ) => {
    updateTodo(target.id, { scheduledTime });
    onClose();
  };

  return {
    cancelFlyoutClose,
    closeMode,
    compactEdit,
    desktopWeb,
    draft,
    flyoutOnLeft,
    flyoutOpen,
    language,
    mobileSheet,
    mode,
    moveToProject,
    moveToTrash,
    openFlyoutOnHover,
    openMode,
    orderedProjects,
    scheduleFlyoutClose,
    setDraft,
    setPriority,
    setScheduledDate,
    setScheduledTime,
    submit,
    todo,
  };
};

export default useTaskActionMenu;
