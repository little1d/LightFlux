import { Alert, Platform } from 'react-native';

interface ConfirmationOptions {
  cancelText: string;
  confirmText: string;
  message: string;
  onConfirm: () => void;
  title: string;
}

export const requestConfirmation = ({
  cancelText,
  confirmText,
  message,
  onConfirm,
  title,
}: ConfirmationOptions) => {
  if (Platform.OS === 'web') {
    const browser = globalThis as typeof globalThis & {
      confirm?: (prompt: string) => boolean;
    };

    if (browser.confirm?.(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
};
