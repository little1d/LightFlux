import {
  AgentCommandError,
  AgentOperation,
  AgentOperationResult,
  AgentRisk,
  TodoCommandState,
} from './types';
import {
  Milestone,
  MilestoneDateRule,
  MilestoneType,
} from '../types/todo';
import {
  isValidMilestoneDateRule,
  normalizeReminderOffsets,
} from '../utils/milestoneDate';
import { MILESTONE_TYPE_THEME } from '../store/milestoneDomain';

type AgentMilestoneOperation = Extract<
  AgentOperation,
  {
    type:
      | 'milestone.create'
      | 'milestone.update'
      | 'milestone.archive'
      | 'milestone.restore'
      | 'milestone.trash';
  }
>;

const MAX_TITLE_LENGTH = 160;
const MAX_NOTES_LENGTH = 4000;
const MILESTONE_TYPES = new Set<MilestoneType>([
  'anniversary',
  'countdown',
  'birthday',
  'holiday',
  'custom',
]);
const MILESTONE_OPERATION_TYPES = new Set<AgentMilestoneOperation['type']>([
  'milestone.create',
  'milestone.update',
  'milestone.archive',
  'milestone.restore',
  'milestone.trash',
]);

const hasOwn = <T extends object>(value: T, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);

const fail = (
  code: ConstructorParameters<typeof AgentCommandError>[0],
  message: string,
  operationId?: string,
): never => {
  throw new AgentCommandError(code, message, operationId);
};

const validIdentifier = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= 160;

const normalizedTitle = (value: unknown, operationId: string): string => {
  if (typeof value !== 'string') {
    return fail(
      'invalid-operation',
      'Milestone title must be a string.',
      operationId,
    );
  }
  const title = value.trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    return fail(
      'invalid-operation',
      `Milestone title must contain 1-${MAX_TITLE_LENGTH} characters.`,
      operationId,
    );
  }
  return title;
};

const assertMilestoneType = (
  value: unknown,
  operationId: string,
): MilestoneType => {
  if (!MILESTONE_TYPES.has(value as MilestoneType)) {
    return fail(
      'invalid-operation',
      'Invalid milestone type.',
      operationId,
    );
  }
  return value as MilestoneType;
};

const assertDateRule = (
  value: unknown,
  operationId: string,
): MilestoneDateRule => {
  if (
    !value ||
    typeof value !== 'object' ||
    !('calendar' in value) ||
    (value.calendar !== 'solar' && value.calendar !== 'lunar')
  ) {
    return fail(
      'invalid-operation',
      'Invalid milestone date rule.',
      operationId,
    );
  }
  const rule = value as MilestoneDateRule;
  if (!isValidMilestoneDateRule(rule)) {
    return fail(
      'invalid-operation',
      'Invalid milestone date rule.',
      operationId,
    );
  }
  if (
    (rule.calendar === 'solar' &&
      rule.leapDayPolicy !== 'feb-28' &&
      rule.leapDayPolicy !== 'mar-1') ||
    (rule.calendar === 'lunar' &&
      typeof rule.isLeapMonth !== 'boolean') ||
    (rule.calendar === 'lunar' &&
      rule.missingLeapMonthPolicy !== 'regular-month' &&
      rule.missingLeapMonthPolicy !== 'skip-year')
  ) {
    return fail(
      'invalid-operation',
      'Invalid milestone date policy.',
      operationId,
    );
  }
  return { ...rule };
};

const assertStartYear = (
  value: unknown,
  operationId: string,
): number | null => {
  if (value === null) {
    return null;
  }
  if (
    !Number.isInteger(value) ||
    (value as number) < 1900 ||
    (value as number) > 2100
  ) {
    return fail(
      'invalid-operation',
      'Milestone start year must be between 1900 and 2100.',
      operationId,
    );
  }
  return value as number;
};

const assertReminderOffsets = (
  value: unknown,
  operationId: string,
): number[] => {
  if (
    !Array.isArray(value) ||
    value.length > 20 ||
    value.some(
      (item) =>
        !Number.isInteger(item) || (item as number) < 0 || (item as number) > 365,
    )
  ) {
    return fail(
      'invalid-operation',
      'Milestone reminder offsets must contain 0-365 day values.',
      operationId,
    );
  }
  return normalizeReminderOffsets(value as number[]);
};

