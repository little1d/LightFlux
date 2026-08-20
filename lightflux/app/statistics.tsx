import { useWindowDimensions } from 'react-native';

import StatisticsScreen from '../components/StatisticsScreen';
import { useAppShell } from '../components/appShellContext';

export default function StatisticsRoute() {
  const shell = useAppShell();
  const { width } = useWindowDimensions();
  const usesDesktopLayout = width >= 900;
  return (
    <StatisticsScreen
      onBack={() => shell.changeView(usesDesktopLayout ? 'settings' : 'groups')}
      onOpenGroups={() => shell.changeView('groups')}
    />
  );
}
