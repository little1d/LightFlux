import { create } from 'zustand';
import type { Update } from '@tauri-apps/plugin-updater';

import {
  applyDesktopPreferences,
  checkDesktopUpdate,
  DEFAULT_DESKTOP_PREFERENCES,
  DesktopEnvironment,
  DesktopPreferences,
  DesktopStatusPayload,
  downloadDesktopUpdate,
  getDesktopEnvironment,
  relaunchDesktop,
  syncDesktopStatus,
} from '../services/desktopRuntime';
import {
  loadDesktopPreferences,
  saveDesktopPreferences,
} from '../services/desktopPreferences';
import { compareSemanticVersions } from '../utils/version';

export type DesktopUpdateStatus =
  | 'available'
  | 'checking'
  | 'downloading'
  | 'error'
  | 'idle'
  | 'ready'
  | 'unavailable';

interface DesktopUpdateInfo {
  body: string | null;
  date: string | null;
  required: boolean;
  version: string;
}

interface DesktopStore {
  environment: DesktopEnvironment;
  initialized: boolean;
  lastCheckedAt: number | null;
  preferences: DesktopPreferences;
  updateError: string | null;
  updateInfo: DesktopUpdateInfo | null;
  updateProgress: number | null;
  updateStatus: DesktopUpdateStatus;
  upToDate: boolean;
  checkForUpdates: (manual?: boolean) => Promise<void>;
  downloadUpdate: () => Promise<void>;
  initialize: () => Promise<void>;
  relaunchForUpdate: () => Promise<void>;
  setPreferences: (
    changes: Partial<DesktopPreferences>,
  ) => Promise<void>;
  syncStatus: (
    status: Omit<DesktopStatusPayload, 'updateReady' | 'updateVersion'>,
  ) => Promise<void>;
}

const DEFAULT_ENVIRONMENT: DesktopEnvironment = {
  currentVersion: '1.0.0',
  isDesktop: false,
  isMacos: false,
  updaterConfigured: false,
};

let pendingUpdate: Update | null = null;
let initializing: Promise<void> | null = null;
let totalDownloadBytes: number | null = null;
let downloadedBytes = 0;

const requiredUpdate = (
  update: Update,
  currentVersion: string,
): boolean => {
  const minimumVersion = update.rawJson.minimumSupportedVersion;
  return (
    typeof minimumVersion === 'string' &&
    compareSemanticVersions(currentVersion, minimumVersion) < 0
  );
};

const closePendingUpdate = async () => {
  if (pendingUpdate) {
    await pendingUpdate.close().catch(() => undefined);
    pendingUpdate = null;
  }
};

export const useDesktopStore = create<DesktopStore>((set, get) => ({
  environment: DEFAULT_ENVIRONMENT,
  initialized: false,
  lastCheckedAt: null,
  preferences: DEFAULT_DESKTOP_PREFERENCES,
  updateError: null,
  updateInfo: null,
  updateProgress: null,
  updateStatus: 'unavailable',
  upToDate: false,

  initialize: async () => {
    if (get().initialized) {
      return;
    }
    if (initializing) {
      return initializing;
    }
    initializing = Promise.all([
      getDesktopEnvironment(),
      loadDesktopPreferences(),
    ])
      .then(async ([environment, preferences]) => {
        set({
          environment,
          initialized: true,
          preferences,
          updateStatus: environment.updaterConfigured
            ? 'idle'
            : 'unavailable',
        });
        await applyDesktopPreferences(preferences).catch((error) => {
          console.warn('Unable to apply desktop preferences.', error);
        });
        if (environment.updaterConfigured) {
          globalThis.setTimeout(() => {
            void get().checkForUpdates(false);
          }, 900);
        }
      })
      .finally(() => {
        initializing = null;
      });
    return initializing;
  },

  setPreferences: async (changes) => {
    const preferences = { ...get().preferences, ...changes };
    set({ preferences });
    await saveDesktopPreferences(preferences);
    await applyDesktopPreferences(preferences).catch((error) => {
      console.warn('Unable to apply desktop preferences.', error);
    });
    if (
      changes.autoDownloadUpdates === true &&
      get().updateStatus === 'available'
    ) {
      await get().downloadUpdate();
    }
  },

  checkForUpdates: async (manual = false) => {
    const { environment } = get();
    if (!environment.updaterConfigured) {
      if (manual) {
        set({
          updateError: 'updater-not-configured',
          updateStatus: 'unavailable',
        });
      }
      return;
    }
    set({
      updateError: null,
      updateProgress: null,
      updateStatus: 'checking',
      upToDate: false,
    });
    try {
      await closePendingUpdate();
      const update = await checkDesktopUpdate();
      const checkedAt = Date.now();
      if (!update) {
        set({
          lastCheckedAt: checkedAt,
          updateInfo: null,
          updateStatus: 'idle',
          upToDate: true,
        });
        return;
      }
      pendingUpdate = update;
      set({
        lastCheckedAt: checkedAt,
        updateInfo: {
          body: update.body ?? null,
          date: update.date ?? null,
          required: requiredUpdate(update, environment.currentVersion),
          version: update.version,
        },
        updateStatus: 'available',
        upToDate: false,
      });
      if (get().preferences.autoDownloadUpdates) {
        await get().downloadUpdate();
      }
    } catch (error) {
      set({
        lastCheckedAt: Date.now(),
        updateError:
          error instanceof Error ? error.message : String(error),
        updateStatus: 'error',
      });
    }
  },

  downloadUpdate: async () => {
    if (!pendingUpdate) {
      return;
    }
    totalDownloadBytes = null;
    downloadedBytes = 0;
    set({
      updateError: null,
      updateProgress: 0,
      updateStatus: 'downloading',
    });
    try {
      await downloadDesktopUpdate(pendingUpdate, (event) => {
        if (event.event === 'Started') {
          totalDownloadBytes = event.data.contentLength ?? null;
          downloadedBytes = 0;
          return;
        }
        if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength;
          set({
            updateProgress: totalDownloadBytes
              ? Math.min(1, downloadedBytes / totalDownloadBytes)
              : null,
          });
          return;
        }
        set({ updateProgress: 1 });
      });
      set({ updateProgress: 1, updateStatus: 'ready' });
    } catch (error) {
      set({
        updateError:
          error instanceof Error ? error.message : String(error),
        updateStatus: 'error',
      });
    }
  },

  relaunchForUpdate: async () => {
    if (get().updateStatus === 'ready') {
      await relaunchDesktop();
    }
  },

  syncStatus: async (status) => {
    const updateInfo = get().updateInfo;
    await syncDesktopStatus({
      ...status,
      updateReady: get().updateStatus === 'ready',
      updateVersion: updateInfo?.version ?? null,
    }).catch((error) => {
      console.warn('Unable to synchronize desktop status.', error);
    });
  },
}));
