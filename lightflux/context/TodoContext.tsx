import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { loadAppState, saveAppState } from '../services/todoStorage';
import {
  NAVIGATION_ITEM_IDS,
  GroupPlacement,
  Language,
  NavigationItemId,
  NewTodo,
  Todo,
  TodoGroup,
  TodoUpdate,
} from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';

const GROUP_COLORS = [
  '#8B7EFF',
  '#55B9A5',
  '#EEA45E',
  '#6EA7E8',
  '#DD7C91',
];

interface TodoContextValue {
  language: Language;
  todos: Todo[];
  trashedTodos: Todo[];
  groups: TodoGroup[];
  navigationOrder: NavigationItemId[];
  ungroupedName: string | null;
  isHydrated: boolean;
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
  reorderNavigationItem: (id: NavigationItemId, targetIndex: number) => void;
  renameGroup: (id: string | null, name: string) => void;
  deleteGroup: (id: string) => void;
}

const TodoContext = createContext<TodoContextValue | null>(null);

const makeId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const collectTodoFamily = (todos: Todo[], rootIds: string[]): Set<string> => {
  const result = new Set(rootIds);
  let changed = true;

  while (changed) {
    changed = false;
    todos.forEach((todo) => {
      if (todo.parentId && result.has(todo.parentId) && !result.has(todo.id)) {
        result.add(todo.id);
        changed = true;
      }
    });
  }

  return result;
};

const byTodoOrder = (a: Todo, b: Todo) =>
  a.sortOrder - b.sortOrder || b.createdAt - a.createdAt;

const orderWithSubtasks = (
  todos: Todo[],
  compare: (a: Todo, b: Todo) => number = byTodoOrder,
): Todo[] => {
  const ids = new Set(todos.map((todo) => todo.id));
  const children = new Map<string, Todo[]>();

  todos.forEach((todo) => {
    if (todo.parentId && ids.has(todo.parentId)) {
      const current = children.get(todo.parentId) ?? [];
      current.push(todo);
      children.set(todo.parentId, current);
    }
  });

  const result: Todo[] = [];
  const append = (todo: Todo) => {
    result.push(todo);
    children.get(todo.id)?.sort(compare).forEach(append);
  };

  todos
    .filter((todo) => !todo.parentId || !ids.has(todo.parentId))
    .sort(compare)
    .forEach(append);

  return result;
};

