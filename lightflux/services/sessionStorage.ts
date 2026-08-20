import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  getRemoteSession,
  isRemoteAuthConfigured,
  logoutRemoteSession,
} from './authApi';
import { resetRemoteSyncContext } from './todoStorage';

const STORAGE_KEY = 'lightflux.session.v1';
const sessionFile = () =>
  new File(Paths.document, 'lightflux-session.json');

export type SessionState = 'authenticated' | 'local' | 'signed-out';

interface WebStorage {
  getItem(key: string): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}

const getWebStorage = (): WebStorage | null => {
  const runtime = globalThis as typeof globalThis & {
    localStorage?: WebStorage;
  };
  return runtime.localStorage ?? null;
};

const loadLocalSessionState = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    const value = storage?.getItem(STORAGE_KEY);
    if (value === 'signed-in') {
      storage?.setItem(STORAGE_KEY, 'local');
      return true;
    }
    return value === 'local';
  }

  const file = sessionFile();
  if (!file.exists) {
    return false;
  }
  const value = await file.text();
  if (value === 'signed-in') {
    file.write('local');
    return true;
  }
  return value === 'local';
};

export const loadSessionState = async (): Promise<SessionState> => {
  if (isRemoteAuthConfigured) {
    try {
      if (await getRemoteSession()) {
        return 'authenticated';
      }
    } catch {
      // Offline startup still restores an explicitly selected local session.
    }
  }

  if (await loadLocalSessionState()) {
    return 'local';
  }

  return isRemoteAuthConfigured ? 'signed-out' : 'local';
};

export const saveSessionState = async (
  state: SessionState,
): Promise<void> => {
  if (state === 'signed-out' && isRemoteAuthConfigured) {
    await logoutRemoteSession();
    resetRemoteSyncContext();
  }

  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    if (state === 'local') {
      storage?.setItem(STORAGE_KEY, state);
    } else {
      storage?.removeItem(STORAGE_KEY);
    }
    return;
  }

  const file = sessionFile();
  if (state === 'local') {
    file.write(state);
  } else if (file.exists) {
    file.delete();
  }
};
