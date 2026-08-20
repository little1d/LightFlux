// Side-effect imports the old `index.ts` entry used to run before mounting the
// app. The expo-router entry (`expo-router/entry`) replaced that file, so these
// must live at the top of the root layout. `config/nativewind` sets NativeWind's
// web output to 'native'; without it every `className` silently no-ops on Web
// and flex layouts (sidebar row, flex-1 fill) collapse.
import '../config/focusStyles';
import '../config/nativewind';

import Ionicons from '@expo/vector-icons/Ionicons';
import { Slot, usePathname, useRouter } from 'expo-router';
import React, {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
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
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import '../config/focusStyles';
import '../config/nativewind';

import SearchOverlay from '../components/SearchOverlay';
import SettingsScreen from '../components/SettingsScreen';
import SignedOutScreen from '../components/SignedOutScreen';
import AccountMenu from '../components/account/AccountMenu';
import AgentCommandPanel from '../components/agent/AgentCommandPanel';
import DesktopUpdateMenu from '../components/desktop/DesktopUpdateMenu';
import TaskEditorScreen from '../components/editor/TaskEditorScreen';
import ResizableDivider from '../components/layout/ResizableDivider';
import DraggableNavigationItem from '../components/navigation/DraggableNavigationItem';
import { NavigationDragState } from '../components/navigation/navigationDrag';
import TaskActionMenu from '../components/tasks/TaskActionMenu';
import QuickAddTaskSheet from '../components/tasks/QuickAddTaskSheet';
import {
  OpenTaskMenu,
  TaskMenuPosition,
} from '../components/tasks/useTaskContextMenu';
import IconButton from '../components/ui/IconButton';
import Tooltip from '../components/ui/Tooltip';
import {
  ConfirmationProvider,
  useConfirmation,
} from '../components/ui/ConfirmationProvider';
import {
  ToastProvider,
  useToast,
} from '../components/ui/ToastProvider';
import {
  AppShellProvider,
  AppShellValue,
  AppView,
} from '../components/appShellContext';
import { useCurrentDateKey } from '../hooks/useCurrentDateKey';
import {
  listenForTrayActions,
  quitDesktop,
} from '../services/desktopRuntime';
import { useDesktopStore } from '../store/desktopStore';
import {
  flushAppState,
  TodoProvider,
  useTodoStore,
} from '../store/todoStore';
import { searchResultView } from '../store/todoDomain';
import { translations } from '../content';
import { getRemoteUser } from '../services/authApi';
import {
  loadSessionState,
  saveSessionState,
} from '../services/sessionStorage';
import {
  NavigationItemId,
  OptionalNavigationItemId,
} from '../types/todo';

type NavigationView = NavigationItemId;

type SelectedTask = {
  id: string;
  readOnly: boolean;
  requestId: number;
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

const NAVIGABLE_VIEWS: AppView[] = [
  'today',
  'completed',
  'calendar',
  'milestones',
  'groups',
  'trash',
  'settings',
  'statistics',
];

// Derive the active view from the current route so navigation highlighting and
// selection guards stay in sync with the URL. Unknown paths fall back to the
// default surface.
const viewFromPathname = (pathname: string): AppView => {
  const segment = pathname.replace(/^\/+/, '').split('/')[0];
  const match = NAVIGABLE_VIEWS.find((view) => view === segment);
  return match ?? 'groups';
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
        visible={(hovered || focused) && !isActive}
      />
    </View>
  );
};

const AccountTrigger = ({
  active,
  label,
  onPress,
  tooltipPosition,
  variant,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  tooltipPosition: 'right' | 'bottom';
  variant?: 'primary' | 'neutral';
}) => {
  return (
    <IconButton
      icon="person-circle-outline"
      label={label}
      onPress={onPress}
      size="large"
      tooltipPosition={tooltipPosition}
      variant={variant ?? (active ? 'primary' : 'neutral')}
    />
  );
};

const AppShell = () => {
  const requestConfirmation = useConfirmation();
  const notify = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const activeView = viewFromPathname(pathname);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string } | null>(null);
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [listPaneWidth, setListPaneWidth] = useState<number | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickCreateRequestId, setQuickCreateRequestId] = useState(0);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddInitialDate, setQuickAddInitialDate] = useState<string | null>(
    null,
  );
  const [updateMenuOpen, setUpdateMenuOpen] = useState(false);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  const { height, width } = useWindowDimensions();
  const settingsSlideAnim = useRef(new Animated.Value(-width)).current;
  const [navigationDrag, setNavigationDrag] =
    useState<NavigationDragState | null>(null);
  const notifiedUpdateVersion = useRef<string | null>(null);
  const [taskMenu, setTaskMenu] = useState<{
    todoId: string;
    position?: TaskMenuPosition;
  } | null>(null);
  const {
    clearPersistenceError,
    language,
    hiddenNavigationItems,
    navigationOrder,
    persistenceErrorAt,
    reorderNavigationItem,
    setNavigationItemVisible,
    syncRemote,
  } = useTodoStore(
    useShallow((state) => ({
      clearPersistenceError: state.clearPersistenceError,
      language: state.language,
      hiddenNavigationItems: state.hiddenNavigationItems,
      navigationOrder: state.navigationOrder,
      persistenceErrorAt: state.persistenceErrorAt,
      reorderNavigationItem: state.reorderNavigationItem,
      setNavigationItemVisible: state.setNavigationItemVisible,
      syncRemote: state.syncRemote,
    })),
  );
  const {
    desktopEnvironment,
    desktopPreferences,
    initializeDesktop,
    relaunchForUpdate,
    syncDesktopStatus,
    updateInfo,
    updateStatus,
  } = useDesktopStore(
    useShallow((state) => ({
      desktopEnvironment: state.environment,
      desktopPreferences: state.preferences,
      initializeDesktop: state.initialize,
      relaunchForUpdate: state.relaunchForUpdate,
      syncDesktopStatus: state.syncStatus,
      updateInfo: state.updateInfo,
      updateStatus: state.updateStatus,
    })),
  );
  const currentDateKey = useCurrentDateKey();
  const todayPendingCount = useTodoStore(
    (state) =>
      state.todos.filter(
        (todo) =>
          !todo.completed && todo.scheduledDate === currentDateKey,
      ).length,
  );
  const overdueCount = useTodoStore(
    (state) =>
      state.todos.filter(
        (todo) =>
          !todo.completed && todo.scheduledDate < currentDateKey,
      ).length,
  );
  const selectedTaskVisible = useTodoStore((state) => {
    if (!selectedTask) {
      return true;
    }
    if (selectedTask.readOnly) {
      return state.trashedTodos.some(
        (todo) => todo.id === selectedTask.id,
      );
    }

    const todo = state.todos.find((item) => item.id === selectedTask.id);
    if (!todo) {
      return false;
    }
    if (activeView === 'today' || activeView === 'groups') {
      return !todo.completed;
    }
    if (activeView === 'completed') {
      return todo.completed;
    }
    return true;
  });
  const trashItemCount = useTodoStore(
    (state) =>
      state.trashedTodos.length + state.trashedMilestones.length,
  );
  const labels = translations[language];
  const usesDesktopLayout = width >= 900;
  const selectedTaskId = taskMenu?.todoId ?? selectedTask?.id ?? null;
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
  const visibleNavigationOrder = navigationOrder.filter(
    (id) => !hiddenNavigationItems.includes(id as OptionalNavigationItemId),
  );
  const navigationItems = visibleNavigationOrder
    .map((id) => ({
      id,
      icon: NAV_ICONS[id],
    }));
  const moveNavigationItem = useCallback(
    (id: NavigationItemId, targetIndex: number) => {
      const sourceIndex = navigationOrder.indexOf(id);
      const targetId = visibleNavigationOrder[
        Math.max(0, Math.min(targetIndex, visibleNavigationOrder.length - 1))
      ];
      const targetOrderIndex = targetId
        ? navigationOrder.indexOf(targetId)
        : sourceIndex;
      if (sourceIndex < 0 || targetOrderIndex < 0) {
        return;
      }
      const boundedTarget = Math.max(
        0,
        Math.min(targetOrderIndex, navigationOrder.length - 1),
      );
      if (sourceIndex === boundedTarget) {
        return;
      }

      reorderNavigationItem(id, boundedTarget);
      notify(labels.notifications.orderUpdated);
    },
    [
      labels.notifications.orderUpdated,
      navigationOrder,
      notify,
      reorderNavigationItem,
      visibleNavigationOrder,
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
  // Navigate imperatively; on narrow layouts settings is a slide-over panel
  // rather than a route so the underlying task surface stays mounted behind it.
  const changeView = useCallback(
    (view: AppView) => {
      if (!usesDesktopLayout && view === 'settings') {
        setAccountMenuOpen(false);
        setSettingsPanelOpen(true);
        return;
      }
      setAccountMenuOpen(false);
      setSelectedTask(null);
      setTaskMenu(null);
      router.push(`/${view}`);
    },
    [router, usesDesktopLayout],
  );
  const openSearchTask = useCallback(
    (id: string) => {
      const todo = useTodoStore
        .getState()
        .todos.find((item) => item.id === id);
      if (!todo) {
        return;
      }
      setAccountMenuOpen(false);
      setTaskMenu(null);
      router.push(`/${searchResultView(todo)}`);
      setSelectedTask({
        id,
        readOnly: false,
        requestId: Date.now(),
      });
    },
    [router],
  );
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
  const openCalendarAdd = useCallback((dateKey: string) => {
    setQuickAddInitialDate(dateKey);
    setQuickAddOpen(true);
  }, []);
  useEffect(() => {
    Animated.timing(settingsSlideAnim, {
      toValue: settingsPanelOpen ? 0 : -width,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [settingsPanelOpen, settingsSlideAnim, width]);
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
  const openAuthentication = useCallback(() => {
    setAccountMenuOpen(false);
    setSettingsPanelOpen(false);
    setAuthOpen(true);
  }, []);
  const setNavigationVisible = useCallback(
    (id: OptionalNavigationItemId, visible: boolean) => {
      setNavigationItemVisible(id, visible);
      if (!visible && activeView === id) {
        changeView('today');
      }
    },
    [activeView, changeView, setNavigationItemVisible],
  );
  const relaunchWithFlush = useCallback(async () => {
    await flushAppState().catch((error) => {
      console.warn('Unable to flush data before relaunch.', error);
    });
    await relaunchForUpdate();
  }, [relaunchForUpdate]);
  const handleTrayAction = useCallback(
    (action: string) => {
      if (action === 'new-task') {
        changeView('today');
        setQuickCreateRequestId(Date.now());
        return;
      }
      if (action === 'agent') {
        openAgent();
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
        setUpdateMenuOpen(true);
        return;
      }
      if (action === 'quit') {
        void flushAppState()
          .catch((error) => {
            console.warn('Unable to flush data before quitting.', error);
          })
          .finally(() => {
            void quitDesktop();
          });
      }
    },
    [changeView, openAgent],
  );

  useEffect(() => {
    void initializeDesktop();
  }, [initializeDesktop]);

  useEffect(() => {
    if (!desktopEnvironment.isDesktop) {
      return;
    }
    const badgeCount =
      desktopPreferences.dockBadge === 'none'
        ? null
        : desktopPreferences.dockBadge === 'overdue'
          ? overdueCount
          : todayPendingCount;
    void syncDesktopStatus({
      badgeCount: badgeCount && badgeCount > 0 ? badgeCount : null,
      language,
      overdueCount,
      todayCount: todayPendingCount,
    });
  }, [
    desktopEnvironment.isDesktop,
    desktopPreferences.dockBadge,
    language,
    overdueCount,
    syncDesktopStatus,
    todayPendingCount,
    updateInfo?.version,
    updateStatus,
  ]);

  useEffect(() => {
    if (
      !updateInfo ||
      updateStatus !== 'available' ||
      desktopPreferences.updateReminder !== 'sidebar-and-toast' ||
      notifiedUpdateVersion.current === updateInfo.version
    ) {
      return;
    }
    notifiedUpdateVersion.current = updateInfo.version;
    notify(labels.desktop.newVersionAvailable(updateInfo.version));
  }, [
    desktopPreferences.updateReminder,
    labels.desktop,
    notify,
    updateInfo,
    updateStatus,
  ]);

  useEffect(() => {
    if (updateInfo?.required) {
      setUpdateMenuOpen(true);
    }
  }, [updateInfo]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listenForTrayActions(handleTrayAction).then((listener) => {
      unlisten = listener;
    });
    return () => unlisten?.();
  }, [handleTrayAction]);

  useEffect(() => {
    let active = true;
    loadSessionState()
      .then(async (sessionState) => {
        if (!active) {
          return;
        }
        if (sessionState === 'authenticated') {
          await syncRemote();
          const user = await getRemoteUser();
          if (active) {
            setCurrentUser(user);
            setSignedIn(true);
          }
          return;
        }
        setCurrentUser(null);
        setSignedIn(sessionState === 'local');
      })
      .catch(() => {
        if (active) {
          setSignedIn(false);
        }
      });

    return () => {
      active = false;
    };
  }, [syncRemote]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        changeView('today');
        setQuickCreateRequestId(Date.now());
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault();
        changeView('settings');
        return;
      }
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
  }, [changeView, openAgent, openSearch, searchOpen]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    if (!selectedTaskVisible) {
      setSelectedTask(null);
    }
  }, [selectedTask, selectedTaskVisible]);

  useEffect(() => {
    if (persistenceErrorAt) {
      notify(labels.notifications.saveFailed, 'error');
      clearPersistenceError();
    }
  }, [
    clearPersistenceError,
    labels.notifications.saveFailed,
    notify,
    persistenceErrorAt,
  ]);

  const signOut = useCallback(() => {
    setAccountMenuOpen(false);
    requestConfirmation({
      cancelText: labels.cancel,
      confirmText: labels.account.signOut,
      message: labels.account.signOutMessage,
      onConfirm: async () => {
        setSelectedTask(null);
        setTaskMenu(null);
        setCurrentUser(null);
        setSignedIn(false);
        void saveSessionState('signed-out').catch(() => {});
      },
      title: labels.account.signOutTitle,
    });
  }, [
    labels.account.signOut,
    labels.account.signOutMessage,
    labels.account.signOutTitle,
    labels.cancel,
    requestConfirmation,
  ]);

  const continueSession = async () => {
    await syncRemote();
    const user = await getRemoteUser();
    setCurrentUser(user);
    setSignedIn(true);
    setAuthOpen(false);
    router.replace('/groups');
    await saveSessionState('authenticated');
  };

  const continueLocally = async () => {
    setCurrentUser(null);
    setSignedIn(true);
    setAuthOpen(false);
    router.replace('/groups');
    await saveSessionState('local');
  };

  const shellValue = useMemo<AppShellValue>(
    () => ({
      selectedTaskId,
      quickCreateRequestId,
      openTaskMenu,
      openActiveTask,
      openTrashedTask,
      openCalendarAdd,
      notify,
      changeView,
      currentUser,
      hiddenNavigationItems,
      setNavigationVisible,
      openAuthentication,
      signOut,
    }),
    [
      changeView,
      currentUser,
      hiddenNavigationItems,
      notify,
      openActiveTask,
      openAuthentication,
      openCalendarAdd,
      openTaskMenu,
      openTrashedTask,
      quickCreateRequestId,
      selectedTaskId,
      setNavigationVisible,
      signOut,
    ],
  );

  const showSidebarUpdate =
    Boolean(updateInfo) &&
    desktopPreferences.updateReminder !== 'settings-only' &&
    updateStatus !== 'idle' &&
    updateStatus !== 'unavailable';
  const mobileEditorOpen = Boolean(selectedTask && !usesDesktopLayout);
  const mainContentHidden = authOpen || mobileEditorOpen || searchOpen;
  const showMobileUtilities =
    !usesDesktopLayout &&
    !selectedTask &&
    (activeView === 'today' || activeView === 'groups');

  return (
    <>
    <View
      accessibilityElementsHidden={mainContentHidden}
      aria-hidden={mainContentHidden || undefined}
      importantForAccessibility={
        mainContentHidden ? 'no-hide-descendants' : 'auto'
      }
      style={styles.appShell}
    >
      {usesDesktopLayout ? (
        <SafeAreaView
          style={styles.desktopSidebar}
        >
          <View style={styles.desktopNavigation}>
            <View style={styles.desktopAccountPosition}>
              <AccountTrigger
                active={
                  activeView === 'settings' || activeView === 'statistics'
                }
                label={currentUser?.email || labels.account.localAccount}
                onPress={() => setAccountMenuOpen((current) => !current)}
                tooltipPosition="right"
              />
            </View>
            {navigationItems.map((item, index) => {
              const isActive = item.id === activeView;
              return (
                <DraggableNavigationItem
                  dragState={navigationDrag}
                  id={item.id}
                  index={index}
                  itemCount={navigationItems.length}
                  key={item.id}
                  label={labels.navigation[item.id]}
                  onDragStateChange={setNavigationDrag}
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
            {showSidebarUpdate ? (
              <View style={styles.updateButtonPosition}>
                <IconButton
                  icon={
                    updateStatus === 'ready'
                      ? 'checkmark-circle'
                      : 'download-outline'
                  }
                  label={labels.desktop.updateToVersion(
                    updateInfo?.version ?? '',
                  )}
                  onPress={() => setUpdateMenuOpen(true)}
                  size="large"
                  tooltipPosition="right"
                  variant="primary"
                />
              </View>
            ) : null}
            <IconButton
              icon="sparkles"
              label={labels.agent.title}
              onPress={openAgent}
              size="large"
              tooltipPosition="right"
              variant="neutral"
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
        <View style={styles.fullPane}>
          <AppShellProvider value={shellValue}>
            <Slot />
          </AppShellProvider>
        </View>

        {!usesDesktopLayout && activeView !== 'statistics' ? (
          <SafeAreaView
            edges={['bottom']}
            style={styles.mobileNavigationSafeArea}
          >
            <View style={styles.mobileNavigationBar}>
              {navigationItems.map((item) => {
                const isActive = item.id === activeView;
                return (
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    key={item.id}
                    onPress={() => selectNavigationView(item.id)}
                    style={({ pressed }) => [
                      styles.mobileNavigationItem,
                      pressed && styles.mobileNavigationItemPressed,
                    ]}
                  >
                    <Ionicons
                      color={isActive ? '#6759E8' : '#A3A3AF'}
                      name={item.icon}
                      size={21}
                    />
                    <Text
                      style={[
                        styles.mobileNavigationLabel,
                        isActive && styles.mobileNavigationLabelActive,
                      ]}
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
          <View style={styles.detailsPane}>
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

      {showMobileUtilities ? (
        <SafeAreaView style={styles.mobileUtilityOverlay}>
          <View style={styles.mobileUtilityRow}>
            <AccountTrigger
              active={settingsPanelOpen}
              label={labels.account.settings}
              onPress={() => setSettingsPanelOpen(true)}
              tooltipPosition="bottom"
            />
            <View style={styles.mobileUtilityActions}>
              <IconButton
                icon="search-outline"
                label={labels.search.title}
                onPress={openSearch}
                size="large"
                tooltipPosition="bottom"
                variant="neutral"
              />
              <IconButton
                icon="sparkles"
                label={labels.agent.title}
                onPress={openAgent}
                size="large"
                tooltipPosition="bottom"
                variant="neutral"
              />
            </View>
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

      {accountMenuOpen && usesDesktopLayout ? (
        <AccountMenu
          currentUser={currentUser}
          onClose={() => setAccountMenuOpen(false)}
          onOpenSettings={() => changeView('settings')}
          onSignIn={openAuthentication}
          position={
            usesDesktopLayout
              ? undefined
              : { x: 12, y: 72 }
          }
          onSignOut={signOut}
        />
      ) : null}

      {updateMenuOpen && updateInfo ? (
        <DesktopUpdateMenu
          language={language}
          onClose={() => setUpdateMenuOpen(false)}
          onRelaunch={relaunchWithFlush}
          position={{ x: 90, y: Math.max(12, height - 290) }}
        />
      ) : null}
      {!usesDesktopLayout &&
      !selectedTask &&
      (activeView === 'today' || activeView === 'groups') ? (
        <View style={styles.mobileQuickAdd}>
          <Pressable
            accessibilityLabel={labels.addTask}
            accessibilityRole="button"
            onPress={() => {
              setQuickAddInitialDate(null);
              setQuickAddOpen(true);
            }}
            style={({ pressed }) => [
              styles.mobileQuickAddButton,
              pressed && styles.mobileQuickAddPressed,
            ]}
          >
            <Ionicons color="#FFFFFF" name="add" size={27} />
          </Pressable>
        </View>
      ) : null}
    </View>
    {settingsPanelOpen && !usesDesktopLayout ? (
      <View
        pointerEvents="box-none"
        style={StyleSheet.absoluteFill}
      >
        <Pressable
          onPress={() => setSettingsPanelOpen(false)}
          style={styles.settingsBackdrop}
        />
        <Animated.View
          style={[
            styles.settingsPanel,
            { transform: [{ translateX: settingsSlideAnim }] },
          ]}
        >
          <SafeAreaView style={styles.settingsPanelSafeArea}>
            <SettingsScreen
              currentUser={currentUser}
              hiddenNavigationItems={hiddenNavigationItems}
              onNavigationVisibilityChange={setNavigationVisible}
              onOpenStatistics={() => {
                setSettingsPanelOpen(false);
                changeView('statistics');
              }}
              onSignIn={openAuthentication}
              onSignOut={() => {
                setSettingsPanelOpen(false);
                signOut();
              }}
            />
          </SafeAreaView>
        </Animated.View>
      </View>
    ) : null}
    {authOpen ? (
      <Modal
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        onRequestClose={() => setAuthOpen(false)}
        presentationStyle="fullScreen"
        visible
      >
        <SignedOutScreen
          onCancel={() => setAuthOpen(false)}
          onContinue={continueSession}
          onContinueLocally={continueLocally}
        />
      </Modal>
    ) : null}
    <SearchOverlay
      onClose={() => setSearchOpen(false)}
      onOpenTask={openSearchTask}
      selectedTaskId={selectedTaskId}
      visible={searchOpen}
    />
    <AgentCommandPanel
      onClose={() => setAgentOpen(false)}
      onNotify={notify}
      visible={agentOpen}
    />
    <QuickAddTaskSheet
      initialDate={quickAddInitialDate ?? undefined}
      onClose={() => {
        setQuickAddOpen(false);
        setQuickAddInitialDate(null);
      }}
      visible={quickAddOpen}
    />
    {selectedTask && !usesDesktopLayout ? (
      <Modal
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        onRequestClose={closeSelectedTask}
        presentationStyle="overFullScreen"
        transparent
        visible
      >
        <View style={styles.mobileEditorOverlay}>
          <Pressable
            accessibilityLabel={labels.editor.close}
            onPress={closeSelectedTask}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView
            edges={['bottom']}
            style={[
              styles.mobileEditorSheet,
              Platform.OS === 'web'
                ? {
                    height: Math.min(
                      420,
                      Math.max(300, Math.round(height * 0.4)),
                    ),
                  }
                : styles.nativeEditorSheet,
            ]}
          >
            <TaskEditorScreen
              embedded
              key={`${selectedTask.id}-${selectedTask.requestId}`}
              onClose={closeSelectedTask}
              readOnly={selectedTask.readOnly}
              todoId={selectedTask.id}
            />
          </SafeAreaView>
        </View>
      </Modal>
    ) : null}
    {signedIn === null ? (
      <View style={[StyleSheet.absoluteFill, styles.bootOverlay]} />
    ) : null}
    {signedIn === false ? (
      <View style={StyleSheet.absoluteFill}>
        <SignedOutScreen
          onContinue={continueSession}
          onContinueLocally={continueLocally}
        />
      </View>
    ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  appBackground: {
    backgroundColor: '#F5F5FA',
    flex: 1,
  },
  appShell: {
    backgroundColor: '#F5F5FA',
    flex: 1,
    flexDirection: 'row',
  },
  bootOverlay: {
    backgroundColor: '#F3F2F7',
  },
  desktopAccountPosition: {
    marginBottom: 28,
  },
  desktopSidebar: {
    backgroundColor: '#F7F6F9',
    borderRightColor: '#E2E1E8',
    borderRightWidth: 1,
    overflow: 'visible',
    position: 'relative',
    width: 78,
    zIndex: 100,
  },
  desktopNavigation: {
    alignItems: 'center',
    flex: 1,
    paddingTop: 20,
  },
  detailsPane: {
    backgroundColor: '#FFFFFF',
    flex: 1,
  },
  fullPane: {
    flex: 1,
  },
  mobileNavigationSafeArea: {
    backgroundColor: '#F5F5FA',
    borderTopColor: '#E4E3EA',
    borderTopWidth: 1,
  },
  mobileNavigationBar: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  mobileNavigationItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  mobileNavigationItemPressed: {
    opacity: 0.68,
  },
  mobileNavigationLabel: {
    color: '#9596A3',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  mobileNavigationLabelActive: {
    color: '#6759E8',
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
  mobileUtilityOverlay: {
    bottom: 0,
    left: 0,
    pointerEvents: 'box-none',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 50,
  },
  mobileUtilityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    pointerEvents: 'box-none',
  },
  mobileUtilityActions: {
    flexDirection: 'row',
    gap: 8,
  },
  agentButtonPosition: {
    alignItems: 'center',
    marginBottom: 14,
  },
  updateButtonPosition: {
    alignItems: 'center',
    marginBottom: 9,
  },
  mobileEditorOverlay: {
    backgroundColor: 'rgba(31, 30, 43, 0.2)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  mobileEditorSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  nativeEditorSheet: {
    height: '88%',
    maxHeight: 760,
  },
  mobileQuickAdd: {
    bottom: 86,
    position: 'absolute',
    right: 18,
    zIndex: 60,
  },
  mobileQuickAddButton: {
    alignItems: 'center',
    backgroundColor: '#6759E8',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    shadowColor: '#6759E8',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    width: 52,
  },
  mobileQuickAddPressed: {
    backgroundColor: '#594CCD',
    transform: [{ scale: 0.94 }],
  },
  settingsBackdrop: {
    backgroundColor: 'rgba(31, 30, 43, 0.25)',
    flex: 1,
  },
  settingsPanel: {
    backgroundColor: '#FFFFFF',
    bottom: 0,
    elevation: 24,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { height: 0, width: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    top: 0,
    width: '60%',
  },
  settingsPanelSafeArea: {
    flex: 1,
  },
});

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      {/*
        expo-router mounts through wrapper <div>s that have no background, unlike
        the old registerRootComponent root. Where app content does not fully
        cover the viewport (e.g. below a short list) the transparent stack lets
        the browser's default canvas show through — which composites to black
        under a dark OS color-scheme. This full-fill canvas backdrop guarantees
        the app background instead of black.
      */}
      <View style={styles.appBackground}>
        <TodoProvider>
          <ConfirmationProvider>
            <ToastProvider>
              <AppShell />
            </ToastProvider>
          </ConfirmationProvider>
        </TodoProvider>
      </View>
    </SafeAreaProvider>
  );
}
