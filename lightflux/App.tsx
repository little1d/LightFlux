import Ionicons from '@expo/vector-icons/Ionicons';
import React, {
  ComponentProps,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import CalendarScreen from './components/CalendarScreen';
import CompletedScreen from './components/CompletedScreen';
import GroupsScreen from './components/GroupsScreen';
import SearchScreen from './components/SearchScreen';
import SettingsScreen from './components/SettingsScreen';
import SignedOutScreen from './components/SignedOutScreen';
import TrashScreen from './components/TrashScreen';
import TodoScreen from './components/TodoScreen';
import AccountMenu, {
  AccountAvatar,
} from './components/account/AccountMenu';
import AgentCommandPanel from './components/agent/AgentCommandPanel';
import TaskEditorScreen from './components/editor/TaskEditorScreen';
import ResizableDivider from './components/layout/ResizableDivider';
import DraggableNavigationItem from './components/navigation/DraggableNavigationItem';
import TaskActionMenu from './components/tasks/TaskActionMenu';
import {
  OpenTaskMenu,
  TaskMenuPosition,
} from './components/tasks/useTaskContextMenu';
import Toast from './components/ui/Toast';
import { TodoProvider, useTodoStore } from './store/todoStore';
import { translations } from './i18n/translations';
import { isRemoteAuthConfigured } from './services/authApi';
import {
  loadSessionState,
  saveSessionState,
} from './services/sessionStorage';
import { NavigationItemId } from './types/todo';
import { requestConfirmation } from './utils/confirm';

type AppView = NavigationItemId | 'settings';
type NavigationView = NavigationItemId;
type SelectedTask = {
  id: string;
  readOnly: boolean;
  requestId: number;
};
type ToastMessage = {
  id: number;
  message: string;
  variant?: 'error' | 'success';
};

const DESKTOP_NAV_WIDTH = 78;
const DIVIDER_WIDTH = 8;
const MIN_LIST_WIDTH = 360;
const MIN_DETAILS_WIDTH = 360;

const NAV_ICONS: Record<
  NavigationView,
  ComponentProps<typeof Ionicons>['name']
> = {
  search: 'search-outline',
  today: 'sunny-outline',
  completed: 'checkmark-done-outline',
  calendar: 'calendar-outline',
  groups: 'albums-outline',
  trash: 'trash-outline',
};

const AppContent = () => {
  const [activeView, setActiveView] = useState<AppView>('groups');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [listPaneWidth, setListPaneWidth] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [taskMenu, setTaskMenu] = useState<{
    todoId: string;
    position?: TaskMenuPosition;
  } | null>(null);
  const {
    clearPersistenceError,
    language,
    navigationOrder,
    persistenceErrorAt,
    reorderNavigationItem,
  } = useTodoStore(
    useShallow((state) => ({
      clearPersistenceError: state.clearPersistenceError,
      language: state.language,
      navigationOrder: state.navigationOrder,
      persistenceErrorAt: state.persistenceErrorAt,
      reorderNavigationItem: state.reorderNavigationItem,
    })),
  );
  const selectedTaskExists = useTodoStore((state) => {
    if (!selectedTask) {
      return true;
    }
    const source = selectedTask.readOnly ? state.trashedTodos : state.todos;
    return source.some((todo) => todo.id === selectedTask.id);
  });
  const trashedTodoCount = useTodoStore(
    (state) => state.trashedTodos.length,
  );
  const { width } = useWindowDimensions();
  const labels = translations[language];
  const usesDesktopLayout = width >= 900;
  const selectedTaskId = selectedTask?.id ?? null;
  const availableDesktopWidth = width - DESKTOP_NAV_WIDTH;
  const maximumListWidth = Math.max(
    MIN_LIST_WIDTH,
    availableDesktopWidth - MIN_DETAILS_WIDTH - DIVIDER_WIDTH,
  );
  const resolvedListPaneWidth = Math.min(
    maximumListWidth,
    Math.max(
      MIN_LIST_WIDTH,
      listPaneWidth ?? Math.round(availableDesktopWidth * 0.46),
    ),
  );
  const navigationItems = navigationOrder.map((id) => ({
    id,
    icon: NAV_ICONS[id],
  }));
  const moveNavigationItem = useCallback(
    (id: NavigationItemId, targetIndex: number) => {
      const sourceIndex = navigationOrder.indexOf(id);
      const boundedTarget = Math.max(
        0,
        Math.min(targetIndex, navigationOrder.length - 1),
      );
      if (sourceIndex < 0 || sourceIndex === boundedTarget) {
        return;
      }

      reorderNavigationItem(id, boundedTarget);
      setToast({
        id: Date.now(),
        message: labels.notifications.orderUpdated,
      });
    },
    [
      labels.notifications.orderUpdated,
      navigationOrder,
      reorderNavigationItem,
    ],
  );

  const openTaskMenu = useCallback<OpenTaskMenu>((todoId, position) => {
    setTaskMenu({ todoId, position });
  }, []);
  const openActiveTask = useCallback((id: string) => {
    setSelectedTask({
      id,
      readOnly: false,
      requestId: Date.now(),
    });
  }, []);
  const openTrashedTask = useCallback((id: string) => {
    setSelectedTask({
      id,
      readOnly: true,
      requestId: Date.now(),
    });
  }, []);
  const closeSelectedTask = useCallback(() => {
    setSelectedTask(null);
  }, []);
  const changeView = useCallback((view: AppView) => {
    setActiveView(view);
    setAccountMenuOpen(false);
    setSelectedTask(null);
    setTaskMenu(null);
  }, []);
  const openAgent = useCallback(() => {
    setAccountMenuOpen(false);
    setTaskMenu(null);
    setSelectedTask(null);
    setAgentOpen(true);
  }, []);

  useEffect(() => {
    let active = true;
    loadSessionState()
      .then((value) => {
        if (active) {
          setSignedIn(value);
        }
      })
      .catch(() => {
        if (active) {
          setSignedIn(!isRemoteAuthConfigured);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        openAgent();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        changeView('search');
        return;
      }

      if (event.key === 'Escape') {
        setAgentOpen(false);
        setAccountMenuOpen(false);
        setTaskMenu(null);
        setSelectedTask(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [changeView, openAgent]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    if (!selectedTaskExists) {
      setSelectedTask(null);
    }
  }, [selectedTask, selectedTaskExists]);

  useEffect(() => {
    if (persistenceErrorAt) {
      setToast({
        id: persistenceErrorAt,
        message: labels.notifications.saveFailed,
        variant: 'error',
      });
    }
  }, [labels.notifications.saveFailed, persistenceErrorAt]);

  const signOut = () => {
    setAccountMenuOpen(false);
    requestConfirmation({
      cancelText: labels.cancel,
      confirmText: labels.account.signOut,
      message: labels.account.signOutMessage,
      onConfirm: () => {
        setSelectedTask(null);
        setTaskMenu(null);
        setSignedIn(false);
        void saveSessionState(false);
      },
      title: labels.account.signOutTitle,
    });
  };

  const continueSession = () => {
    setSignedIn(true);
    setActiveView('groups');
    void saveSessionState(true);
  };

  if (signedIn === null) {
    return <View className="flex-1 bg-canvas" />;
  }

  if (!signedIn) {
    return <SignedOutScreen onContinue={continueSession} />;
  }

  const activeScreen =
    activeView === 'settings' ? (
      <SettingsScreen />
    ) : activeView === 'search' ? (
      <SearchScreen
        onOpenTaskMenu={openTaskMenu}
        onEditTask={openActiveTask}
        selectedTaskId={selectedTaskId}
      />
    ) : activeView === 'today' ? (
      <TodoScreen
        onOpenTaskMenu={openTaskMenu}
        onEditTask={openActiveTask}
        selectedTaskId={selectedTaskId}
      />
    ) : activeView === 'completed' ? (
      <CompletedScreen
        onOpenTaskMenu={openTaskMenu}
        onEditTask={openActiveTask}
        selectedTaskId={selectedTaskId}
      />
    ) : activeView === 'calendar' ? (
      <CalendarScreen
        onOpenTaskMenu={openTaskMenu}
        onEditTask={openActiveTask}
        selectedTaskId={selectedTaskId}
      />
    ) : activeView === 'groups' ? (
      <GroupsScreen
        onOpenTaskMenu={openTaskMenu}
        onEditTask={openActiveTask}
        selectedTaskId={selectedTaskId}
      />
    ) : (
      <TrashScreen
        onPreviewTask={openTrashedTask}
        selectedTaskId={selectedTaskId}
      />
    );
  const mobileEditorOpen = Boolean(selectedTask && !usesDesktopLayout);

  return (
    <>
    <View
      accessibilityElementsHidden={mobileEditorOpen}
      aria-hidden={mobileEditorOpen || undefined}
      className="flex-1 flex-row bg-canvas"
      importantForAccessibility={
        mobileEditorOpen ? 'no-hide-descendants' : 'auto'
      }
    >
      {usesDesktopLayout ? (
        <SafeAreaView className="w-[78px] border-r border-[#E2E1E8] bg-[#F7F6F9]">
          <View className="flex-1 items-center pt-5">
            <Pressable
              accessibilityLabel={labels.account.localAccount}
              accessibilityRole="button"
              className="mb-7"
              onPress={() => setAccountMenuOpen((current) => !current)}
              style={({ pressed }) =>
                pressed ? styles.avatarPressed : undefined
              }
            >
              <AccountAvatar active={activeView === 'settings'} />
            </Pressable>
            {navigationItems.map((item, index) => {
              const isActive = item.id === activeView;
              return (
                <DraggableNavigationItem
                  id={item.id}
                  index={index}
                  key={item.id}
                  label={labels.navigation[item.id]}
                  onMove={moveNavigationItem}
                >
                  <Pressable
                    accessibilityLabel={labels.navigation[item.id]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    className={`h-12 w-12 items-center justify-center rounded-[15px] ${
                      isActive ? 'bg-[#E8E5FF]' : 'bg-transparent'
                    }`}
                    onPress={() => changeView(item.id)}
                  >
                    <Ionicons
                      color={isActive ? '#6759E8' : '#92939F'}
                      name={item.icon}
                      size={22}
                    />
                    {item.id === 'trash' && trashedTodoCount > 0 ? (
                      <View className="absolute right-0 top-0 min-w-[17px] items-center rounded-[9px] bg-[#D85B6B] px-1 py-0.5">
                        <Text className="text-[8px] font-extrabold text-white">
                          {trashedTodoCount}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                </DraggableNavigationItem>
              );
            })}
          </View>
          <Pressable
            accessibilityLabel={labels.agent.title}
            accessibilityRole="button"
            onPress={openAgent}
            style={({ pressed }) => [
              styles.agentButton,
              pressed && styles.agentButtonPressed,
            ]}
          >
            <Ionicons color="#6759E8" name="sparkles" size={19} />
          </Pressable>
        </SafeAreaView>
      ) : null}

      <View
        style={
          usesDesktopLayout && selectedTask
            ? { width: resolvedListPaneWidth }
            : styles.fullPane
        }
      >
        <View className="flex-1">{activeScreen}</View>

        {!usesDesktopLayout ? (
          <SafeAreaView className="border-t border-[#E4E3EA] bg-white">
            <View className="h-[66px] flex-row items-center justify-around px-6">
              {navigationItems.map((item) => {
                const isActive = item.id === activeView;
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    className="flex-1 items-center justify-center py-2"
                    key={item.id}
                    onPress={() => changeView(item.id)}
                  >
                    <Ionicons
                      color={isActive ? '#6759E8' : '#A3A3AF'}
                      name={item.icon}
                      size={21}
                    />
                    <Text
                      className={`mt-1 text-[10px] font-bold ${
                        isActive ? 'text-primary' : 'text-[#9596A3]'
                      }`}
                    >
                      {labels.navigation[item.id]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SafeAreaView>
        ) : null}
      </View>

      {usesDesktopLayout && selectedTask ? (
        <>
          <ResizableDivider
            label={labels.editor.resizePane}
            maxWidth={maximumListWidth}
            minWidth={MIN_LIST_WIDTH}
            onResize={setListPaneWidth}
            width={resolvedListPaneWidth}
          />
          <View className="flex-1 bg-white">
            <TaskEditorScreen
              embedded
              key={`${selectedTask.id}-${selectedTask.requestId}`}
              onClose={closeSelectedTask}
              readOnly={selectedTask.readOnly}
              todoId={selectedTask.id}
            />
          </View>
        </>
      ) : null}

      {!usesDesktopLayout && !selectedTask ? (
        <SafeAreaView style={styles.mobileAccountOverlay}>
          <View style={styles.mobileAccountPosition}>
            <Pressable
              accessibilityLabel={labels.agent.title}
              accessibilityRole="button"
              onPress={openAgent}
              style={({ pressed }) => [
                styles.mobileAgentButton,
                pressed && styles.agentButtonPressed,
              ]}
            >
              <Ionicons color="#6759E8" name="sparkles" size={18} />
            </Pressable>
            <Pressable
              accessibilityLabel={labels.account.localAccount}
              accessibilityRole="button"
              onPress={() => setAccountMenuOpen((current) => !current)}
              style={({ pressed }) =>
                pressed ? styles.avatarPressed : undefined
              }
            >
              <AccountAvatar active={activeView === 'settings'} />
            </Pressable>
          </View>
        </SafeAreaView>
      ) : null}

      {taskMenu ? (
        <TaskActionMenu
          onClose={() => setTaskMenu(null)}
          onTrash={(todoId) =>
            setSelectedTask((current) =>
              current?.id === todoId ? null : current,
            )
          }
          position={taskMenu.position}
          todoId={taskMenu.todoId}
        />
      ) : null}

      {accountMenuOpen ? (
        <AccountMenu
          onClose={() => setAccountMenuOpen(false)}
          onOpenSettings={() => changeView('settings')}
          position={
            usesDesktopLayout
              ? undefined
              : { x: Math.max(12, width - 252), y: 72 }
          }
          onSignOut={signOut}
        />
      ) : null}

      {toast ? (
        <Toast
          key={toast.id}
          message={toast.message}
          onDismiss={() => {
            if (toast.variant === 'error') {
              clearPersistenceError();
            }
            setToast(null);
          }}
          variant={toast.variant}
        />
      ) : null}
    </View>
    <AgentCommandPanel
      onClose={() => setAgentOpen(false)}
      onNotify={(message, variant = 'success') =>
        setToast({ id: Date.now(), message, variant })
      }
      visible={agentOpen}
    />
    {selectedTask && !usesDesktopLayout ? (
      <Modal
        animationType="none"
        onRequestClose={closeSelectedTask}
        presentationStyle="fullScreen"
        visible
      >
        <View style={styles.mobileEditorOverlay}>
          <TaskEditorScreen
            key={`${selectedTask.id}-${selectedTask.requestId}`}
            onClose={closeSelectedTask}
            readOnly={selectedTask.readOnly}
            todoId={selectedTask.id}
          />
        </View>
      </Modal>
    ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  avatarPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.94 }],
  },
  fullPane: {
    flex: 1,
  },
  mobileAccountOverlay: {
    bottom: 0,
    left: 0,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 50,
  },
  mobileAccountPosition: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
    pointerEvents: 'box-none',
  },
  agentButton: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 13,
    height: 40,
    justifyContent: 'center',
    marginBottom: 14,
    width: 40,
  },
  mobileAgentButton: {
    alignItems: 'center',
    backgroundColor: '#F0EEFF',
    borderRadius: 13,
    height: 40,
    justifyContent: 'center',
    marginRight: 10,
    width: 40,
  },
  agentButtonPressed: {
    opacity: 0.76,
    transform: [{ scale: 0.92 }],
  },
  mobileEditorOverlay: {
    backgroundColor: '#F5F5FA',
    flex: 1,
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <TodoProvider>
        <AppContent />
      </TodoProvider>
    </SafeAreaProvider>
  );
}
