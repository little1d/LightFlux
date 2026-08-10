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
import MilestonesScreen from './components/MilestonesScreen';
import SearchOverlay from './components/SearchOverlay';
import SettingsScreen from './components/SettingsScreen';
import SignedOutScreen from './components/SignedOutScreen';
import StatisticsScreen from './components/StatisticsScreen';
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
import IconButton from './components/ui/IconButton';
import Tooltip from './components/ui/Tooltip';
import { TodoProvider, useTodoStore } from './store/todoStore';
import { translations } from './i18n/translations';
import { isRemoteAuthConfigured } from './services/authApi';
import {
  loadSessionState,
  saveSessionState,
} from './services/sessionStorage';
import { NavigationItemId } from './types/todo';
import { requestConfirmation } from './utils/confirm';

type AppView = NavigationItemId | 'settings' | 'statistics';
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
  today: 'sunny-outline',
  completed: 'checkmark-done-outline',
  calendar: 'calendar-outline',
  milestones: 'hourglass-outline',
  groups: 'albums-outline',
  trash: 'trash-outline',
};

const DesktopNavigationButton = ({
  badgeCount = 0,
  icon,
  isActive,
  label,
  onPress,
}: {
  badgeCount?: number;
  icon: ComponentProps<typeof Ionicons>['name'];
  isActive: boolean;
  label: string;
  onPress: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.desktopNavigationButton}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.navigationButton,
          isActive && styles.navigationButtonActive,
          hovered && !isActive && styles.navigationButtonHovered,
          focused && styles.navigationButtonFocused,
          pressed && styles.navigationButtonPressed,
        ]}
      >
        <Ionicons
          color={isActive ? '#6759E8' : hovered ? '#666778' : '#92939F'}
          name={icon}
          size={22}
        />
        {badgeCount > 0 ? (
          <View style={styles.navigationBadge}>
            <Text style={styles.navigationBadgeText}>{badgeCount}</Text>
          </View>
        ) : null}
      </Pressable>
      <Tooltip
        label={label}
        position="right"
        visible={hovered || focused}
      />
    </View>
  );
};

const AccountTrigger = ({
  active,
  label,
  onPress,
  tooltipPosition,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  tooltipPosition: 'right' | 'bottom';
}) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.accountTrigger}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onBlur={() => setFocused(false)}
        onFocus={() => setFocused(true)}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.accountTriggerButton,
          hovered && styles.accountTriggerHovered,
          focused && styles.accountTriggerFocused,
          pressed && styles.accountTriggerPressed,
        ]}
      >
        <AccountAvatar active={active} />
      </Pressable>
      <Tooltip
        label={label}
        position={tooltipPosition}
        visible={hovered || focused}
      />
    </View>
  );
};

