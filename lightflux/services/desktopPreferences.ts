import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  DEFAULT_DESKTOP_PREFERENCES,
  DesktopPreferences,
} from './desktopRuntime';

const STORAGE_KEY = 'lightflux.desktop-preferences.v1';
const preferencesFile = () =>
  new File(Paths.document, 'lightflux-desktop-preferences.json');

interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const webStorage = (): WebStorage | null => {
  const runtime = globalThis as typeof globalThis & {
    localStorage?: WebStorage;
  };
  return runtime.localStorage ?? null;
};

const normalize = (value: unknown): DesktopPreferences => {
  if (!value || typeof value !== 'object') {
    return DEFAULT_DESKTOP_PREFERENCES;
  }
  const preferences = value as Partial<DesktopPreferences>;
  return {
    autoDownloadUpdates:
      preferences.autoDownloadUpdates === true,
    closeBehavior:
      preferences.closeBehavior === 'quit' ? 'quit' : 'hide',
    dockBadge:
      preferences.dockBadge === 'none' ||
      preferences.dockBadge === 'overdue'
        ? preferences.dockBadge
        : 'today',
    dockIcon:
      preferences.dockIcon === 'paper' ||
      preferences.dockIcon === 'graphite'
        ? preferences.dockIcon
        : 'flux',
    dockVisibility:
      preferences.dockVisibility === 'hidden' ||
      preferences.dockVisibility === 'window-open'
        ? preferences.dockVisibility
        : 'always',
    skippedUpdateVersions: Array.isArray(preferences.skippedUpdateVersions)
      ? preferences.skippedUpdateVersions.filter(
          (version): version is string => typeof version === 'string',
        )
      : [],
    updateReminder:
      preferences.updateReminder === 'settings-only' ||
      preferences.updateReminder === 'sidebar'
        ? preferences.updateReminder
        : 'sidebar-and-toast',
  };
};

const parse = (rawValue: string | null): DesktopPreferences => {
  if (!rawValue) {
    return DEFAULT_DESKTOP_PREFERENCES;
  }
  try {
    return normalize(JSON.parse(rawValue));
  } catch {
    return DEFAULT_DESKTOP_PREFERENCES;
  }
};

export const loadDesktopPreferences =
  async (): Promise<DesktopPreferences> => {
    if (Platform.OS === 'web') {
      return parse(webStorage()?.getItem(STORAGE_KEY) ?? null);
    }
    const file = preferencesFile();
    return file.exists ? parse(await file.text()) : DEFAULT_DESKTOP_PREFERENCES;
  };

export const saveDesktopPreferences = async (
  preferences: DesktopPreferences,
): Promise<void> => {
  const serialized = JSON.stringify(preferences);
  if (Platform.OS === 'web') {
    webStorage()?.setItem(STORAGE_KEY, serialized);
    return;
  }
  preferencesFile().write(serialized);
};
