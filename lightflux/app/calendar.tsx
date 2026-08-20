import CalendarScreen from '../components/CalendarScreen';
import { useAppShell } from '../components/appShellContext';

export default function CalendarRoute() {
  const shell = useAppShell();
  return (
    <CalendarScreen
      onAddTask={shell.openCalendarAdd}
      onOpenTaskMenu={shell.openTaskMenu}
      onEditTask={shell.openActiveTask}
      selectedTaskId={shell.selectedTaskId}
    />
  );
}
