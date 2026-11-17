import { translations } from '../../content';
import TaskActionMenuDesktop from './actionMenu/TaskActionMenuDesktop';
import TaskActionMenuMobile from './actionMenu/TaskActionMenuMobile';
import useTaskActionMenu from './actionMenu/useTaskActionMenu';
import type { TaskMenuPosition } from './useTaskContextMenu';

interface TaskActionMenuProps {
  todoId: string;
  position?: TaskMenuPosition;
  onClose: () => void;
  onTrash: (todoId: string) => void;
}

/**
 * Entry point for the task action menu. It only picks a presentation; the
 * behaviour lives in `useTaskActionMenu` and the two layouts are separate
 * components, because the mobile sheet and the desktop popover share almost no
 * markup.
 */
const TaskActionMenu = ({
  todoId,
  position,
  onClose,
  onTrash,
}: TaskActionMenuProps) => {
  const menu = useTaskActionMenu({ todoId, position, onClose, onTrash });
  const { todo } = menu;

  if (!todo) {
    return null;
  }

  return menu.mobileSheet ? (
    <TaskActionMenuMobile menu={menu} onClose={onClose} todo={todo} />
  ) : (
    <TaskActionMenuDesktop
      menu={menu}
      onClose={onClose}
      position={position}
      todo={todo}
    />
  );
};

export default TaskActionMenu;
