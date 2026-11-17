// Side-effect imports the old `index.ts` entry used to run before mounting the
// app. The expo-router entry (`expo-router/entry`) replaced that file, so these
// must live at the top of the root layout. `config/nativewind` sets NativeWind's
// web output to 'native'; without it every `className` silently no-ops on Web
// and flex layouts (sidebar row, flex-1 fill) collapse.
import '../config/focusStyles';
import '../config/nativewind';
import '../config/webBaseStyles';
import {
  COMPACT_MOBILE_HEIGHT_BREAKPOINT,
  DESKTOP_LAYOUT_BREAKPOINT,
} from '../config/layout';

import { Slot, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import SearchOverlay from '../components/SearchOverlay';
import DesktopUpdateMenu from '../components/desktop/DesktopUpdateMenu';
import TaskEditorScreen from '../components/editor/TaskEditorScreen';
import DesktopSidebar from '../components/layout/DesktopSidebar';
import MobileEditorOverlay from '../components/layout/MobileEditorOverlay';
import MobileNavigationBar from '../components/layout/MobileNavigationBar';
import MobileUtilityOverlay from '../components/layout/MobileUtilityOverlay';
import ResizableDivider from '../components/layout/ResizableDivider';
import SettingsPanelOverlay from '../components/layout/SettingsPanelOverlay';
import styles from '../components/layout/appShellStyles';
import {
  NAV_ICONS,
  viewFromPathname,
} from '../components/navigation/navigationConfig';
import { NavigationDragState } from '../components/navigation/navigationDrag';
import TaskActionMenu from '../components/tasks/TaskActionMenu';
import MobileQuickAddButton from '../components/tasks/MobileQuickAddButton';
import QuickAddTaskSheet from '../components/tasks/QuickAddTaskSheet';
import {
  OpenTaskMenu,
  TaskMenuPosition,
} from '../components/tasks/useTaskContextMenu';
import IconButton from '../components/ui/IconButton';
import {
  ConfirmationProvider,
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
import useDesktopRuntimeEffects from '../hooks/useDesktopRuntimeEffects';
import useWebKeyboardShortcuts from '../hooks/useWebKeyboardShortcuts';
import { useDesktopStore } from '../store/desktopStore';
import { flushChatState } from '../store/chatStore';
import {
  flushAppState,
  TodoProvider,
  useTodoStore,
} from '../store/todoStore';
import { searchResultView } from '../store/todoDomain';
import { translations } from '../content';
import {
  NavigationItemId,
  OptionalNavigationItemId,
} from '../types/todo';

type SelectedTask = {
  id: string;
  readOnly: boolean;
  requestId: number;
};

const DESKTOP_NAV_WIDTH = 78;
const DIVIDER_WIDTH = 8;
const MIN_LIST_WIDTH = 360;
const MIN_DETAILS_WIDTH = 360;

const AppShell = () => {
  const notify = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const activeView = viewFromPathname(pathname);
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [listPaneWidth, setListPaneWidth] = useState<number | null>(null);
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
  } = useTodoStore(
    useShallow((state) => ({
      clearPersistenceError: state.clearPersistenceError,
      language: state.language,
      hiddenNavigationItems: state.hiddenNavigationItems,
      navigationOrder: state.navigationOrder,
      persistenceErrorAt: state.persistenceErrorAt,
      reorderNavigationItem: state.reorderNavigationItem,
      setNavigationItemVisible: state.setNavigationItemVisible,
    })),
  );
  const {
    checkForUpdates,
    desktopEnvironment,
    desktopPreferences,
    initializeDesktop,
    relaunchForUpdate,
    syncDesktopStatus,
    updateInfo,
    updateStatus,
  } = useDesktopStore(
    useShallow((state) => ({
      checkForUpdates: state.checkForUpdates,
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
    if (activeView === 'today' || activeView === 'projects') {
      return !todo.completed;
    }
    if (activeView === 'completed') {
      return todo.completed;
    }
    return true;
  });
  const labels = translations[language];
  const usesDesktopLayout = width >= DESKTOP_LAYOUT_BREAKPOINT;
  const compactMobileHeight =
    !usesDesktopLayout && height < COMPACT_MOBILE_HEIGHT_BREAKPOINT;
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
    (id) => !hiddenNavigationItems.includes(id as OptionalNavigationItemId) &&
      (id !== 'chat' || Platform.OS === 'web'),
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
        setSettingsPanelOpen(true);
        return;
      }
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
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [settingsPanelOpen, settingsSlideAnim, width]);
  const openSearch = useCallback(() => {
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
    try {
      await flushAppState();
      await flushChatState();
      await relaunchForUpdate();
    } catch {
      notify(labels.notifications.saveFailed, 'error');
    }
  }, [relaunchForUpdate, notify, labels.notifications.saveFailed]);
  const composeTask = useCallback(() => {
    setQuickCreateRequestId(Date.now());
  }, []);
  const resetOverlays = useCallback(() => {
    setSearchOpen(false);
    setTaskMenu(null);
    setSelectedTask(null);
  }, []);

  useDesktopRuntimeEffects({
    changeView,
    checkForUpdates,
    composeTask,
    initializeDesktop,
    isDesktop: desktopEnvironment.isDesktop,
    notify,
    onQuitFailed: labels.notifications.saveFailed,
    openUpdateMenu: () => setUpdateMenuOpen(true),
    updaterConfigured: desktopEnvironment.updaterConfigured,
    updateStatus,
  });

  useWebKeyboardShortcuts({
    onComposeTask: () => {
      changeView('today');
      composeTask();
    },
    onOpenSearch: openSearch,
    onOpenSettings: () => changeView('settings'),
    onReset: resetOverlays,
  });

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

  const shellValue = useMemo<AppShellValue>(
    () => ({
      selectedTaskId,
      quickCreateRequestId,
      openTaskMenu,
      openActiveTask,
      closeActiveTask: closeSelectedTask,
      openTrashedTask,
      openCalendarAdd,
      notify,
      changeView,
      hiddenNavigationItems,
      setNavigationVisible,
    }),
    [
      changeView,
      closeSelectedTask,
      hiddenNavigationItems,
      notify,
      openActiveTask,
      openCalendarAdd,
      openTaskMenu,
      openTrashedTask,
      quickCreateRequestId,
      selectedTaskId,
      setNavigationVisible,
    ],
  );

  const showSidebarUpdate =
    Boolean(updateInfo) &&
    desktopPreferences.updateReminder !== 'settings-only' &&
    updateStatus !== 'idle' &&
    updateStatus !== 'unavailable';
  const mobileEditorOpen = Boolean(selectedTask && !usesDesktopLayout);
  const mainContentHidden = mobileEditorOpen || searchOpen;
  const showMobileUtilities =
    !usesDesktopLayout &&
    activeView !== 'chat' &&
    !selectedTask &&
    !settingsPanelOpen &&
    navigationItems.some((item) => item.id === activeView);
  const showAppShell = useTodoStore((state) => state.isHydrated);
  const persistenceReady = useTodoStore((state) => state.persistenceReady);

  return (
    <>
    <View
      accessibilityElementsHidden={mainContentHidden}
      aria-hidden={mainContentHidden || undefined}
      importantForAccessibility={
        mainContentHidden ? 'no-hide-descendants' : 'auto'
      }
      style={[
        styles.appShell,
        { width },
        !showAppShell && styles.appShellHidden,
      ]}
    >
      {showAppShell && usesDesktopLayout ? (
        <DesktopSidebar
          accountActive={
            activeView === 'settings' || activeView === 'statistics'
          }
          accountLabel={labels.account.settings}
          activeView={activeView}
          items={navigationItems}
          labels={labels.navigation}
          navigationDrag={navigationDrag}
          onAccountPress={() => changeView('settings')}
          onDragStateChange={setNavigationDrag}
          onMove={moveNavigationItem}
          onSelect={selectNavigationView}
          onUpdatePress={() => setUpdateMenuOpen(true)}
          showUpdate={showSidebarUpdate}
          updateLabel={labels.desktop.updateToVersion(
            updateInfo?.version ?? '',
          )}
          updateReady={updateStatus === 'ready'}
        />
      ) : null}

      <View
        key="route-pane"
        style={
          usesDesktopLayout && selectedTask
            ? { width: resolvedListPaneWidth }
            : styles.fullPane
        }
      >
        <View style={styles.fullPane}>
          <AppShellProvider value={shellValue}>
            {showAppShell && !persistenceReady && activeView !== 'settings' ? (
              <View style={{ padding: 32, gap: 16 }}>
                <Text style={{ fontSize: 18, color: '#303145' }}>
                  {language === 'zh' ? '本地数据未能安全读取' : 'Local data could not be safely loaded'}
                </Text>
                <Text style={{ fontSize: 14, color: '#666778' }}>
                  {language === 'zh'
                    ? '原始文件已保留，写入已暂停。请在设置中恢复备份。'
                    : 'Original files are preserved and writes are paused. Restore a backup in Settings.'}
                </Text>
                <IconButton icon="settings-outline" label={labels.settings.title} onPress={() => changeView('settings')} />
              </View>
            ) : <Slot />}
          </AppShellProvider>
        </View>

        {showAppShell &&
        !usesDesktopLayout &&
        activeView !== 'statistics' ? (
          <MobileNavigationBar
            activeView={activeView}
            compact={compactMobileHeight}
            items={navigationItems}
            labels={labels.navigation}
            onSelect={selectNavigationView}
          />
        ) : null}
      </View>

      {showAppShell && usesDesktopLayout && selectedTask ? (
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

      {showAppShell && showMobileUtilities ? (
        <MobileUtilityOverlay
          accountActive={settingsPanelOpen}
          accountLabel={labels.account.settings}
          onAccountPress={() => setSettingsPanelOpen(true)}
          onSearchPress={openSearch}
          searchLabel={labels.search.title}
        />
      ) : null}

      {showAppShell && taskMenu ? (
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

      {showAppShell && updateMenuOpen && updateInfo ? (
        <DesktopUpdateMenu
          language={language}
          onClose={() => setUpdateMenuOpen(false)}
          onRelaunch={relaunchWithFlush}
          position={{ x: 90, y: Math.max(12, height - 290) }}
        />
      ) : null}
      {showAppShell &&
      !usesDesktopLayout &&
      !selectedTask &&
      !settingsPanelOpen &&
      (activeView === 'today' || activeView === 'projects') ? (
        <MobileQuickAddButton
          label={labels.addTask}
          onPress={() => {
            setQuickAddInitialDate(null);
            setQuickAddOpen(true);
          }}
        />
      ) : null}
    </View>
    {showAppShell && settingsPanelOpen && !usesDesktopLayout ? (
      <SettingsPanelOverlay
        hiddenNavigationItems={hiddenNavigationItems}
        onClose={() => setSettingsPanelOpen(false)}
        onNavigationVisibilityChange={setNavigationVisible}
        onOpenStatistics={() => {
          setSettingsPanelOpen(false);
          changeView('statistics');
        }}
        slideAnim={settingsSlideAnim}
        width={width}
      />
    ) : null}
    {showAppShell ? (
      <>
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onOpenTask={openSearchTask}
          selectedTaskId={selectedTaskId}
          visible={searchOpen}
        />
        <QuickAddTaskSheet
          initialDate={quickAddInitialDate ?? undefined}
          onClose={() => {
            setQuickAddOpen(false);
            setQuickAddInitialDate(null);
          }}
          visible={quickAddOpen}
        />
      </>
    ) : null}
    {showAppShell && selectedTask && !usesDesktopLayout ? (
      <MobileEditorOverlay
        closeLabel={labels.editor.close}
        height={height}
        onClose={closeSelectedTask}
        readOnly={selectedTask.readOnly}
        requestKey={`${selectedTask.id}-${selectedTask.requestId}`}
        todoId={selectedTask.id}
      />
    ) : null}
    </>
  );
};

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
