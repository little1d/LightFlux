import React, { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';

import {
  clearRuntimeMilestoneNotifications,
  reconcileMilestoneNotifications,
} from '../services/milestoneNotifications';
import { mergeConcurrentAppStates } from '../services/appStateMerge';
import {
  loadAppState,
  saveAppState,
  synchronizeAppState,
} from '../services/todoStorage';
import {
  NAVIGATION_ITEM_IDS,
  GroupPlacement,
  Language,
  Milestone,
  MilestoneUpdate,
  NavigationItemId,
  OptionalNavigationItemId,
  NewMilestone,
  NewTodo,
  PersistedAppState,
  TaskEvent,
  Todo,
  TodoGroup,
  TodoUpdate,
} from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';
import {
  isValidMilestoneDateRule,
  isValidMilestoneStartYear,
  normalizeReminderOffsets,
} from '../utils/milestoneDate';
import {
  MILESTONE_TYPE_THEME,
  milestoneState,
} from './milestoneDomain';
import {
  byTodoOrder,
  collectTodoFamily,
  deleteTrashedTodoBranch,
  emptyTrashTodos,
  moveTodoBranchToGroup,
  reorderList,
  restoreTodoBranch,
  todoState,
} from './todoDomain';
import {
  createTaskEvent,
  deriveTaskEventsFromTodoDiff,
} from './taskEventDomain';

const GROUP_COLORS = [
  '#8B7EFF',
  '#55B9A5',
  '#EEA45E',
  '#6EA7E8',
  '#DD7C91',
];

interface TodoStore {
  language: Language;
  allTodos: Todo[];
  todos: Todo[];
  trashedTodos: Todo[];
  groups: TodoGroup[];
  taskEvents: TaskEvent[];
  analyticsStartedAt: number;
  allMilestones: Milestone[];
  milestones: Milestone[];
  archivedMilestones: Milestone[];
  trashedMilestones: Milestone[];
  navigationOrder: NavigationItemId[];
  hiddenNavigationItems: OptionalNavigationItemId[];
  ungroupedName: string | null;
  isHydrated: boolean;
  persistenceReady: boolean;
  persistenceErrorAt: number | null;
  hydrationStarted: boolean;
  hydrate: () => Promise<void>;
  syncRemote: () => Promise<void>;
  clearPersistenceError: () => void;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  addTodo: (todo: NewTodo) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, changes: TodoUpdate) => void;
  trashTodo: (id: string) => void;
  trashTodos: (ids: string[]) => void;
  restoreTodo: (id: string) => void;
  reorderTask: (id: string, targetIndex: number) => void;
  moveTodoToGroup: (id: string, groupId: string | null) => void;
  deleteTodoPermanently: (id: string) => void;
  emptyTrash: () => void;
  addGroup: (name: string, placement?: GroupPlacement) => string;
  reorderNavigationItem: (
    id: NavigationItemId,
    targetIndex: number,
  ) => void;
  setNavigationItemVisible: (
    id: OptionalNavigationItemId,
    visible: boolean,
  ) => void;
  renameGroup: (id: string | null, name: string) => void;
  deleteGroup: (id: string) => void;
  addMilestone: (milestone: NewMilestone) => string | null;
  updateMilestone: (id: string, changes: MilestoneUpdate) => void;
  archiveMilestone: (id: string) => void;
  unarchiveMilestone: (id: string) => void;
  trashMilestone: (id: string) => void;
  restoreMilestone: (id: string) => void;
  deleteMilestonePermanently: (id: string) => void;
}

const makeId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const persistedStoreSlice = (state: PersistedAppState) => ({
  language: state.language,
  ...todoState(state.todos),
  groups: state.groups,
  taskEvents: state.taskEvents,
  analyticsStartedAt: state.analyticsStartedAt,
  ...milestoneState(state.milestones),
  navigationOrder: state.navigationOrder,
  hiddenNavigationItems: state.hiddenNavigationItems,
  ungroupedName: state.ungroupedName,
});

