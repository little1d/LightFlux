import {
  Milestone,
  PersistedAppState,
  Todo,
  TodoGroup,
} from '../types/todo';

export const deriveStateUpdatedAt = (
  todos: Todo[],
  groups: TodoGroup[],
  milestones: Milestone[],
  value: unknown,
): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }

  return Math.max(
    0,
    ...todos.map((todo) => todo.updatedAt),
    ...groups.map((group) => group.createdAt),
    ...milestones.map((milestone) => milestone.updatedAt),
  );
};

export const selectLatestAppState = (
  deviceState: PersistedAppState | null,
  remoteState: PersistedAppState | null,
): PersistedAppState | null => {
  if (!deviceState) {
    return remoteState;
  }
  if (!remoteState) {
    return deviceState;
  }

  return remoteState.updatedAt > deviceState.updatedAt
    ? remoteState
    : deviceState;
};

const serialized = (value: unknown): string =>
  value === undefined
    ? ''
    : JSON.stringify(value, (_key, nestedValue) =>
        nestedValue &&
        typeof nestedValue === 'object' &&
        !Array.isArray(nestedValue)
          ? Object.fromEntries(
              Object.entries(nestedValue).sort(([left], [right]) =>
                left.localeCompare(right),
              ),
            )
          : nestedValue,
      );

const equal = (left: unknown, right: unknown): boolean =>
  serialized(left) === serialized(right);

export const appStatesEqual = (
  left: PersistedAppState | null,
  right: PersistedAppState | null,
): boolean => equal(left, right);

const chooseConcurrentValue = <T>(
  base: T | undefined,
  local: T | undefined,
  remote: T | undefined,
  localUpdatedAt: number,
  remoteUpdatedAt: number,
): T | undefined => {
  if (equal(local, remote)) {
    return local;
  }
  if (equal(local, base)) {
    return remote;
  }
  if (equal(remote, base)) {
    return local;
  }
  if (localUpdatedAt !== remoteUpdatedAt) {
    return localUpdatedAt > remoteUpdatedAt ? local : remote;
  }
  return serialized(local) >= serialized(remote) ? local : remote;
};

const mergeRecords = <T extends { id: string }>(
  base: T[],
  local: T[],
  remote: T[],
  localStateUpdatedAt: number,
  remoteStateUpdatedAt: number,
  recordUpdatedAt: (record: T | undefined, stateUpdatedAt: number) => number,
): T[] => {
  const baseById = new Map(base.map((record) => [record.id, record]));
  const localById = new Map(local.map((record) => [record.id, record]));
  const remoteById = new Map(remote.map((record) => [record.id, record]));
  const orderedIds = [
    ...new Set([
      ...local.map((record) => record.id),
      ...remote.map((record) => record.id),
      ...base.map((record) => record.id),
    ]),
  ];

  return orderedIds.flatMap((id) => {
    const localRecord = localById.get(id);
    const remoteRecord = remoteById.get(id);
    const selected = chooseConcurrentValue(
      baseById.get(id),
      localRecord,
      remoteRecord,
      recordUpdatedAt(localRecord, localStateUpdatedAt),
      recordUpdatedAt(remoteRecord, remoteStateUpdatedAt),
    );
    return selected ? [selected] : [];
  });
};

