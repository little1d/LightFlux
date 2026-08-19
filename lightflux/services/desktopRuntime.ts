import { getVersion } from '@tauri-apps/api/app';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { relaunch } from '@tauri-apps/plugin-process';
import {
  check,
  DownloadEvent,
  Update,
} from '@tauri-apps/plugin-updater';

export type DockBadgeMode = 'none' | 'overdue' | 'today';
export type DockIconStyle = 'flux' | 'graphite' | 'paper';
export type DockVisibility = 'always' | 'hidden' | 'window-open';
export type DesktopCloseBehavior = 'hide' | 'quit';
export type UpdateReminderMode =
  | 'settings-only'
  | 'sidebar'
  | 'sidebar-and-toast';

export interface DesktopPreferences {
  autoDownloadUpdates: boolean;
  closeBehavior: DesktopCloseBehavior;
  dockBadge: DockBadgeMode;
  dockIcon: DockIconStyle;
  dockVisibility: DockVisibility;
  skippedUpdateVersions: string[];
  updateReminder: UpdateReminderMode;
}

export interface DesktopEnvironment {
  currentVersion: string;
  isDesktop: boolean;
  isMacos: boolean;
  updaterConfigured: boolean;
}

export interface DesktopStatusPayload {
  badgeCount: number | null;
  language: 'en' | 'zh';
  overdueCount: number;
  todayCount: number;
  updateReady: boolean;
  updateVersion: string | null;
}

export const DEFAULT_DESKTOP_PREFERENCES: DesktopPreferences = {
  autoDownloadUpdates: false,
  closeBehavior: 'hide',
  dockBadge: 'today',
  dockIcon: 'flux',
  dockVisibility: 'always',
  skippedUpdateVersions: [],
  updateReminder: 'sidebar-and-toast',
};

const FALLBACK_ENVIRONMENT: DesktopEnvironment = {
  currentVersion: '1.0.0',
  isDesktop: false,
  isMacos: false,
  updaterConfigured: false,
};

const isDesktopRuntime = (): boolean => {
  try {
    return isTauri();
  } catch {
    return false;
  }
};

export const getDesktopEnvironment =
  async (): Promise<DesktopEnvironment> => {
    if (!isDesktopRuntime()) {
      return {
        ...FALLBACK_ENVIRONMENT,
        currentVersion: await getVersion().catch(
          () => FALLBACK_ENVIRONMENT.currentVersion,
        ),
      };
    }
    return invoke<DesktopEnvironment>('desktop_environment');
  };

export const applyDesktopPreferences = async (
  preferences: DesktopPreferences,
): Promise<void> => {
  if (!isDesktopRuntime()) {
    return;
  }
  await invoke('apply_desktop_preferences', {
    preferences: {
      closeBehavior: preferences.closeBehavior,
      dockBadge: preferences.dockBadge,
      dockIcon: preferences.dockIcon,
      dockVisibility: preferences.dockVisibility,
    },
  });
};

export const syncDesktopStatus = async (
  status: DesktopStatusPayload,
): Promise<void> => {
  if (!isDesktopRuntime()) {
    return;
  }
  await invoke('update_desktop_status', { status });
};

export const checkDesktopUpdate = async (): Promise<Update | null> =>
  check({ timeout: 15_000 });

export const downloadDesktopUpdate = async (
  update: Update,
  onEvent: (event: DownloadEvent) => void,
): Promise<void> => update.downloadAndInstall(onEvent, { timeout: 120_000 });

export const relaunchDesktop = async (): Promise<void> => relaunch();

export const listenForTrayActions = async (
  listener: (action: string) => void,
): Promise<UnlistenFn> => {
  if (!isDesktopRuntime()) {
    return () => undefined;
  }
  return listen<string>('lightflux://tray-action', (event) => {
    listener(event.payload);
  });
};

export const quitDesktop = async (): Promise<void> => {
  if (isDesktopRuntime()) {
    await invoke('quit_desktop');
  }
};
