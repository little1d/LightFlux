import { isTauri } from '@tauri-apps/api/core';
import { Platform } from 'react-native';

export const isMarketingRuntime = (): boolean => {
  if (Platform.OS !== 'web') {
    return false;
  }
  try {
    return !isTauri();
  } catch {
    return true;
  }
};