const assertNotes = (value: unknown, operationId: string): string => {
  if (typeof value !== 'string' || value.length > MAX_NOTES_LENGTH) {
    return fail(
      'invalid-operation',
      `Milestone notes must not exceed ${MAX_NOTES_LENGTH} characters.`,
      operationId,
    );
  }
  return value.trim();
};

const assertIcon = (value: unknown, operationId: string): string => {
  if (
    typeof value !== 'string' ||
    !/^[a-z0-9-]{1,64}$/i.test(value)
  ) {
    return fail(
      'invalid-operation',
      'Invalid milestone icon.',
      operationId,
    );
  }
  return value;
};

const assertColor = (value: unknown, operationId: string): string => {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) {
    return fail(
      'invalid-operation',
      'Invalid milestone color.',
      operationId,
    );
  }
  return value.toUpperCase();
};

const assertPinned = (value: unknown, operationId: string): boolean => {
  if (typeof value !== 'boolean') {
    return fail(
      'invalid-operation',
      'Milestone pinned value must be boolean.',
      operationId,
    );
  }
  return value;
};

const milestoneById = (
  milestones: Milestone[],
  milestoneId: string,
  operationId: string,
): Milestone => {
  const milestone = milestones.find((item) => item.id === milestoneId);
  if (!milestone) {
    return fail(
      'target-not-found',
      'Milestone was not found.',
      operationId,
    );
  }
  return milestone;
};

const activeMilestone = (
  milestones: Milestone[],
  milestoneId: string,
  operationId: string,
): Milestone => {
  const milestone = milestoneById(milestones, milestoneId, operationId);
  if (milestone.trashedAt !== null) {
    return fail(
      'target-not-found',
      'Active milestone was not found.',
      operationId,
    );
  }
  return milestone;
};

const result = (
  operation: AgentMilestoneOperation,
  affectedIds: string[],
): AgentOperationResult => ({
  operationId: operation.operationId,
  idempotencyKey: operation.idempotencyKey,
  type: operation.type,
  affectedIds,
});

const applyCreate = (
  state: TodoCommandState,
  operation: Extract<
    AgentMilestoneOperation,
    { type: 'milestone.create' }
  >,
  timestamp: number,
): AgentOperationResult => {
  if (!validIdentifier(operation.milestoneId)) {
    fail(
      'invalid-operation',
      'Invalid milestone ID.',
      operation.operationId,
    );
  }
  if (
    state.milestones.some(
      (milestone) => milestone.id === operation.milestoneId,
    )
  ) {
    fail(
      'invalid-operation',
      'Milestone ID already exists.',
      operation.operationId,
    );
  }
  const milestoneType = assertMilestoneType(
    operation.milestoneType,
    operation.operationId,
  );
  const theme = MILESTONE_TYPE_THEME[milestoneType];
  const milestone: Milestone = {
    id: operation.milestoneId,
    title: normalizedTitle(operation.title, operation.operationId),
    type: milestoneType,
    dateRule: assertDateRule(operation.dateRule, operation.operationId),
    startYear:
      operation.startYear === undefined
        ? null
        : assertStartYear(operation.startYear, operation.operationId),
    reminderOffsets:
      operation.reminderOffsets === undefined
        ? []
        : assertReminderOffsets(
            operation.reminderOffsets,
            operation.operationId,
          ),
    notes:
      operation.notes === undefined
        ? ''
        : assertNotes(operation.notes, operation.operationId),
    icon:
      operation.icon === undefined
        ? theme.icon
        : assertIcon(operation.icon, operation.operationId),
    color:
      operation.color === undefined
        ? theme.color
        : assertColor(operation.color, operation.operationId),
    pinned:
      operation.pinned === undefined
        ? false
        : assertPinned(operation.pinned, operation.operationId),
    archivedAt: null,
    trashedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
  };
  state.milestones.push(milestone);
  return result(operation, [milestone.id]);
};

