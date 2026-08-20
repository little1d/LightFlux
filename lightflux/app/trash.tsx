import TrashScreen from '../components/TrashScreen';
import { useAppShell } from '../components/appShellContext';

export default function TrashRoute() {
  const shell = useAppShell();
  return (
    <TrashScreen
      onPreviewTask={shell.openTrashedTask}
      selectedTaskId={shell.selectedTaskId}
    />
  );
}
