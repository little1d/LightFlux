import { Platform } from 'react-native';

import { Language, Milestone } from '../types/todo';
import {
  buildMilestoneReminderSchedules,
  MilestoneReminderSchedule,
} from '../utils/milestoneReminder';

const NOTIFICATION_SOURCE = 'lightflux-milestone';
const ANDROID_CHANNEL_ID = 'milestone-reminders';
const MAX_SCHEDULES = 500;
const MAX_IOS_SCHEDULES = 60;
const MAX_WEB_TIMEOUT_MS = 2_147_000_000;
const TAURI_ID_BASE = 1_000_000_000;
const TAURI_ID_RANGE = 1_000_000_000;

interface WebTimerState {
  cancelled: boolean;
  handle: ReturnType<typeof setTimeout> | null;
}

const webTimers = new Map<string, WebTimerState>();
let nativeHandlerConfigured = false;
let reconciliationQueue = Promise.resolve();

const loadTauriNotifications = async () => {
  if (Platform.OS !== 'web') {
    return null;
  }
  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    return isTauri()
      ? await import('@tauri-apps/plugin-notification')
      : null;
  } catch {
    return null;
  }
};

const configureExpoNotifications = async () => {
  const notifications = await import('expo-notifications');
  if (!nativeHandlerConfigured) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    nativeHandlerConfigured = true;
  }
  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Milestone reminders',
      importance: notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
  return notifications;
};

export const requestMilestoneNotificationPermission =
  async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        const tauriNotifications = await loadTauriNotifications();
        if (tauriNotifications) {
          if (await tauriNotifications.isPermissionGranted()) {
            return true;
          }
          return (await tauriNotifications.requestPermission()) === 'granted';
        }
        if (typeof Notification === 'undefined') {
          return false;
        }
        if (Notification.permission === 'granted') {
          return true;
        }
        return (await Notification.requestPermission()) === 'granted';
      }

      const notifications = await configureExpoNotifications();
      const existing = await notifications.getPermissionsAsync();
      if (existing.granted) {
        return true;
      }
      return (await notifications.requestPermissionsAsync()).granted;
    } catch {
      return false;
    }
  };

const hasMilestoneNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'web') {
    const tauriNotifications = await loadTauriNotifications();
    if (tauriNotifications) {
      return tauriNotifications.isPermissionGranted();
    }
    return (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    );
  }
  const notifications = await configureExpoNotifications();
  return (await notifications.getPermissionsAsync()).granted;
};

const reconcileExpoNotifications = async (
  schedules: MilestoneReminderSchedule[],
) => {
  const notifications = await configureExpoNotifications();
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (request) =>
          request.content.data?.source === NOTIFICATION_SOURCE,
      )
      .map((request) =>
        notifications.cancelScheduledNotificationAsync(request.identifier),
      ),
  );
  if (!(await hasMilestoneNotificationPermission())) {
    return;
  }

  const nativeSchedules =
    Platform.OS === 'ios' ? schedules.slice(0, MAX_IOS_SCHEDULES) : schedules;
  await Promise.all(
    nativeSchedules.map((schedule) =>
      notifications.scheduleNotificationAsync({
        identifier: `${NOTIFICATION_SOURCE}:${schedule.key}`,
        content: {
          title: schedule.title,
          body: schedule.body,
          sound: 'default',
          data: {
            source: NOTIFICATION_SOURCE,
            milestoneId: schedule.milestoneId,
            occurrenceDateKey: schedule.occurrenceDateKey,
          },
        },
        trigger: {
          type: notifications.SchedulableTriggerInputTypes.DATE,
          date: schedule.fireDate,
          ...(Platform.OS === 'android'
            ? { channelId: ANDROID_CHANNEL_ID }
            : {}),
        },
      }),
    ),
  );
};

const tauriNotificationId = (key: string): number => {
  let hash = 2_166_136_261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return TAURI_ID_BASE + ((hash >>> 0) % TAURI_ID_RANGE);
};

const reconcileTauriNotifications = async (
  schedules: MilestoneReminderSchedule[],
  notifications: NonNullable<
    Awaited<ReturnType<typeof loadTauriNotifications>>
  >,
) => {
  const existingIds = (await notifications.pending())
    .map((notification) => notification.id)
    .filter(
      (id) =>
        id >= TAURI_ID_BASE && id < TAURI_ID_BASE + TAURI_ID_RANGE,
    );
  if (existingIds.length > 0) {
    await notifications.cancel(existingIds);
  }
  if (!(await notifications.isPermissionGranted())) {
    return;
  }

  schedules.forEach((schedule) => {
    notifications.sendNotification({
      id: tauriNotificationId(schedule.key),
      title: schedule.title,
      body: schedule.body,
      schedule: notifications.Schedule.at(schedule.fireDate),
      extra: {
        source: NOTIFICATION_SOURCE,
        milestoneId: schedule.milestoneId,
        occurrenceDateKey: schedule.occurrenceDateKey,
      },
    });
  });
};

export const clearRuntimeMilestoneNotifications = () => {
  webTimers.forEach((state) => {
    state.cancelled = true;
    if (state.handle) {
      clearTimeout(state.handle);
    }
  });
  webTimers.clear();
};

const showBrowserNotification = (schedule: MilestoneReminderSchedule) => {
  if (
    typeof Notification === 'undefined' ||
    Notification.permission !== 'granted'
  ) {
    return;
  }
  new Notification(schedule.title, {
    body: schedule.body,
    tag: schedule.key,
  });
};

const armBrowserTimer = (
  schedule: MilestoneReminderSchedule,
  state: WebTimerState,
) => {
  if (state.cancelled) {
    return;
  }
  const delay = schedule.fireDate.getTime() - Date.now();
  if (delay <= 0) {
    showBrowserNotification(schedule);
    webTimers.delete(schedule.key);
    return;
  }
  state.handle = setTimeout(
    () => armBrowserTimer(schedule, state),
    Math.min(delay, MAX_WEB_TIMEOUT_MS),
  );
};

const reconcileBrowserNotifications = async (
  schedules: MilestoneReminderSchedule[],
) => {
  clearRuntimeMilestoneNotifications();
  if (!(await hasMilestoneNotificationPermission())) {
    return;
  }
  schedules.forEach((schedule) => {
    const state: WebTimerState = { cancelled: false, handle: null };
    webTimers.set(schedule.key, state);
    armBrowserTimer(schedule, state);
  });
};

const performReconciliation = async (
  schedules: MilestoneReminderSchedule[],
) => {
  if (Platform.OS !== 'web') {
    await reconcileExpoNotifications(schedules);
    return;
  }
  const tauriNotifications = await loadTauriNotifications();
  if (tauriNotifications) {
    clearRuntimeMilestoneNotifications();
    await reconcileTauriNotifications(schedules, tauriNotifications);
    return;
  }
  await reconcileBrowserNotifications(schedules);
};

export const reconcileMilestoneNotifications = (
  milestones: Milestone[],
  language: Language,
  from = new Date(),
): Promise<void> => {
  const schedules = buildMilestoneReminderSchedules(
    milestones,
    language,
    from,
  ).slice(0, MAX_SCHEDULES);
  const next = reconciliationQueue.then(
    () => performReconciliation(schedules),
    () => performReconciliation(schedules),
  );
  reconciliationQueue = next.catch(() => undefined);
  return next;
};
