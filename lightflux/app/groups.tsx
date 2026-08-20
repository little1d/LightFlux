import GroupsScreen from '../components/GroupsScreen';
import { useAppShell } from '../components/appShellContext';

export default function GroupsRoute() {
  const shell = useAppShell();
  return (
    <GroupsScreen
      onOpenTaskMenu={shell.openTaskMenu}
      onEditTask={shell.openActiveTask}
      selectedTaskId={shell.selectedTaskId}
    />
  );
}
