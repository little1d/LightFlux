import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { AppView } from '../../components/appShellContext';
import type { NavigationItemId } from '../../types/todo';

export type NavigationView = NavigationItemId;

export const NAV_ICONS: Record<
  NavigationView,
  ComponentProps<typeof Ionicons>['name']
> = {
  today: 'sunny-outline',
  completed: 'checkmark-done-outline',
  calendar: 'calendar-outline',
  milestones: 'hourglass-outline',
  projects: 'folder-open-outline',
  trash: 'trash-outline',
  chat: 'chatbubbles-outline',
};

const NAVIGABLE_VIEWS: AppView[] = [
  'today',
  'completed',
  'calendar',
  'milestones',
  'projects',
  'trash',
  'chat',
  'settings',
  'statistics',
];

// Derive the active view from the current route so navigation highlighting and
// selection guards stay in sync with the URL. Unknown paths fall back to the
// primary workspace.
export const viewFromPathname = (pathname: string): AppView => {
  const segment = pathname.replace(/^\/+/, '').split('/')[0];
  const match = NAVIGABLE_VIEWS.find((view) => view === segment);
  return match ?? 'today';
};