let hydrationPromise: Promise<void> | null = null;

export const useTodoStore = create<TodoStore>((set, get) => ({
  language: 'zh',
  ...todoState([]),
  groups: [],
  taskEvents: [],
  analyticsStartedAt: Date.now(),
  ...milestoneState([]),
  navigationOrder: [...NAVIGATION_ITEM_IDS],
  hiddenNavigationItems: [],
  ungroupedName: null,
  isHydrated: false,
  persistenceReady: false,
  persistenceErrorAt: null,
  hydrationStarted: false,

  hydrate: () => {
    if (hydrationPromise) {
      return hydrationPromise;
    }

    set({ hydrationStarted: true });
    hydrationPromise = (async () => {
      try {
        const state = await loadAppState();
        if (state) {
          set(persistedStoreSlice(state));
        }
        set({ isHydrated: true, persistenceReady: true });
      } catch (error) {
        console.warn('Unable to load LightFlux data.', error);
        set({
          isHydrated: true,
          persistenceErrorAt: Date.now(),
          persistenceReady: false,
        });
      }
    })();
    return hydrationPromise;
  },

  syncRemote: async () => {
    await get().hydrate();
    if (!get().isHydrated) {
      return;
    }
    const requestedState = persistedState(get());
    const synchronizedState = await synchronizeAppState(requestedState, {
      requireRemoteSession: true,
    });
    if (!synchronizedState) {
      return;
    }
    if (synchronizedState === requestedState) {
      set({ persistenceReady: true });
      return;
    }
    const currentState = persistedState(get());
    const reconciledState = mergeConcurrentAppStates(
      requestedState,
      currentState,
      synchronizedState,
    );
    set({
      ...persistedStoreSlice(reconciledState),
      persistenceReady: true,
    });
  },

  clearPersistenceError: () => set({ persistenceErrorAt: null }),

  setLanguage: (value) =>
    set((state) => ({
      language:
        typeof value === 'function' ? value(state.language) : value,
    })),

  addTodo: (todo) => {
    const title = todo.title.trim();
    if (!title) {
      return;
    }

    set((state) => {
      const timestamp = Date.now();
      const newTodo: Todo = {
        id: makeId(),
        title,
        completed: false,
        completedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        scheduledDate: todo.scheduledDate,
        groupId: todo.groupId ?? null,
        milestoneId: todo.milestoneId ?? null,
        parentId: todo.parentId ?? null,
        priority: todo.priority ?? 'none',
        sortOrder: 0,
        trashedAt: null,
        content: todo.content ?? emptyRichTextDocument(),
      };
      const siblings = state.allTodos
        .filter(
          (item) =>
            item.trashedAt === null &&
            item.groupId === newTodo.groupId &&
            item.parentId === newTodo.parentId,
        )
        .sort(byTodoOrder);
      const anchorIndex = todo.insertAfterId
        ? siblings.findIndex((item) => item.id === todo.insertAfterId)
        : -1;
      const insertIndex = anchorIndex >= 0 ? anchorIndex + 1 : 0;
      const reordered = [...siblings];
      reordered.splice(insertIndex, 0, newTodo);
      const orderById = new Map(
        reordered.map((item, index) => [item.id, index]),
      );
      const nextTodos = [
        ...state.allTodos.map((item) =>
          orderById.has(item.id)
            ? {
                ...item,
                sortOrder: orderById.get(item.id) ?? item.sortOrder,
                updatedAt: timestamp,
              }
            : item,
        ),
        {
          ...newTodo,
          sortOrder: orderById.get(newTodo.id) ?? 0,
        },
      ];

      return {
        ...todoState(nextTodos),
        taskEvents: [
          ...state.taskEvents,
          createTaskEvent(newTodo.id, 'created', timestamp, {
            scheduledDate: newTodo.scheduledDate,
          }),
        ],
      };
    });
  },

  toggleTodo: (id) =>
    set((state) => {
      const target = state.allTodos.find((todo) => todo.id === id);
      if (!target) {
        return state;
      }
      const completed = !target.completed;
      const timestamp = Date.now();
      return {
        ...todoState(
          state.allTodos.map((todo) =>
            todo.id === id
              ? {
                  ...todo,
                  completed,
                  completedAt: completed ? timestamp : null,
                  updatedAt: timestamp,
                }
              : todo,
          ),
        ),
        taskEvents: [
          ...state.taskEvents,
          createTaskEvent(
            id,
            completed ? 'completed' : 'reopened',
            timestamp,
          ),
        ],
      };
    }),

  updateTodo: (id, changes) =>
    set((state) => {
      const target = state.allTodos.find((todo) => todo.id === id);
      if (!target) {
        return state;
      }
      const timestamp = Date.now();
      const scheduleChanged =
        changes.scheduledDate !== undefined &&
        changes.scheduledDate !== target.scheduledDate;
      return {
        ...todoState(
          state.allTodos.map((todo) =>
            todo.id === id
              ? { ...todo, ...changes, updatedAt: timestamp }
              : todo,
          ),
        ),
        taskEvents: scheduleChanged
          ? [
              ...state.taskEvents,
              createTaskEvent(id, 'rescheduled', timestamp, {
                previousScheduledDate: target.scheduledDate,
                scheduledDate: changes.scheduledDate,
              }),
            ]
          : state.taskEvents,
      };
    }),

  trashTodos: (ids) =>
    set((state) => {
      const activeTodos = state.allTodos.filter(
        (todo) => todo.trashedAt === null,
      );
      const activeIds = new Set(activeTodos.map((todo) => todo.id));
      const idsToTrash = collectTodoFamily(
        activeTodos,
        ids.filter((id) => activeIds.has(id)),
      );
      if (idsToTrash.size === 0) {
        return state;
      }
      const trashedAt = Date.now();
      const nextTodos = state.allTodos.map((todo) =>
        idsToTrash.has(todo.id)
          ? { ...todo, trashedAt, updatedAt: trashedAt }
          : todo,
      );
      return {
        ...todoState(nextTodos),
        taskEvents: [
          ...state.taskEvents,
          ...Array.from(idsToTrash).map((todoId) =>
            createTaskEvent(todoId, 'trashed', trashedAt),
          ),
        ],
      };
    }),

  trashTodo: (id) => get().trashTodos([id]),

  restoreTodo: (id) =>
    set((state) => {
      const timestamp = Date.now();
      const nextTodos = restoreTodoBranch(
        state.allTodos,
        id,
        timestamp,
      );
      return {
        ...todoState(nextTodos),
        taskEvents: [
          ...state.taskEvents,
          ...deriveTaskEventsFromTodoDiff(
            state.allTodos,
            nextTodos,
            timestamp,
          ).filter((event) => event.type === 'restored'),
        ],
      };
    }),

  reorderTask: (id, targetIndex) =>
    set((state) => {
      const dragged = state.allTodos.find((todo) => todo.id === id);
      if (!dragged || dragged.trashedAt !== null) {
        return state;
      }

      const siblings = state.allTodos
        .filter(
          (todo) =>
            todo.parentId === dragged.parentId &&
            todo.groupId === dragged.groupId &&
            todo.trashedAt === null,
        )
        .sort(byTodoOrder);
      const sourceIndex = siblings.findIndex((todo) => todo.id === id);
      const boundedTarget = Math.max(
        0,
        Math.min(targetIndex, siblings.length - 1),
      );

      if (sourceIndex < 0 || sourceIndex === boundedTarget) {
        return state;
      }

      const reordered = [...siblings];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(boundedTarget, 0, moved);
      const orderById = new Map(
        reordered.map((todo, index) => [todo.id, index]),
      );
      const timestamp = Date.now();
      return todoState(
        state.allTodos.map((todo) =>
          orderById.has(todo.id)
            ? {
                ...todo,
                sortOrder: orderById.get(todo.id) ?? todo.sortOrder,
                updatedAt: timestamp,
              }
            : todo,
        ),
      );
    }),

  moveTodoToGroup: (id, groupId) =>
    set((state) =>
      todoState(
        moveTodoBranchToGroup(
          state.allTodos,
          id,
          groupId,
          Date.now(),
        ),
      ),
    ),

  deleteTodoPermanently: (id) =>
    set((state) => {
      const nextTodos = deleteTrashedTodoBranch(
        state.allTodos,
        id,
        Date.now(),
      );
      const remainingIds = new Set(nextTodos.map((todo) => todo.id));
      return {
        ...todoState(nextTodos),
        taskEvents: state.taskEvents.filter((event) =>
          remainingIds.has(event.taskId),
        ),
      };
    }),

  emptyTrash: () =>
    set((state) => {
      const trashedMilestoneIds = new Set(
        state.trashedMilestones.map((milestone) => milestone.id),
      );
      const trashedTodoIds = new Set(
        state.allTodos
          .filter((todo) => todo.trashedAt !== null)
          .map((todo) => todo.id),
      );
      return {
        ...todoState(
          emptyTrashTodos(state.allTodos, Date.now()).map((todo) =>
            todo.milestoneId &&
            trashedMilestoneIds.has(todo.milestoneId)
              ? { ...todo, milestoneId: null, updatedAt: Date.now() }
              : todo,
          ),
        ),
        ...milestoneState(
          state.allMilestones.filter(
            (milestone) => milestone.trashedAt === null,
          ),
        ),
        taskEvents: state.taskEvents.filter(
          (event) => !trashedTodoIds.has(event.taskId),
        ),
      };
    }),

  addGroup: (name, placement) => {
    const id = makeId();
    set((state) => {
      const newGroup: TodoGroup = {
        id,
        name: name.trim(),
        color: GROUP_COLORS[state.groups.length % GROUP_COLORS.length],
        createdAt: Date.now(),
        sortOrder:
          Math.max(0, ...state.groups.map((group) => group.sortOrder)) + 1,
      };

      if (!placement) {
        return { groups: [...state.groups, newGroup] };
      }

      const ordered: Array<TodoGroup | null> = [
        null,
        ...state.groups,
      ].sort(
        (a, b) =>
          (a?.sortOrder ?? 0) - (b?.sortOrder ?? 0) ||
          (a?.createdAt ?? 0) - (b?.createdAt ?? 0),
      );
      const anchorIndex = ordered.findIndex(
        (group) => (group?.id ?? null) === placement.anchorGroupId,
      );
      const insertIndex =
        anchorIndex < 0
          ? ordered.length
          : anchorIndex + (placement.position === 'after' ? 1 : 0);
      ordered.splice(insertIndex, 0, newGroup);
      const ungroupedIndex = ordered.indexOf(null);

      return {
        groups: ordered
          .filter((group): group is TodoGroup => group !== null)
          .map((group) => ({
            ...group,
            sortOrder: ordered.indexOf(group) - ungroupedIndex,
          })),
      };
    });
    return id;
  },

  renameGroup: (id, name) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    if (id === null) {
      set({ ungroupedName: normalizedName });
      return;
    }

    set((state) => ({
      groups: state.groups.map((group) =>
        group.id === id ? { ...group, name: normalizedName } : group,
      ),
    }));
  },

  reorderNavigationItem: (id, targetIndex) =>
    set((state) => {
      const navigationOrder = reorderList(
        state.navigationOrder,
        id,
        targetIndex,
      );
      if (navigationOrder === state.navigationOrder) {
        return state;
      }
      return { navigationOrder };
    }),

  setNavigationItemVisible: (id, visible) =>
    set((state) => {
      const isHidden = state.hiddenNavigationItems.includes(id);
      if (visible === !isHidden) {
        return state;
      }

      return {
        hiddenNavigationItems: visible
          ? state.hiddenNavigationItems.filter((item) => item !== id)
          : [...state.hiddenNavigationItems, id],
      };
    }),

  deleteGroup: (id) =>
    set((state) => ({
      groups: state.groups.filter((group) => group.id !== id),
      ...todoState(
        state.allTodos.map((todo) =>
          todo.groupId === id
            ? { ...todo, groupId: null, updatedAt: Date.now() }
            : todo,
        ),
      ),
    })),

  addMilestone: (milestone) => {
    const title = milestone.title.trim();
    const startYear = milestone.startYear ?? null;
    if (
      !title ||
      !isValidMilestoneDateRule(milestone.dateRule) ||
      !isValidMilestoneStartYear(startYear)
    ) {
      return null;
    }
    const id = makeId();
    const timestamp = Date.now();
    const theme = MILESTONE_TYPE_THEME[milestone.type];
    const nextMilestone: Milestone = {
      id,
      title,
      type: milestone.type,
      dateRule: milestone.dateRule,
      startYear,
      reminderOffsets: normalizeReminderOffsets(
        milestone.reminderOffsets ?? [],
      ),
      notes: milestone.notes?.trim() ?? '',
      icon: milestone.icon ?? theme.icon,
      color: milestone.color ?? theme.color,
      pinned: milestone.pinned ?? false,
      archivedAt: null,
      trashedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: 1,
    };
    set((state) =>
      milestoneState([...state.allMilestones, nextMilestone]),
    );
    return id;
  },

  updateMilestone: (id, changes) =>
    set((state) =>
      milestoneState(
        state.allMilestones.map((milestone) => {
          if (milestone.id !== id || milestone.trashedAt !== null) {
            return milestone;
          }
          if (
            changes.dateRule &&
            !isValidMilestoneDateRule(changes.dateRule)
          ) {
            return milestone;
          }
          if (
            changes.startYear !== undefined &&
            !isValidMilestoneStartYear(changes.startYear)
          ) {
            return milestone;
          }
          const title =
            changes.title === undefined
              ? milestone.title
              : changes.title.trim();
          if (!title) {
            return milestone;
          }
          return {
            ...milestone,
            ...changes,
            title,
            notes:
              changes.notes === undefined
                ? milestone.notes
                : changes.notes.trim(),
            reminderOffsets:
              changes.reminderOffsets === undefined
                ? milestone.reminderOffsets
                : normalizeReminderOffsets(changes.reminderOffsets),
            updatedAt: Date.now(),
            revision: milestone.revision + 1,
          };
        }),
      ),
    ),

  archiveMilestone: (id) =>
    set((state) =>
      milestoneState(
        state.allMilestones.map((milestone) =>
          milestone.id === id && milestone.trashedAt === null
            ? {
                ...milestone,
                archivedAt: Date.now(),
                updatedAt: Date.now(),
                revision: milestone.revision + 1,
              }
            : milestone,
        ),
      ),
    ),

  unarchiveMilestone: (id) =>
    set((state) =>
      milestoneState(
        state.allMilestones.map((milestone) =>
          milestone.id === id && milestone.trashedAt === null
            ? {
                ...milestone,
                archivedAt: null,
                updatedAt: Date.now(),
                revision: milestone.revision + 1,
              }
            : milestone,
        ),
      ),
    ),

  trashMilestone: (id) =>
    set((state) =>
      milestoneState(
        state.allMilestones.map((milestone) =>
          milestone.id === id && milestone.trashedAt === null
            ? {
                ...milestone,
                trashedAt: Date.now(),
                updatedAt: Date.now(),
                revision: milestone.revision + 1,
              }
            : milestone,
        ),
      ),
    ),

  restoreMilestone: (id) =>
    set((state) =>
      milestoneState(
        state.allMilestones.map((milestone) =>
          milestone.id === id && milestone.trashedAt !== null
            ? {
                ...milestone,
                trashedAt: null,
                updatedAt: Date.now(),
                revision: milestone.revision + 1,
              }
            : milestone,
        ),
      ),
    ),

  deleteMilestonePermanently: (id) =>
    set((state) => ({
      ...milestoneState(
        state.allMilestones.filter(
          (milestone) =>
            milestone.id !== id || milestone.trashedAt === null,
        ),
      ),
      ...todoState(
        state.allTodos.map((todo) =>
          todo.milestoneId === id
            ? { ...todo, milestoneId: null, updatedAt: Date.now() }
            : todo,
        ),
      ),
    })),
}));

