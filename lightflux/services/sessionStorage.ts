import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  getRemoteSession,
  isRemoteAuthConfigured,
  logoutRemoteSession,
} from './authApi';
import { resetRemoteSyncContext } from './todoStorage';

const STORAGE_KEY = 'lightflux.session.v2';
const LEGACY_STORAGE_KEY = 'lightflux.session.v1';
const sessionFile = () =>
  new File(Paths.document, 'lightflux-session-v2.json');
const legacySessionFile = () =>
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
    storage?.removeItem(LEGACY_STORAGE_KEY);
    const value = storage?.getItem(STORAGE_KEY);
    if (value === 'signed-in') {
      storage?.removeItem(STORAGE_KEY);
      return false;
    }
    return value === 'local';
  }

  const legacyFile = legacySessionFile();
  if (legacyFile.exists) {
    legacyFile.delete();
  }
  const file = sessionFile();
  if (!file.exists) {
    return false;
  }
  const value = await file.text();
  if (value === 'signed-in') {
    file.delete();
    return false;
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

  return 'signed-out';
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
    storage?.removeItem(LEGACY_STORAGE_KEY);
    if (state === 'local') {
      storage?.setItem(STORAGE_KEY, state);
    } else {
      storage?.removeItem(STORAGE_KEY);
    }
    return;
  }

  const legacyFile = legacySessionFile();
  if (legacyFile.exists) {
    legacyFile.delete();
  }
  const file = sessionFile();
  if (state === 'local') {
    file.write(state);
  } else if (file.exists) {
    file.delete();
  }
};