const AppContent = () => {
  const [activeView, setActiveView] = useState<AppView>('groups');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [listPaneWidth, setListPaneWidth] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
  const trashItemCount = useTodoStore(
    (state) =>
      state.trashedTodos.length + state.trashedMilestones.length,
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
  const openSearch = useCallback(() => {
    setAccountMenuOpen(false);
    setAgentOpen(false);
    setTaskMenu(null);
    setSearchOpen(true);
  }, []);
  const selectNavigationView = useCallback(
    (view: NavigationItemId) => {
      setSearchOpen(false);
      changeView(view);
    },
    [changeView],
  );
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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        openSearch();
        return;
      }

      if (event.key === 'Escape') {
        if (searchOpen) {
          setSearchOpen(false);
          return;
        }
        setAgentOpen(false);
        setAccountMenuOpen(false);
        setTaskMenu(null);
        setSelectedTask(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openAgent, openSearch, searchOpen]);

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
    activeView === 'statistics' ? (
      <StatisticsScreen
        onBack={() => changeView('settings')}
        onOpenGroups={() => changeView('groups')}
      />
    ) : activeView === 'settings' ? (
      <SettingsScreen
        onOpenStatistics={() => changeView('statistics')}
      />
    ) : activeView === 'today' ? (
      <TodoScreen
        onOpenTaskMenu={openTaskMenu}
        onEditTask={openActiveTask}
        onNotify={(message) =>
          setToast({ id: Date.now(), message, variant: 'success' })
        }
        onOpenMilestones={() => changeView('milestones')}
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
    ) : activeView === 'milestones' ? (
      <MilestonesScreen />
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
  const mainContentHidden = mobileEditorOpen || searchOpen;

  return (
    <>
    <View
      accessibilityElementsHidden={mainContentHidden}
      aria-hidden={mainContentHidden || undefined}
      className="flex-1 flex-row bg-canvas"
      importantForAccessibility={
        mainContentHidden ? 'no-hide-descendants' : 'auto'
      }
    >
      {usesDesktopLayout ? (
        <SafeAreaView className="w-[78px] border-r border-[#E2E1E8] bg-[#F7F6F9]">
          <View className="flex-1 items-center pt-5">
            <View style={styles.desktopAccountPosition}>
              <AccountTrigger
                active={
                  activeView === 'settings' || activeView === 'statistics'
                }
                label={labels.account.localAccount}
              onPress={() => setAccountMenuOpen((current) => !current)}
                tooltipPosition="right"
              />
            </View>
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
                  <DesktopNavigationButton
                    badgeCount={
                      item.id === 'trash' ? trashItemCount : 0
                    }
                    icon={item.icon}
                    isActive={isActive}
                    label={labels.navigation[item.id]}
                    onPress={() => selectNavigationView(item.id)}
                  />
                </DraggableNavigationItem>
              );
            })}
          </View>
          <View style={styles.agentButtonPosition}>
            <IconButton
              icon="sparkles"
              label={labels.agent.title}
              onPress={openAgent}
              size="large"
              tooltipPosition="right"
              variant="primary"
            />
          </View>
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

        {!usesDesktopLayout && activeView !== 'statistics' ? (
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
                    onPress={() => selectNavigationView(item.id)}
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
            <View style={styles.mobileAgentButtonPosition}>
              <IconButton
                icon="sparkles"
                label={labels.agent.title}
                onPress={openAgent}
                size="large"
                tooltipPosition="bottom"
                variant="primary"
              />
            </View>
            <AccountTrigger
              active={
                activeView === 'settings' || activeView === 'statistics'
              }
              label={labels.account.localAccount}
              onPress={() => setAccountMenuOpen((current) => !current)}
              tooltipPosition="bottom"
            />
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
    <SearchOverlay
      onClose={() => setSearchOpen(false)}
      onOpenTask={openActiveTask}
      selectedTaskId={selectedTaskId}
      visible={searchOpen}
    />
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
  accountTrigger: {
    position: 'relative',
  },
  accountTriggerButton: {
    borderColor: 'transparent',
    borderRadius: 17,
    borderWidth: 2,
  },
  accountTriggerHovered: {
    backgroundColor: '#EFEDF5',
    transform: [{ translateY: -1 }],
  },
  accountTriggerFocused: {
    borderColor: '#AFA6F5',
    shadowColor: '#6759E8',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  accountTriggerPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
  desktopAccountPosition: {
    marginBottom: 28,
  },
  fullPane: {
    flex: 1,
  },
  desktopNavigationButton: {
    position: 'relative',
  },
  navigationButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: 15,
    borderWidth: 2,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  navigationButtonActive: {
    backgroundColor: '#E8E5FF',
  },
  navigationButtonHovered: {
    backgroundColor: '#EFEDF5',
    transform: [{ translateY: -1 }],
  },
  navigationButtonFocused: {
    borderColor: '#AFA6F5',
    shadowColor: '#6759E8',
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  navigationButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.93 }],
  },
  navigationBadge: {
    backgroundColor: '#D85B6B',
    borderRadius: 9,
    minWidth: 17,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
    right: -1,
    top: -1,
  },
  navigationBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
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
  agentButtonPosition: {
    marginBottom: 14,
  },
  mobileAgentButtonPosition: {
    marginRight: 10,
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