const persistedState = (state: TodoStore): PersistedAppState => ({
  schemaVersion: 10,
  updatedAt: Date.now(),
  analyticsStartedAt: state.analyticsStartedAt,
  language: state.language,
  navigationOrder: state.navigationOrder,
  hiddenNavigationItems: state.hiddenNavigationItems,
  ungroupedName: state.ungroupedName,
  todos: state.allTodos,
  groups: state.groups,
  milestones: state.allMilestones,
  taskEvents: state.taskEvents,
});

export const flushAppState = async (): Promise<void> => {
  const state = useTodoStore.getState();
  if (!state.isHydrated || !state.persistenceReady) {
    return;
  }
  await saveAppState(persistedState(state));
};

export const TodoProvider = ({ children }: { children: React.ReactNode }) => {
  const hydrate = useTodoStore((state) => state.hydrate);
  const language = useTodoStore((state) => state.language);
  const allTodos = useTodoStore((state) => state.allTodos);
  const groups = useTodoStore((state) => state.groups);
  const taskEvents = useTodoStore((state) => state.taskEvents);
  const allMilestones = useTodoStore((state) => state.allMilestones);
  const navigationOrder = useTodoStore((state) => state.navigationOrder);
  const hiddenNavigationItems = useTodoStore(
    (state) => state.hiddenNavigationItems,
  );
  const ungroupedName = useTodoStore((state) => state.ungroupedName);
  const isHydrated = useTodoStore((state) => state.isHydrated);
  const persistenceReady = useTodoStore((state) => state.persistenceReady);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated) {
      return undefined;
    }

    const reconcile = () => {
      reconcileMilestoneNotifications(
        useTodoStore.getState().allMilestones,
        useTodoStore.getState().language,
      ).catch((error: unknown) => {
        console.warn('Unable to schedule milestone reminders.', error);
      });
    };
    reconcile();
    const interval = setInterval(reconcile, 6 * 60 * 60 * 1000);
    const appStateSubscription = AppState.addEventListener(
      'change',
      (state) => {
        if (state === 'active') {
          reconcile();
        }
      },
    );
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        reconcile();
      }
    };
    if (Platform.OS === 'web') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
      clearRuntimeMilestoneNotifications();
      if (Platform.OS === 'web') {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      }
    };
  }, [allMilestones, isHydrated, language]);

  useEffect(() => {
    if (!isHydrated || !persistenceReady) {
      return undefined;
    }

    const timer = setTimeout(() => {
      const requestedState = persistedState(useTodoStore.getState());
      saveAppState(requestedState)
        .then((synchronizedState) => {
          if (synchronizedState === requestedState) {
            return;
          }
          const currentState = persistedState(useTodoStore.getState());
          const reconciledState = mergeConcurrentAppStates(
            requestedState,
            currentState,
            synchronizedState,
          );
          useTodoStore.setState(persistedStoreSlice(reconciledState));
        })
        .catch((error: unknown) => {
          console.warn('Unable to save LightFlux data.', error);
          useTodoStore.setState({ persistenceErrorAt: Date.now() });
        });
    }, 180);

    return () => clearTimeout(timer);
  }, [
    allTodos,
    allMilestones,
    groups,
    isHydrated,
    language,
    navigationOrder,
    hiddenNavigationItems,
    persistenceReady,
    taskEvents,
    ungroupedName,
  ]);

  return children;
};
