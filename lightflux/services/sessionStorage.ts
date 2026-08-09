import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const STORAGE_KEY = 'lightflux.session.v1';
const FILE_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}lightflux-session.json`
  : null;

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
  if (Platform.OS === 'web') {
    return getWebStorage()?.getItem(STORAGE_KEY) !== 'signed-out';
  }

  if (!FILE_URI) {
    return true;
  }

  const file = await FileSystem.getInfoAsync(FILE_URI);
  if (!file.exists) {
    return true;
  }

  return (await FileSystem.readAsStringAsync(FILE_URI)) !== 'signed-out';
};

export const saveSessionState = async (signedIn: boolean): Promise<void> => {
  const value = signedIn ? 'signed-in' : 'signed-out';

  if (Platform.OS === 'web') {
    getWebStorage()?.setItem(STORAGE_KEY, value);
    return;
  }

  if (FILE_URI) {
    await FileSystem.writeAsStringAsync(FILE_URI, value);
  }
};
