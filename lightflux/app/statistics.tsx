import StatisticsScreen from '../components/StatisticsScreen';
import { useAppShell } from '../components/appShellContext';

export default function StatisticsRoute() {
  const shell = useAppShell();
  return (
    <StatisticsScreen
      onBack={() => shell.changeView('today')}
      onOpenGroups={() => shell.changeView('groups')}
    />
  );
}
