import { useEffect } from 'react';
import { Platform } from 'react-native';

import { flushAppState } from '../store/todoStore';
import { flushChatState } from '../store/chatStore';
import { listenForLocalApi } from '../services/localApiBridge';
import {
  listenForTrayActions,
  quitDesktop,
} from '../services/desktopRuntime';

interface DesktopRuntimeOptions {
  checkForUpdates: (silent: boolean) => Promise<unknown> | void;
  composeTask: () => void;
  changeView: (view: 'today' | 'milestones' | 'settings') => void;
  initializeDesktop: () => Promise<unknown> | void;
  isDesktop: boolean;
  notify: (message: string, variant?: 'error') => void;
  onQuitFailed: string;
  openUpdateMenu: () => void;
  updaterConfigured: boolean;
  updateStatus: string;
}

/**
 * Desktop-only side effects: the local API bridge used by the CLI, tray menu
 * actions, and the quit path that flushes both stores before exiting. All of it
 * is a no-op in a browser tab except the local API listener, which the CLI also
 * uses on web.
 */
const useDesktopRuntimeEffects = ({
  changeView,
  checkForUpdates,
  composeTask,
  initializeDesktop,
  isDesktop,
  notify,
  onQuitFailed,
  openUpdateMenu,
  updaterConfigured,
  updateStatus,
}: DesktopRuntimeOptions) => {
  useEffect(() => {
    void initializeDesktop();
  }, [initializeDesktop]);

  // Quietly check for updates once after desktop startup. The store treats this
  // as a background check: it stays silent when up-to-date or offline and only
  // surfaces an update according to the user's reminder preference.
  useEffect(() => {
    if (isDesktop && updaterConfigured && updateStatus === 'idle') {
      void checkForUpdates(false);
    }
  }, [checkForUpdates, isDesktop, updaterConfigured, updateStatus]);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listenForLocalApi()
      .then((listener) => {
        if (disposed) listener();
        else unlisten = listener;
      })
      .catch((error) =>
        console.warn('Unable to initialize local CLI.', error),
      );
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listenForTrayActions((action: string) => {
      if (action === 'new-task') {
        changeView('today');
        composeTask();
        return;
      }
      if (action === 'today' || action === 'milestones') {
        changeView(action);
        return;
      }
      if (action === 'settings') {
        changeView('settings');
        return;
      }
      if (action === 'update') {
        openUpdateMenu();
        return;
      }
      if (action === 'quit') {
        void flushAppState()
          .then(flushChatState)
          .then(quitDesktop)
          .catch((error) => {
            console.warn('Unable to flush data before quitting.', error);
            notify(onQuitFailed, 'error');
          });
      }
    }).then((listener) => {
      unlisten = listener;
    });
    return () => unlisten?.();
  }, [changeView, composeTask, notify, onQuitFailed, openUpdateMenu]);
};

export default useDesktopRuntimeEffects;
