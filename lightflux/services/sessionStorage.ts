import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  getRemoteSession,
  isRemoteAuthConfigured,
  logoutRemoteSession,
} from './authApi';

const STORAGE_KEY = 'lightflux.session.v1';
const sessionFile = () =>
  new File(Paths.document, 'lightflux-session.json');

interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const getWebStorage = (): WebStorage | null => {
  const runtime = globalThis as typeof globalThis & {
    localStorage?: WebStorage;
  };
  return runtime.localStorage ?? null;
};

export const loadSessionState = async (): Promise<boolean> => {
  if (isRemoteAuthConfigured) {
    return getRemoteSession();
  }

  if (Platform.OS === 'web') {
    return getWebStorage()?.getItem(STORAGE_KEY) !== 'signed-out';
  }

  const file = sessionFile();
  if (!file.exists) {
    return true;
  }

  return (await file.text()) !== 'signed-out';
};

export const saveSessionState = async (signedIn: boolean): Promise<void> => {
  if (isRemoteAuthConfigured) {
    if (!signedIn) {
      await logoutRemoteSession();
    }
    return;
  }

  const value = signedIn ? 'signed-in' : 'signed-out';

  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(STORAGE_KEY, value);
    return;
  }

  sessionFile().write(value);
};
