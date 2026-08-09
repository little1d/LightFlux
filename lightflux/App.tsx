import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

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
import TaskEditorScreen from './components/editor/TaskEditorScreen';
import ResizableDivider from './components/layout/ResizableDivider';
import TaskActionMenu from './components/tasks/TaskActionMenu';
import {
  OpenTaskMenu,
  TaskMenuPosition,
} from './components/tasks/useTaskContextMenu';
import { TodoProvider, useTodos } from './context/TodoContext';
import { translations } from './i18n/translations';
import {
  loadSessionState,
  saveSessionState,
} from './services/sessionStorage';
import { requestConfirmation } from './utils/confirm';

type AppView =
  | 'search'
  | 'today'
  | 'completed'
  | 'calendar'
  | 'groups'
  | 'trash'
  | 'settings';
type NavigationView = Exclude<AppView, 'settings'>;
type SelectedTask = {
  id: string;
  readOnly: boolean;
};

const DESKTOP_NAV_WIDTH = 78;
const DIVIDER_WIDTH = 8;
const MIN_LIST_WIDTH = 360;
const MIN_DETAILS_WIDTH = 360;

const NAV_ITEMS: Array<{ id: NavigationView; icon?: string }> = [
  { id: 'search' },
  { id: 'today', icon: '✓' },
  { id: 'completed' },
  { id: 'calendar', icon: '▦' },
  { id: 'groups', icon: '≡' },
  { id: 'trash', icon: '⌫' },
];

const SearchNavigationIcon = ({ active }: { active: boolean }) => {
  const color = active ? '#6759E8' : '#92939F';

  return (
    <View className="h-6 w-6">
      <View
        className="absolute left-0.5 top-0.5 h-[15px] w-[15px] rounded-[8px] border-2"
        style={{ borderColor: color }}
      />
      <View
        className="absolute h-0.5 w-2 rotate-45 rounded"
        style={{ backgroundColor: color, bottom: 4, right: 1 }}
      />
    </View>
  );
};

const CompletedNavigationIcon = ({ active }: { active: boolean }) => {
  const color = active ? '#6759E8' : '#92939F';

  return (
    <View className="h-6 w-6">
      <View
        className="absolute left-0.5 top-1 h-4 w-[18px] rounded-[5px] border-2"
        style={{ borderColor: color }}
      />
      <View
        className="absolute h-0.5 w-2 -rotate-45 rounded"
        style={{ backgroundColor: color, left: 7, top: 12 }}
      />
      <View
        className="absolute h-0.5 w-1 rotate-45 rounded"
        style={{ backgroundColor: color, left: 5, top: 13 }}
      />
    </View>
  );
};

const AppContent = () => {
  const [activeView, setActiveView] = useState<AppView>('today');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [listPaneWidth, setListPaneWidth] = useState<number | null>(null);
  const [taskMenu, setTaskMenu] = useState<{
    todoId: string;
    position?: TaskMenuPosition;
  } | null>(null);
  const { language, todos, trashedTodos } = useTodos();
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

  const openTaskMenu = useCallback<OpenTaskMenu>((todoId, position) => {
    setTaskMenu({ todoId, position });
  }, []);
  const openActiveTask = useCallback((id: string) => {
    setSelectedTask({ id, readOnly: false });
  }, []);
  const openTrashedTask = useCallback((id: string) => {
    setSelectedTask({ id, readOnly: true });
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
          setSignedIn(true);
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
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        changeView('search');
        return;
      }

      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setTaskMenu(null);
        setSelectedTask(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [changeView]);

  useEffect(() => {
    if (!selectedTask) {
      return;
    }

    const source = selectedTask.readOnly ? trashedTodos : todos;
    if (!source.some((todo) => todo.id === selectedTask.id)) {
      setSelectedTask(null);
    }
  }, [selectedTask, todos, trashedTodos]);

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
    setActiveView('today');
    void saveSessionState(true);
  };

  if (signedIn === null) {
    return <View className="flex-1 bg-canvas" />;
  }

  if (!signedIn) {
    return <SignedOutScreen onContinue={continueSession} />;
  }

  if (selectedTask && !usesDesktopLayout) {
    return (
      <TaskEditorScreen
        key={selectedTask.id}
        onClose={closeSelectedTask}
        readOnly={selectedTask.readOnly}
        todoId={selectedTask.id}
      />
    );
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

  return (
    <View className="flex-1 flex-row bg-canvas">
      {usesDesktopLayout ? (
        <SafeAreaView className="w-[78px] border-r border-[#E2E1E8] bg-[#F7F6F9]">
          <View className="flex-1 items-center pt-5">
            <Pressable
              accessibilityLabel={labels.account.localAccount}
              accessibilityRole="button"
              className="mb-7"
              onPress={() => setAccountMenuOpen((current) => !current)}
            >
              <AccountAvatar active={activeView === 'settings'} />
            </Pressable>
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeView;
              return (
                <Pressable
                  accessibilityLabel={labels.navigation[item.id]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  className={`mb-3 h-12 w-12 items-center justify-center rounded-[15px] ${
                    isActive ? 'bg-[#E8E5FF]' : 'bg-transparent'
                  }`}
                  key={item.id}
                  onPress={() => changeView(item.id)}
                >
                  {item.id === 'search' ? (
                    <SearchNavigationIcon active={isActive} />
                  ) : item.id === 'completed' ? (
                    <CompletedNavigationIcon active={isActive} />
                  ) : (
                    <Text
                      className={`text-[21px] font-extrabold ${
                        isActive ? 'text-primary' : 'text-[#92939F]'
                      }`}
                    >
                      {item.icon}
                    </Text>
                  )}
                  {item.id === 'trash' && trashedTodos.length > 0 ? (
                    <View className="absolute right-0 top-0 min-w-[17px] items-center rounded-[9px] bg-[#D85B6B] px-1 py-0.5">
                      <Text className="text-[8px] font-extrabold text-white">
                        {trashedTodos.length}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
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

        {!usesDesktopLayout ? (
          <SafeAreaView className="border-t border-[#E4E3EA] bg-white">
          <View className="h-[66px] flex-row items-center justify-around px-6">
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeView;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  className="flex-1 items-center justify-center py-2"
                  key={item.id}
                  onPress={() => changeView(item.id)}
                >
                  {item.id === 'search' ? (
                    <SearchNavigationIcon active={isActive} />
                  ) : item.id === 'completed' ? (
                    <CompletedNavigationIcon active={isActive} />
                  ) : (
                    <Text
                      className={`text-[20px] font-extrabold ${
                        isActive ? 'text-primary' : 'text-[#A3A3AF]'
                      }`}
                    >
                      {item.icon}
                    </Text>
                  )}
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
              key={`${selectedTask.id}-${selectedTask.readOnly}`}
              onClose={closeSelectedTask}
              readOnly={selectedTask.readOnly}
              todoId={selectedTask.id}
            />
          </View>
        </>
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
          onSignOut={signOut}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fullPane: {
    flex: 1,
  },
});

export default function App() {
  return (
    <TodoProvider>
      <AppContent />
    </TodoProvider>
  );
}
