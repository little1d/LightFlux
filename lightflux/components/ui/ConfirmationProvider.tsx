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
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import ActionButton from './ActionButton';

export interface ConfirmationOptions {
  cancelText: string;
  confirmText: string;
  message: string;
  onConfirm: () => void;
  title: string;
}

type RequestConfirmation = (options: ConfirmationOptions) => void;

const ConfirmationContext = createContext<RequestConfirmation | null>(null);

const ConfirmationDialog = ({
  onCancel,
  onConfirm,
  options,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  options: ConfirmationOptions;
}) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      duration: 140,
      toValue: 1,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', closeOnEscape, true);
    return () => document.removeEventListener('keydown', closeOnEscape, true);
  }, [onCancel]);

  return (
    <Modal
      animationType="none"
      onRequestClose={onCancel}
      transparent
      visible
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel={options.cancelText}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={[
            styles.dialog,
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.985, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>{options.title}</Text>
          <Text style={styles.message}>{options.message}</Text>
          <View style={styles.actions}>
            <ActionButton
              label={options.cancelText}
              onPress={onCancel}
              variant="ghost"
            />
            <View style={styles.actionGap} />
            <ActionButton
              label={options.confirmText}
              onPress={onConfirm}
              variant="danger"
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export const ConfirmationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [options, setOptions] = useState<ConfirmationOptions | null>(null);
  const requestConfirmation = useCallback<RequestConfirmation>(
    (nextOptions) => setOptions(nextOptions),
    [],
  );
  const cancel = useCallback(() => setOptions(null), []);
  const confirm = useCallback(() => {
    const action = options?.onConfirm;
    setOptions(null);
    action?.();
  }, [options]);

  return (
    <ConfirmationContext.Provider value={requestConfirmation}>
      {children}
      {options ? (
        <ConfirmationDialog
          onCancel={cancel}
          onConfirm={confirm}
          options={options}
        />
      ) : null}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = (): RequestConfirmation => {
  const requestConfirmation = useContext(ConfirmationContext);
  if (!requestConfirmation) {
    throw new Error('useConfirmation must be used inside ConfirmationProvider.');
  }
  return requestConfirmation;
};

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(28, 26, 39, 0.26)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E0E7',
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 380,
    padding: 20,
    shadowColor: '#242235',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    width: '100%',
  },
  title: {
    color: '#303143',
    fontSize: 17,
    fontWeight: '800',
  },
  message: {
    color: '#666778',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  actionGap: {
    width: 8,
  },
});
