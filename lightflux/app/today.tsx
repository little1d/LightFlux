import TodoScreen from '../components/TodoScreen';
import { useAppShell } from '../components/appShellContext';

export default function TodayRoute() {
  const shell = useAppShell();
  return (
    <TodoScreen
      focusComposerRequestId={shell.quickCreateRequestId}
      onOpenTaskMenu={shell.openTaskMenu}
      onEditTask={shell.openActiveTask}
      onNotify={shell.notify}
      onOpenMilestones={() => shell.changeView('milestones')}
      selectedTaskId={shell.selectedTaskId}
    />
  );
}
