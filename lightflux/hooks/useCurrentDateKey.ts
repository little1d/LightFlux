import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { todayKey } from '../utils/date';

const millisecondsUntilTomorrow = (): number => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 50);
  return Math.max(250, tomorrow.getTime() - now.getTime());
};

export const useCurrentDateKey = (): string => {
  const [dateKey, setDateKey] = useState(todayKey);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const updateDate = () => {
      setDateKey(todayKey());
      clearTimeout(timer);
      timer = setTimeout(updateDate, millisecondsUntilTomorrow());
    };

    updateDate();
    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          updateDate();
        }
      },
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateDate();
      }
    };
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearTimeout(timer);
      appStateSubscription.remove();
      if (Platform.OS === 'web') {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      }
    };
  }, []);

  return dateKey;
};