export const mergeConcurrentAppStates = (
  baseState: PersistedAppState | null,
  localState: PersistedAppState,
  remoteState: PersistedAppState,
  now = Date.now(),
): PersistedAppState => {
  const base = baseState;
  const localUpdatedAt = localState.updatedAt;
  const remoteUpdatedAt = remoteState.updatedAt;
  const todos = mergeRecords(
    base?.todos ?? [],
    localState.todos,
    remoteState.todos,
    localUpdatedAt,
    remoteUpdatedAt,
    (todo, stateUpdatedAt) => todo?.updatedAt ?? stateUpdatedAt,
  );
  const groups = mergeRecords(
    base?.groups ?? [],
    localState.groups,
    remoteState.groups,
    localUpdatedAt,
    remoteUpdatedAt,
    (_group, stateUpdatedAt) => stateUpdatedAt,
  );
  const milestones = mergeRecords(
    base?.milestones ?? [],
    localState.milestones,
    remoteState.milestones,
    localUpdatedAt,
    remoteUpdatedAt,
    (milestone, stateUpdatedAt) =>
      milestone?.updatedAt ?? stateUpdatedAt,
  );
  const taskEvents = mergeRecords(
    base?.taskEvents ?? [],
    localState.taskEvents,
    remoteState.taskEvents,
    localUpdatedAt,
    remoteUpdatedAt,
    (event, stateUpdatedAt) => event?.occurredAt ?? stateUpdatedAt,
  ).sort(
    (left, right) =>
      left.occurredAt - right.occurredAt || left.id.localeCompare(right.id),
  );
  const groupIds = new Set(groups.map((group) => group.id));
  const milestoneIds = new Set(
    milestones.map((milestone) => milestone.id),
  );
  const normalizedReferences = todos.map((todo) => ({
      ...todo,
      groupId:
        todo.groupId && groupIds.has(todo.groupId) ? todo.groupId : null,
      milestoneId:
        todo.milestoneId && milestoneIds.has(todo.milestoneId)
          ? todo.milestoneId
          : null,
    }));
  const todoById = new Map(
    normalizedReferences.map((todo) => [todo.id, todo]),
  );
  const normalizedTodos = normalizedReferences.map((todo) => {
    const parent = todo.parentId ? todoById.get(todo.parentId) : undefined;
    return {
      ...todo,
      parentId:
        parent && parent.id !== todo.id && parent.groupId === todo.groupId
          ? parent.id
          : null,
    };
  });
  const normalizedTodoById = new Map(
    normalizedTodos.map((todo) => [todo.id, todo]),
  );
  const cycleBreakIds = new Set<string>();
  for (const startId of [...normalizedTodoById.keys()].sort()) {
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let currentId: string | null = startId;
    while (currentId) {
      const cycleStart = pathIndex.get(currentId);
      if (cycleStart !== undefined) {
        const cycle = path.slice(cycleStart).sort();
        cycleBreakIds.add(cycle[cycle.length - 1]);
        break;
      }
      pathIndex.set(currentId, path.length);
      path.push(currentId);
      currentId = normalizedTodoById.get(currentId)?.parentId ?? null;
    }
  }
  const acyclicTodos = normalizedTodos.map((todo) =>
    cycleBreakIds.has(todo.id) ? { ...todo, parentId: null } : todo,
  );
  const chooseTopLevel = <T>(
    baseValue: T | undefined,
    localValue: T,
    remoteValue: T,
  ): T =>
    chooseConcurrentValue(
      baseValue,
      localValue,
      remoteValue,
      localUpdatedAt,
      remoteUpdatedAt,
    ) ?? localValue;

  return {
    schemaVersion: 10,
    updatedAt: Math.max(
      now,
      localUpdatedAt + 1,
      remoteUpdatedAt + 1,
    ),
    analyticsStartedAt: Math.min(
      localState.analyticsStartedAt,
      remoteState.analyticsStartedAt,
    ),
    language: chooseTopLevel(
      base?.language,
      localState.language,
      remoteState.language,
    ),
    navigationOrder: chooseTopLevel(
      base?.navigationOrder,
      localState.navigationOrder,
      remoteState.navigationOrder,
    ),
    hiddenNavigationItems: chooseTopLevel(
      base?.hiddenNavigationItems,
      localState.hiddenNavigationItems,
      remoteState.hiddenNavigationItems,
    ),
    ungroupedName: chooseTopLevel(
      base?.ungroupedName,
      localState.ungroupedName,
      remoteState.ungroupedName,
    ),
    todos: acyclicTodos,
    groups,
    milestones,
    taskEvents,
  };
};
