import { createContext, useContext } from 'react';

import type { ToastVariant } from './ui/ToastProvider';
import type { OpenTaskMenu } from './tasks/useTaskContextMenu';
import type { OptionalNavigationItemId } from '../types/todo';

// A view the shell can navigate to. Kept in sync with the route files under
// `app/`; `settings` and `statistics` are reached alongside the six primary
// navigation items.
export type AppView =
  | 'today'
  | 'completed'
  | 'calendar'
  | 'milestones'
  | 'groups'
  | 'trash'
  | 'settings'
  | 'statistics';

// The persistent shell (app/_layout) owns task selection, overlays, and cross
// screen callbacks. Route pages read them here instead of receiving props from
// a parent, since expo-router renders each page through <Slot/> rather than an
// inline switch.
export interface AppShellValue {
  selectedTaskId: string | null;
  quickCreateRequestId: number;
  openTaskMenu: OpenTaskMenu;
  openActiveTask: (id: string) => void;
  openTrashedTask: (id: string) => void;
  openCalendarAdd: (dateKey: string) => void;
  notify: (message: string, variant?: ToastVariant) => void;
  changeView: (view: AppView) => void;
  currentUser: { email: string; name?: string } | null;
  hiddenNavigationItems: OptionalNavigationItemId[];
  setNavigationVisible: (
    id: OptionalNavigationItemId,
    visible: boolean,
  ) => void;
  openAuthentication: () => void;
  signOut: () => void;
}

const AppShellContext = createContext<AppShellValue | null>(null);

export const AppShellProvider = AppShellContext.Provider;

export const useAppShell = (): AppShellValue => {
  const value = useContext(AppShellContext);
  if (!value) {
    throw new Error('useAppShell must be used inside the app shell.');
  }
  return value;
};
