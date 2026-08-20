import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DESKTOP_LAYOUT_BREAKPOINT } from '../../config/layout';
import { translations } from '../../content';
import { useTodoStore } from '../../store/todoStore';
import Toast, { ToastVariant } from './Toast';

export type { ToastVariant } from './Toast';

interface ToastEntry {
  id: number;
  message: string;
  variant: ToastVariant;
}

type NotifyFn = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<NotifyFn | null>(null);

export const ToastProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);
  const language = useTodoStore((state) => state.language);
  const { width } = useWindowDimensions();

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
    setToasts((current) => [...current.slice(-2), entry]);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      {toasts.length > 0 ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <SafeAreaView
            pointerEvents="box-none"
            style={[
              styles.safeArea,
              width < DESKTOP_LAYOUT_BREAKPOINT
                ? styles.safeAreaNarrow
                : styles.safeAreaDesktop,
            ]}
          >
            {toasts.map((toast, index) => (
              <Toast
                dismissLabel={translations[language].cancel}
                index={index}
                key={toast.id}
                message={toast.message}
                onDismiss={() => dismiss(toast.id)}
                variant={toast.variant}
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
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
    zIndex: 12000,
  },
  safeArea: {
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  safeAreaDesktop: {
    paddingBottom: 26,
  },
  safeAreaNarrow: {
    paddingBottom: 80,
  },
});

export default ToastProvider;
