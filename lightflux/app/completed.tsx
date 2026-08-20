import CompletedScreen from '../components/CompletedScreen';
import { useAppShell } from '../components/appShellContext';

export default function CompletedRoute() {
  const shell = useAppShell();
  return (
    <CompletedScreen
      onOpenTaskMenu={shell.openTaskMenu}
      onEditTask={shell.openActiveTask}
      selectedTaskId={shell.selectedTaskId}
    />
  );
}
