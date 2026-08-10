import { Todo } from '../types/todo';

export const byTodoOrder = (a: Todo, b: Todo) =>
  a.sortOrder - b.sortOrder || b.createdAt - a.createdAt;

export const collectTodoFamily = (
  todos: Todo[],
  rootIds: string[],
): Set<string> => {
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

export const orderWithSubtasks = (
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
  const visited = new Set<string>();
  const append = (todo: Todo) => {
    if (visited.has(todo.id)) {
      return;
    }
    visited.add(todo.id);
    result.push(todo);
    children.get(todo.id)?.sort(compare).forEach(append);
  };

  todos
    .filter((todo) => !todo.parentId || !ids.has(todo.parentId))
    .sort(compare)
    .forEach(append);
  todos
    .filter((todo) => !visited.has(todo.id))
    .sort(compare)
    .forEach(append);

  return result;
};

export const buildChildCountByParent = (
  todos: Todo[],
): Map<string, number> => {
  const counts = new Map<string, number>();
  todos.forEach((todo) => {
    if (todo.parentId) {
      counts.set(todo.parentId, (counts.get(todo.parentId) ?? 0) + 1);
    }
  });
  return counts;
};

export const buildSiblingIndexById = (
  todos: Todo[],
): Map<string, number> => {
  const siblingsByScope = new Map<string, Todo[]>();
  todos.forEach((todo) => {
    const scope = JSON.stringify([todo.groupId, todo.parentId]);
    const siblings = siblingsByScope.get(scope) ?? [];
    siblings.push(todo);
    siblingsByScope.set(scope, siblings);
  });

  return new Map(
    Array.from(siblingsByScope.values()).flatMap((siblings) =>
      siblings.map((todo, index) => [todo.id, index] as const),
    ),
  );
};

export const todoState = (allTodos: Todo[]) => ({
  allTodos,
  todos: orderWithSubtasks(
    allTodos.filter((todo) => todo.trashedAt === null),
  ),
  trashedTodos: orderWithSubtasks(
    allTodos.filter((todo) => todo.trashedAt !== null),
    (a, b) =>
      (b.trashedAt ?? 0) - (a.trashedAt ?? 0) || byTodoOrder(a, b),
  ),
});

export const restoreTodoBranch = (
  todos: Todo[],
  id: string,
  timestamp: number,
): Todo[] => {
  const trashedTodos = todos.filter((todo) => todo.trashedAt !== null);
  const root = trashedTodos.find((todo) => todo.id === id);
  if (!root) {
    return todos;
  }

  const idsToRestore = collectTodoFamily(trashedTodos, [id]);
  const parentWillBeActive =
    !root.parentId ||
    todos.some(
      (todo) =>
        todo.id === root.parentId &&
        (todo.trashedAt === null || idsToRestore.has(todo.id)),
    );

  return todos.map((todo) => {
    if (!idsToRestore.has(todo.id)) {
      return todo;
    }

    return {
      ...todo,
      parentId:
        todo.id === id && !parentWillBeActive ? null : todo.parentId,
      trashedAt: null,
      updatedAt: timestamp,
    };
  });
};

const removeTodosAndDetachChildren = (
  todos: Todo[],
  idsToDelete: Set<string>,
  timestamp: number,
): Todo[] =>
  todos
    .filter((todo) => !idsToDelete.has(todo.id))
    .map((todo) =>
      todo.parentId && idsToDelete.has(todo.parentId)
        ? { ...todo, parentId: null, updatedAt: timestamp }
        : todo,
    );

export const deleteTrashedTodoBranch = (
  todos: Todo[],
  id: string,
  timestamp: number,
): Todo[] => {
  const trashedTodos = todos.filter((todo) => todo.trashedAt !== null);
  if (!trashedTodos.some((todo) => todo.id === id)) {
    return todos;
  }

  return removeTodosAndDetachChildren(
    todos,
    collectTodoFamily(trashedTodos, [id]),
    timestamp,
  );
};

export const emptyTrashTodos = (
  todos: Todo[],
  timestamp: number,
): Todo[] =>
  removeTodosAndDetachChildren(
    todos,
    new Set(
      todos
        .filter((todo) => todo.trashedAt !== null)
        .map((todo) => todo.id),
    ),
    timestamp,
  );
