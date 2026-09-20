import ProjectsScreen from '../components/ProjectsScreen';
import { useAppShell } from '../components/appShellContext';

export default function ProjectsRoute() {
  const shell = useAppShell();
  return (
    <ProjectsScreen
      onCloseTask={shell.closeActiveTask}
      onOpenTaskMenu={shell.openTaskMenu}
      onEditTask={shell.openActiveTask}
      selectedTaskId={shell.selectedTaskId}
    />
  );
}
