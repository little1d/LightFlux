import SettingsScreen from '../components/SettingsScreen';
import { useAppShell } from '../components/appShellContext';

export default function SettingsRoute() {
  const shell = useAppShell();
  return (
    <SettingsScreen
      currentUser={shell.currentUser}
      hiddenNavigationItems={shell.hiddenNavigationItems}
      onNavigationVisibilityChange={shell.setNavigationVisible}
      onOpenStatistics={() => shell.changeView('statistics')}
      onSignIn={shell.openAuthentication}
      onSignOut={shell.signOut}
    />
  );
}