export const TodoProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('zh');
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [groups, setGroups] = useState<TodoGroup[]>([]);
  const [navigationOrder, setNavigationOrder] = useState<NavigationItemId[]>(
    [...NAVIGATION_ITEM_IDS],
  );
  const [ungroupedName, setUngroupedName] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    loadAppState()
      .then((state) => {
        if (isActive && state) {
          setLanguage(state.language);
          setAllTodos(state.todos);
          setGroups(state.groups);
          setNavigationOrder(state.navigationOrder);
          setUngroupedName(state.ungroupedName);
        }
      })
      .catch((error: unknown) => {
        console.warn('Unable to load local LightFlux data.', error);
      })
      .finally(() => {
        if (isActive) {
          setIsHydrated(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return undefined;
    }

    const timer = setTimeout(() => {
      saveAppState({
        schemaVersion: 5,
        language,
        navigationOrder,
        ungroupedName,
        todos: allTodos,
        groups,
      }).catch((error: unknown) => {
        console.warn('Unable to save local LightFlux data.', error);
      });
    }, 180);

    return () => clearTimeout(timer);
  }, [
    allTodos,
    groups,
    isHydrated,
    language,
    navigationOrder,
    ungroupedName,
  ]);

  const addTodo = useCallback((todo: NewTodo) => {
    const title = todo.title.trim();
    if (!title) {
      return;
    }

    setAllTodos((current) => {
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
        parentId: todo.parentId ?? null,
        sortOrder: 0,
        trashedAt: null,
        content: todo.content ?? emptyRichTextDocument(),
      };
      const siblings = current
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

      return [
        ...current.map((item) =>
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
    });
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setAllTodos((current) =>
      current.map((todo) =>
        todo.id === id
          ? (() => {
              const completed = !todo.completed;
              const timestamp = Date.now();
              return {
                ...todo,
                completed,
                completedAt: completed ? timestamp : null,
                updatedAt: timestamp,
              };
            })()
          : todo,
      ),
    );
  }, []);

  const updateTodo = useCallback((id: string, changes: TodoUpdate) => {
    setAllTodos((current) =>
      current.map((todo) =>
        todo.id === id
          ? { ...todo, ...changes, updatedAt: Date.now() }
          : todo,
      ),
    );
  }, []);

  const trashTodos = useCallback((ids: string[]) => {
    setAllTodos((current) => {
      const idsToTrash = collectTodoFamily(current, ids);
      const trashedAt = Date.now();
      return current.map((todo) =>
        idsToTrash.has(todo.id)
          ? { ...todo, trashedAt, updatedAt: trashedAt }
          : todo,
      );
    });
  }, []);

  const trashTodo = useCallback(
    (id: string) => trashTodos([id]),
    [trashTodos],
  );

  const restoreTodo = useCallback((id: string) => {
    setAllTodos((current) => {
      const idsToRestore = collectTodoFamily(current, [id]);
      return current.map((todo) =>
        idsToRestore.has(todo.id)
          ? { ...todo, trashedAt: null, updatedAt: Date.now() }
          : todo,
      );
    });
  }, []);

  const reorderTask = useCallback((id: string, targetIndex: number) => {
    setAllTodos((current) => {
      const dragged = current.find((todo) => todo.id === id);
      if (!dragged || dragged.trashedAt !== null) {
        return current;
      }

      const siblings = current
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
        return current;
      }

      const reordered = [...siblings];
      const [moved] = reordered.splice(sourceIndex, 1);
      reordered.splice(boundedTarget, 0, moved);
      const orderById = new Map(
        reordered.map((todo, index) => [todo.id, index]),
      );
      const timestamp = Date.now();

      return current.map((todo) =>
        orderById.has(todo.id)
          ? {
              ...todo,
              sortOrder: orderById.get(todo.id) ?? todo.sortOrder,
              updatedAt: timestamp,
            }
          : todo,
      );
    });
  }, []);

  const deleteTodoPermanently = useCallback((id: string) => {
    setAllTodos((current) => {
      const idsToDelete = collectTodoFamily(current, [id]);
      return current.filter((todo) => !idsToDelete.has(todo.id));
    });
  }, []);

  const emptyTrash = useCallback(() => {
    setAllTodos((current) => current.filter((todo) => todo.trashedAt === null));
  }, []);

  const addGroup = useCallback(
    (name: string, placement?: GroupPlacement) => {
      const id = makeId();
      setGroups((current) => {
        const newGroup: TodoGroup = {
          id,
          name: name.trim(),
          color: GROUP_COLORS[current.length % GROUP_COLORS.length],
          createdAt: Date.now(),
          sortOrder:
            Math.max(0, ...current.map((group) => group.sortOrder)) + 1,
        };

        if (!placement) {
          return [...current, newGroup];
        }

        const ordered: Array<TodoGroup | null> = [
          null,
          ...current,
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

        return ordered
          .filter((group): group is TodoGroup => group !== null)
          .map((group) => ({
            ...group,
            sortOrder: ordered.indexOf(group) - ungroupedIndex,
          }));
      });
      return id;
    },
    [],
  );

  const renameGroup = useCallback((id: string | null, name: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    if (id === null) {
      setUngroupedName(normalizedName);
      return;
    }

    setGroups((current) =>
      current.map((group) =>
        group.id === id ? { ...group, name: normalizedName } : group,
      ),
    );
  }, []);

  const reorderNavigationItem = useCallback(
    (id: NavigationItemId, targetIndex: number) => {
      setNavigationOrder((current) => {
        const sourceIndex = current.indexOf(id);
        const boundedTarget = Math.max(
          0,
          Math.min(targetIndex, current.length - 1),
        );
        if (sourceIndex < 0 || sourceIndex === boundedTarget) {
          return current;
        }

        const reordered = [...current];
        const [moved] = reordered.splice(sourceIndex, 1);
        reordered.splice(boundedTarget, 0, moved);
        return reordered;
      });
    },
    [],
  );

  const deleteGroup = useCallback((id: string) => {
    setGroups((current) => current.filter((group) => group.id !== id));
    setAllTodos((current) =>
      current.map((todo) =>
        todo.groupId === id
          ? { ...todo, groupId: null, updatedAt: Date.now() }
          : todo,
      ),
    );
  }, []);

  const todos = useMemo(
    () => orderWithSubtasks(allTodos.filter((todo) => todo.trashedAt === null)),
    [allTodos],
  );
  const trashedTodos = useMemo(
    () =>
      orderWithSubtasks(
        allTodos.filter((todo) => todo.trashedAt !== null),
        (a, b) =>
          (b.trashedAt ?? 0) - (a.trashedAt ?? 0) || byTodoOrder(a, b),
      ),
    [allTodos],
  );

  const value = useMemo<TodoContextValue>(
    () => ({
      language,
      todos,
      trashedTodos,
      groups,
      navigationOrder,
      ungroupedName,
      isHydrated,
      setLanguage,
      addTodo,
      toggleTodo,
      updateTodo,
      trashTodo,
      trashTodos,
      restoreTodo,
      reorderTask,
      deleteTodoPermanently,
      emptyTrash,
      addGroup,
      reorderNavigationItem,
      renameGroup,
      deleteGroup,
    }),
    [
      addGroup,
      addTodo,
      deleteTodoPermanently,
      deleteGroup,
      emptyTrash,
      groups,
      isHydrated,
      language,
      navigationOrder,
      restoreTodo,
      renameGroup,
      reorderNavigationItem,
      reorderTask,
      trashTodo,
      trashTodos,
      todos,
      trashedTodos,
      toggleTodo,
      ungroupedName,
      updateTodo,
    ],
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};

export const useTodos = (): TodoContextValue => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodos must be used within TodoProvider.');
  }
  return context;
};
