import Ionicons from '@expo/vector-icons/Ionicons';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type ToastVariant = 'success' | 'error' | 'celebrate';

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
}

type NotifyFn = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<NotifyFn | null>(null);

const VARIANT_THEME: Record<
  ToastVariant,
  {
    accent: string;
    background: string;
    border: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    iconColor: string;
    text: string;
  }
> = {
  success: {
    accent: '#8B7EFF',
    background: '#26243B',
    border: 'rgba(139, 126, 255, 0.28)',
    icon: 'checkmark-circle',
    iconColor: '#B7ADFF',
    text: '#F4F2FF',
  },
  celebrate: {
    accent: '#F5C451',
    background: '#332B57',
    border: 'rgba(245, 196, 81, 0.34)',
    icon: 'sparkles',
    iconColor: '#FFD36B',
    text: '#FBF6FF',
  },
  error: {
    accent: '#FF8A9B',
    background: '#4A2330',
    border: 'rgba(255, 138, 155, 0.32)',
    icon: 'alert-circle',
    iconColor: '#FFB3BF',
    text: '#FFF1F3',
  },
};

const DISPLAY_MS = 2400;

const ToastCard = ({
  entry,
  index,
  onDismiss,
}: {
  entry: ToastEntry;
  index: number;
  onDismiss: (id: number) => void;
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const theme = VARIANT_THEME[entry.variant];

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    Animated.spring(progress, {
      damping: 17,
      mass: 0.8,
      stiffness: 220,
      toValue: 1,
      useNativeDriver,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(progress, {
        duration: 160,
        toValue: 0,
        useNativeDriver,
      }).start(({ finished }) => {
        if (finished) {
          dismissRef.current(entry.id);
        }
      });
    }, DISPLAY_MS);

    return () => {
      clearTimeout(timer);
      progress.stopAnimation();
    };
  }, [entry.id, progress]);

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.toast,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          marginTop: index === 0 ? 0 : 8,
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.94, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: theme.accent }]} />
      <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}22` }]}>
        <Ionicons color={theme.iconColor} name={theme.icon} size={16} />
      </View>
      <Text numberOfLines={2} style={[styles.message, { color: theme.text }]}>
        {entry.message}
      </Text>
    </Animated.View>
  );
};

export const ToastProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<NotifyFn>((message, variant = 'success') => {
    if (!message) {
      return;
    }
    counter.current += 1;
    const entry: ToastEntry = {
      id: counter.current,
      message,
      variant,
    };
    // Keep only the most recent toasts so a burst of events never stacks
    // beyond a compact, readable column.
    setToasts((current) => [...current.slice(-2), entry]);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toasts.length > 0 ? (
        <View pointerEvents="none" style={styles.overlay}>
          <SafeAreaView pointerEvents="none" style={styles.safeArea}>
            {toasts.map((toast, index) => (
              <ToastCard
                entry={toast}
                index={index}
                key={toast.id}
                onDismiss={dismiss}
              />
            ))}
          </SafeAreaView>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
};

export const useToast = (): NotifyFn => {
  const notify = useContext(ToastContext);
  if (!notify) {
    throw new Error('useToast must be used inside ToastProvider.');
  }
  return notify;
};

const styles = StyleSheet.create({
  overlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 5000,
  },
  safeArea: {
    alignItems: 'center',
    paddingBottom: 26,
  },
  toast: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    maxWidth: 420,
    minHeight: 46,
    overflow: 'hidden',
    paddingLeft: 16,
    paddingRight: 18,
    paddingVertical: 10,
    shadowColor: '#141225',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
  },
  accent: {
    borderBottomLeftRadius: 16,
    borderTopLeftRadius: 16,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 9,
    height: 28,
    justifyContent: 'center',
    marginRight: 11,
    width: 28,
  },
  message: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});

export default ToastProvider;