const applyUpdate = (
  state: TodoCommandState,
  operation: Extract<
    AgentMilestoneOperation,
    { type: 'milestone.update' }
  >,
  timestamp: number,
): AgentOperationResult => {
  const allowedFields = new Set([
    'title',
    'type',
    'dateRule',
    'startYear',
    'reminderOffsets',
    'notes',
    'icon',
    'color',
    'pinned',
  ]);
  if (
    !operation.changes ||
    typeof operation.changes !== 'object' ||
    Object.keys(operation.changes).length === 0 ||
    Object.keys(operation.changes).some((field) => !allowedFields.has(field))
  ) {
    fail(
      'invalid-operation',
      'Milestone update contains unsupported or empty changes.',
      operation.operationId,
    );
  }
  const milestone = activeMilestone(
    state.milestones,
    operation.milestoneId,
    operation.operationId,
  );
  const changes: Partial<Milestone> = {};
  if (hasOwn(operation.changes, 'title')) {
    changes.title = normalizedTitle(
      operation.changes.title,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'type')) {
    changes.type = assertMilestoneType(
      operation.changes.type,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'dateRule')) {
    changes.dateRule = assertDateRule(
      operation.changes.dateRule,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'startYear')) {
    changes.startYear = assertStartYear(
      operation.changes.startYear,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'reminderOffsets')) {
    changes.reminderOffsets = assertReminderOffsets(
      operation.changes.reminderOffsets,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'notes')) {
    changes.notes = assertNotes(
      operation.changes.notes,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'icon')) {
    changes.icon = assertIcon(
      operation.changes.icon,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'color')) {
    changes.color = assertColor(
      operation.changes.color,
      operation.operationId,
    );
  }
  if (hasOwn(operation.changes, 'pinned')) {
    changes.pinned = assertPinned(
      operation.changes.pinned,
      operation.operationId,
    );
  }
  state.milestones = state.milestones.map((item) =>
    item.id === milestone.id
      ? {
          ...item,
          ...changes,
          updatedAt: timestamp,
          revision: item.revision + 1,
        }
      : item,
  );
  return result(operation, [milestone.id]);
};

const applyArchive = (
  state: TodoCommandState,
  operation: Extract<
    AgentMilestoneOperation,
    { type: 'milestone.archive' }
  >,
  timestamp: number,
): AgentOperationResult => {
  const milestone = activeMilestone(
    state.milestones,
    operation.milestoneId,
    operation.operationId,
  );
  if (milestone.archivedAt === null) {
    state.milestones = state.milestones.map((item) =>
      item.id === milestone.id
        ? {
            ...item,
            archivedAt: timestamp,
            updatedAt: timestamp,
            revision: item.revision + 1,
          }
        : item,
    );
  }
  return result(operation, [milestone.id]);
};

const applyRestore = (
  state: TodoCommandState,
  operation: Extract<
    AgentMilestoneOperation,
    { type: 'milestone.restore' }
  >,
  timestamp: number,
): AgentOperationResult => {
  const milestone = milestoneById(
    state.milestones,
    operation.milestoneId,
    operation.operationId,
  );
  if (milestone.archivedAt !== null || milestone.trashedAt !== null) {
    state.milestones = state.milestones.map((item) =>
      item.id === milestone.id
        ? {
            ...item,
            archivedAt: null,
            trashedAt: null,
            updatedAt: timestamp,
            revision: item.revision + 1,
          }
        : item,
    );
  }
  return result(operation, [milestone.id]);
};

const applyTrash = (
  state: TodoCommandState,
  operation: Extract<
    AgentMilestoneOperation,
    { type: 'milestone.trash' }
  >,
  timestamp: number,
): AgentOperationResult => {
  const milestone = activeMilestone(
    state.milestones,
    operation.milestoneId,
    operation.operationId,
  );
  state.milestones = state.milestones.map((item) =>
    item.id === milestone.id
      ? {
          ...item,
          trashedAt: timestamp,
          updatedAt: timestamp,
          revision: item.revision + 1,
        }
      : item,
  );
  return result(operation, [milestone.id]);
};

export const isMilestoneOperation = (
  operation: AgentOperation,
): operation is AgentMilestoneOperation =>
  MILESTONE_OPERATION_TYPES.has(
    operation.type as AgentMilestoneOperation['type'],
  );

export const milestoneOperationRisk = (
  operation: AgentMilestoneOperation,
): AgentRisk => {
  switch (operation.type) {
    case 'milestone.trash':
      return 'high';
    case 'milestone.archive':
    case 'milestone.restore':
      return 'medium';
    default:
      return 'low';
  }
};

export const applyMilestoneOperation = (
  state: TodoCommandState,
  operation: AgentMilestoneOperation,
  timestamp: number,
): AgentOperationResult => {
  switch (operation.type) {
    case 'milestone.create':
      return applyCreate(state, operation, timestamp);
    case 'milestone.update':
      return applyUpdate(state, operation, timestamp);
    case 'milestone.archive':
      return applyArchive(state, operation, timestamp);
    case 'milestone.restore':
      return applyRestore(state, operation, timestamp);
    case 'milestone.trash':
      return applyTrash(state, operation, timestamp);
  }
};
