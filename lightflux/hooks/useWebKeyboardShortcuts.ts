import { useEffect } from 'react';
import { Platform } from 'react-native';

interface WebKeyboardShortcuts {
  onComposeTask: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  /** Escape: close search, then any open task menu or editor. */
  onReset: () => void;
}

/**
 * Global keyboard shortcuts on web: Cmd/Ctrl+N composes a task, Cmd/Ctrl+, opens
 * settings, Cmd/Ctrl+F opens search, and Escape unwinds the topmost overlay.
 */
const useWebKeyboardShortcuts = ({
  onComposeTask,
  onOpenSearch,
  onOpenSettings,
  onReset,
}: WebKeyboardShortcuts) => {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        onComposeTask();
        return;
      }
      if (command && event.key === ',') {
        event.preventDefault();
        onOpenSettings();
        return;
      }
      if (command && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        onOpenSearch();
        return;
      }

      if (event.key === 'Escape') {
        onReset();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onComposeTask, onOpenSearch, onOpenSettings, onReset]);
};

export default useWebKeyboardShortcuts;
