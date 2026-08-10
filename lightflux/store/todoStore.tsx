import React, { useEffect } from 'react';
import { create } from 'zustand';

import { loadAppState, saveAppState } from '../services/todoStorage';
import {
  NAVIGATION_ITEM_IDS,
  GroupPlacement,
  Language,
  Milestone,
  MilestoneUpdate,
  NavigationItemId,
  NewMilestone,
  NewTodo,
  PersistedAppState,
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
  restoreTodoBranch,
  todoState,
} from './todoDomain';

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
  allMilestones: Milestone[];
  milestones: Milestone[];
  archivedMilestones: Milestone[];
  trashedMilestones: Milestone[];
  navigationOrder: NavigationItemId[];
  ungroupedName: string | null;
  isHydrated: boolean;
  persistenceReady: boolean;
  persistenceErrorAt: number | null;
  hydrationStarted: boolean;
  hydrate: () => Promise<void>;
  clearPersistenceError: () => void;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  addTodo: (todo: NewTodo) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, changes: TodoUpdate) => void;
  trashTodo: (id: string) => void;
  trashTodos: (ids: string[]) => void;
  restoreTodo: (id: string) => void;
  reorderTask: (id: string, targetIndex: number) => void;
  deleteTodoPermanently: (id: string) => void;
  emptyTrash: () => void;
  addGroup: (name: string, placement?: GroupPlacement) => string;
  reorderNavigationItem: (
    id: NavigationItemId,
    targetIndex: number,
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

export const useTodoStore = create<TodoStore>((set, get) => ({
  language: 'zh',
  ...todoState([]),
  groups: [],
  ...milestoneState([]),
  navigationOrder: [...NAVIGATION_ITEM_IDS],
  ungroupedName: null,
  isHydrated: false,
  persistenceReady: false,
  persistenceErrorAt: null,
  hydrationStarted: false,

  hydrate: async () => {
    if (get().hydrationStarted) {
      return;
    }

    set({ hydrationStarted: true });
    try {
      const state = await loadAppState();
      if (state) {
        set({
          language: state.language,
          ...todoState(state.todos),
          groups: state.groups,
          ...milestoneState(state.milestones),
          navigationOrder: state.navigationOrder,
          ungroupedName: state.ungroupedName,
        });
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
        priority: 'none',
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

      return todoState(nextTodos);
    });
  },

  toggleTodo: (id) =>
    set((state) =>
      todoState(
        state.allTodos.map((todo) => {
          if (todo.id !== id) {
            return todo;
          }
          const completed = !todo.completed;
          const timestamp = Date.now();
          return {
            ...todo,
            completed,
            completedAt: completed ? timestamp : null,
            updatedAt: timestamp,
          };
        }),
      ),
    ),

  updateTodo: (id, changes) =>
    set((state) =>
      todoState(
        state.allTodos.map((todo) =>
          todo.id === id
            ? { ...todo, ...changes, updatedAt: Date.now() }
            : todo,
        ),
      ),
    ),

  trashTodos: (ids) =>
    set((state) => {
      const idsToTrash = collectTodoFamily(
        state.allTodos.filter((todo) => todo.trashedAt === null),
        ids,
      );
      const trashedAt = Date.now();
      return todoState(
        state.allTodos.map((todo) =>
          idsToTrash.has(todo.id)
            ? { ...todo, trashedAt, updatedAt: trashedAt }
            : todo,
        ),
      );
    }),

  trashTodo: (id) => get().trashTodos([id]),

  restoreTodo: (id) =>
    set((state) =>
      todoState(restoreTodoBranch(state.allTodos, id, Date.now())),
    ),

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

  deleteTodoPermanently: (id) =>
    set((state) =>
      todoState(
        deleteTrashedTodoBranch(state.allTodos, id, Date.now()),
      ),
    ),

  emptyTrash: () =>
    set((state) => {
      const trashedMilestoneIds = new Set(
        state.trashedMilestones.map((milestone) => milestone.id),
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
      const sourceIndex = state.navigationOrder.indexOf(id);
      const boundedTarget = Math.max(
        0,
        Math.min(targetIndex, state.navigationOrder.length - 1),
      );
      if (sourceIndex < 0 || sourceIndex === boundedTarget) {
        return state;
      }

      const navigationOrder = [...state.navigationOrder];
      const [moved] = navigationOrder.splice(sourceIndex, 1);
      navigationOrder.splice(boundedTarget, 0, moved);
      return { navigationOrder };
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
  schemaVersion: 8,
  updatedAt: Date.now(),
  language: state.language,
  navigationOrder: state.navigationOrder,
  ungroupedName: state.ungroupedName,
  todos: state.allTodos,
  groups: state.groups,
  milestones: state.allMilestones,
});

export const TodoProvider = ({ children }: { children: React.ReactNode }) => {
  const hydrate = useTodoStore((state) => state.hydrate);
  const language = useTodoStore((state) => state.language);
  const allTodos = useTodoStore((state) => state.allTodos);
  const groups = useTodoStore((state) => state.groups);
  const allMilestones = useTodoStore((state) => state.allMilestones);
  const navigationOrder = useTodoStore((state) => state.navigationOrder);
  const ungroupedName = useTodoStore((state) => state.ungroupedName);
  const isHydrated = useTodoStore((state) => state.isHydrated);
  const persistenceReady = useTodoStore((state) => state.persistenceReady);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!isHydrated || !persistenceReady) {
      return undefined;
    }

    const timer = setTimeout(() => {
      saveAppState(
        persistedState(useTodoStore.getState()),
      ).catch((error: unknown) => {
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
    persistenceReady,
    ungroupedName,
  ]);

  return children;
};
