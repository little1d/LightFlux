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
