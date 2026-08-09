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
  Language,
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
  isHydrated: boolean;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  addTodo: (todo: NewTodo) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, changes: TodoUpdate) => void;
  trashTodo: (id: string) => void;
  trashTodos: (ids: string[]) => void;
  restoreTodo: (id: string) => void;
  deleteTodoPermanently: (id: string) => void;
  emptyTrash: () => void;
  addGroup: (name: string) => string;
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

const orderWithSubtasks = (todos: Todo[]): Todo[] => {
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
    children.get(todo.id)?.forEach(append);
  };

  todos
    .filter((todo) => !todo.parentId || !ids.has(todo.parentId))
    .forEach(append);

  return result;
};

export const TodoProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<Language>('zh');
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [groups, setGroups] = useState<TodoGroup[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    loadAppState()
      .then((state) => {
        if (isActive && state) {
          setLanguage(state.language);
          setAllTodos(state.todos);
          setGroups(state.groups);
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
      saveAppState({ language, todos: allTodos, groups }).catch(
        (error: unknown) => {
          console.warn('Unable to save local LightFlux data.', error);
        },
      );
    }, 180);

    return () => clearTimeout(timer);
  }, [allTodos, groups, isHydrated, language]);

  const addTodo = useCallback((todo: NewTodo) => {
    const title = todo.title.trim();
    if (!title) {
      return;
    }

    setAllTodos((current) => [
      {
        id: makeId(),
        title,
        completed: false,
        completedAt: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        scheduledDate: todo.scheduledDate,
        groupId: todo.groupId ?? null,
        parentId: todo.parentId ?? null,
        trashedAt: null,
        content: todo.content ?? emptyRichTextDocument(),
      },
      ...current,
    ]);
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
    (name: string) => {
      const id = makeId();
      setGroups((current) => [
        ...current,
        {
          id,
          name: name.trim(),
          color: GROUP_COLORS[current.length % GROUP_COLORS.length],
          createdAt: Date.now(),
        },
      ]);
      return id;
    },
    [],
  );

  const todos = useMemo(
    () => orderWithSubtasks(allTodos.filter((todo) => todo.trashedAt === null)),
    [allTodos],
  );
  const trashedTodos = useMemo(
    () =>
      orderWithSubtasks(
        allTodos
          .filter((todo) => todo.trashedAt !== null)
          .sort((a, b) => (b.trashedAt ?? 0) - (a.trashedAt ?? 0)),
      ),
    [allTodos],
  );

  const value = useMemo<TodoContextValue>(
    () => ({
      language,
      todos,
      trashedTodos,
      groups,
      isHydrated,
      setLanguage,
      addTodo,
      toggleTodo,
      updateTodo,
      trashTodo,
      trashTodos,
      restoreTodo,
      deleteTodoPermanently,
      emptyTrash,
      addGroup,
    }),
    [
      addGroup,
      addTodo,
      deleteTodoPermanently,
      emptyTrash,
      groups,
      isHydrated,
      language,
      restoreTodo,
      trashTodo,
      trashTodos,
      todos,
      trashedTodos,
      toggleTodo,
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
