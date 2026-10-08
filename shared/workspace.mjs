import { Lunar, LunarYear } from 'lunar-typescript';

const isCurrentAppState = (value) => value?.schemaVersion === 12 && Array.isArray(value.todos) && Array.isArray(value.projects);
const randomUUID = () => globalThis.crypto.randomUUID();

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TASK_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const PRIORITIES = new Set(['none', 'high', 'medium', 'low']);
const MILESTONE_TYPES = new Set([
  'anniversary',
  'countdown',
  'birthday',
  'holiday',
  'custom',
]);
const MILESTONE_THEMES = {
  anniversary: { color: '#F28B82', icon: 'heart-outline' },
  countdown: { color: '#6D8DF5', icon: 'hourglass-outline' },
  birthday: { color: '#F2A65A', icon: 'gift-outline' },
  holiday: { color: '#55B9A5', icon: 'balloon-outline' },
  custom: { color: '#8B7EFF', icon: 'sparkles-outline' },
};
const RICH_TEXT_NODE_TYPES = new Set([
  'blockquote',
  'bulletList',
  'codeBlock',
  'doc',
  'hardBreak',
  'heading',
  'horizontalRule',
  'image',
  'listItem',
  'orderedList',
  'paragraph',
  'text',
]);
const RICH_TEXT_MARK_TYPES = new Set([
  'bold',
  'code',
  'italic',
  'link',
  'strike',
  'underline',
]);
const isDateKey = (value) => {
  if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};
const isTaskTime = (value) =>
  typeof value === 'string' && TASK_TIME_PATTERN.test(value);

export const httpError = (status, message, details = {}) => {
  const error = new Error(message);
  error.status = status;
  Object.assign(error, details);
  return error;
};


export const requireId = (value, name) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(400, `${name} is required.`);
  }
  return value.trim();
};


const taskVersion = (task) => Number(task.updatedAt);

export const publicTask = (task, revision, includeContent = false) => ({
  id: task.id,
  title: task.title,
  completed: task.completed,
  completedAt: task.completedAt,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  scheduledDate: task.scheduledDate,
  scheduledTime: task.scheduledTime ?? null,
  projectId: task.projectId,
  milestoneId: task.milestoneId ?? null,
  parentId: task.parentId ?? null,
  priority: task.priority,
  sortOrder: task.sortOrder,
  trashedAt: task.trashedAt,
  version: taskVersion(task),
  workspaceRevision: revision,
  ...(includeContent ? { content: task.content } : {}),
});

const findTask = (state, taskId) =>
  state?.todos?.find((task) => task.id === taskId) ?? null;

export const requireTask = (state, taskId) => {
  const task = findTask(state, taskId);
  if (!task) {
    throw httpError(404, 'Task not found.');
  }
  return task;
};

const requireExpectedVersion = (task, value) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw httpError(400, 'expectedVersion must be a non-negative integer.');
  }
  if (taskVersion(task) !== value) {
    throw httpError(409, 'The task has changed.', {
      code: 'version_conflict',
      currentTask: publicTask(task, null),
    });
  }
};

export const normalizeRichTextDocument = (value, allowInlineImages = false) => {
  let document;
  try {
    const serialized = JSON.stringify(value);
    if (!serialized || serialized.length > (allowInlineImages ? 16 * 1024 * 1024 : 200_000)) {
      throw new Error();
    }
    document = JSON.parse(serialized);
  } catch {
    throw httpError(400, 'Task content must be valid JSON under 200 KB.');
  }
  let nodeCount = 0;
  const visit = (node, depth) => {
    nodeCount += 1;
    if (
      depth > 20 ||
      nodeCount > 5_000 ||
      !node ||
      typeof node !== 'object' ||
      Array.isArray(node) ||
      !RICH_TEXT_NODE_TYPES.has(node.type) ||
      (node.type === 'doc' && depth !== 0)
    ) {
      throw httpError(400, 'Task content contains an invalid rich-text node.');
    }
    if (node.type === 'text' && typeof node.text !== 'string') {
      throw httpError(400, 'Rich-text text nodes require text.');
    }
    if (node.content !== undefined) {
      if (!Array.isArray(node.content)) {
        throw httpError(400, 'Rich-text node content must be an array.');
      }
      node.content.forEach((child) => visit(child, depth + 1));
    }
    if (node.marks !== undefined) {
      if (
        !Array.isArray(node.marks) ||
        node.marks.some(
          (mark) =>
            !mark ||
            typeof mark !== 'object' ||
            !RICH_TEXT_MARK_TYPES.has(mark.type),
        )
      ) {
        throw httpError(400, 'Task content contains an invalid rich-text mark.');
      }
      for (const mark of node.marks) {
        if (
          mark.type === 'link' &&
          (typeof mark.attrs?.href !== 'string' ||
            !/^(?:https?:|mailto:)/i.test(mark.attrs.href))
        ) {
          throw httpError(
            400,
            'Rich-text links require an HTTP(S) or mailto URL.',
          );
        }
      }
    }
    if (
      node.type === 'image' &&
      (typeof node.attrs?.src !== 'string' ||
        !/^https?:\/\//i.test(node.attrs.src) &&
        !(allowInlineImages && /^data:image\/(?:png|jpeg|webp|gif|avif);base64,[A-Za-z0-9+/]+=*$/i.test(node.attrs.src)))
    ) {
      throw httpError(400, 'Rich-text images require an HTTP(S) URL.');
    }
  };
  if (
    document?.type !== 'doc' ||
    !Array.isArray(document.content)
  ) {
    throw httpError(400, 'Task content must be a rich-text document.');
  }
  visit(document, 0);
  return document;
};

const findMilestone = (state, milestoneId) =>
  state?.milestones?.find((milestone) => milestone.id === milestoneId) ?? null;

export const requireMilestone = (state, milestoneId) => {
  const milestone = findMilestone(state, milestoneId);
  if (!milestone) {
    throw httpError(404, 'Milestone not found.');
  }
  return milestone;
};

export const publicMilestone = (milestone, workspaceRevision) => ({
  ...milestone,
  version: Number(milestone.revision),
  workspaceRevision,
});

const requireMilestoneVersion = (milestone, value) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw httpError(400, 'expectedVersion must be a positive integer.');
  }
  if (Number(milestone.revision) !== value) {
    throw httpError(409, 'The milestone has changed.', {
      code: 'version_conflict',
      currentMilestone: publicMilestone(milestone, null),
    });
  }
};

const validYear = (value) =>
  value === null ||
  (Number.isInteger(value) && value >= 1900 && value <= 2100);

const normalizeMilestoneDateRule = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw httpError(400, 'Milestone dateRule is required.');
  }
  const year = value.year === null ? null : Number(value.year);
  const month = Number(value.month);
  const day = Number(value.day);
  if (
    !validYear(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Number.isInteger(day) ||
    day < 1 ||
    day > (value.calendar === 'lunar' ? 30 : 31)
  ) {
    throw httpError(400, 'Milestone dateRule is invalid.');
  }
  if (value.calendar === 'solar') {
    const validationYear = year ?? 2000;
    const date = new Date(Date.UTC(validationYear, month - 1, day));
    const exactDate =
      date.getUTCFullYear() === validationYear &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    const leapDayFallback = month === 2 && day === 29;
    if (
      (!exactDate && !leapDayFallback) ||
      !['feb-28', 'mar-1'].includes(value.leapDayPolicy)
    ) {
      throw httpError(400, 'Milestone solar dateRule is invalid.');
    }
    return {
      calendar: 'solar',
      year,
      month,
      day,
      leapDayPolicy: value.leapDayPolicy,
    };
  }
  if (
    value.calendar !== 'lunar' ||
    typeof value.isLeapMonth !== 'boolean' ||
    !['regular-month', 'skip-year'].includes(value.missingLeapMonthPolicy)
  ) {
    throw httpError(400, 'Milestone lunar dateRule is invalid.');
  }
  const firstYear = year ?? 1900;
  const lastYear = year ?? 2100;
  let hasOccurrence = false;
  try {
    for (let candidateYear = firstYear; candidateYear <= lastYear; candidateYear += 1) {
      const lunarYear = LunarYear.fromYear(candidateYear);
      let candidateMonth = month;
      if (value.isLeapMonth) {
        if (lunarYear.getLeapMonth() === month) {
          candidateMonth = -month;
        } else if (value.missingLeapMonthPolicy === 'skip-year') {
          continue;
        }
      }
      const lunarMonth = lunarYear.getMonth(candidateMonth);
      if (!lunarMonth || day > lunarMonth.getDayCount()) {
        continue;
      }
      Lunar.fromYmd(candidateYear, candidateMonth, day);
      hasOccurrence = true;
      break;
    }
  } catch {
    hasOccurrence = false;
  }
  if (!hasOccurrence) {
    throw httpError(400, 'Milestone lunar dateRule has no valid occurrence.');
  }
  return {
    calendar: 'lunar',
    year,
    month,
    day,
    isLeapMonth: value.isLeapMonth,
    missingLeapMonthPolicy: value.missingLeapMonthPolicy,
  };
};

const normalizeReminderOffsets = (value) => {
  if (!Array.isArray(value)) {
    throw httpError(400, 'Milestone reminderOffsets must be an array.');
  }
  if (
    value.some(
      (offset) =>
        !Number.isInteger(offset) || offset < 0 || offset > 365,
    )
  ) {
    throw httpError(400, 'Milestone reminder offset is invalid.');
  }
  return [...new Set(value)].sort((left, right) => left - right);
};

const nextTimestamp = (task, now) =>
  Math.max(now, Number(task?.updatedAt ?? 0) + 1);

const appendEvent = (state, taskId, type, occurredAt, metadata) => {
  state.taskEvents = Array.isArray(state.taskEvents)
    ? state.taskEvents
    : [];
  state.taskEvents.push({
    id: randomUUID(),
    taskId,
    type,
    occurredAt,
    ...(metadata ? { metadata } : {}),
  });
};

const collectDescendantIds = (todos, rootId, trashed) => {
  const result = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of todos) {
      if (
        (trashed === undefined ||
          (trashed ? task.trashedAt !== null : task.trashedAt === null)) &&
        task.parentId &&
        result.has(task.parentId) &&
        !result.has(task.id)
      ) {
        result.add(task.id);
        changed = true;
      }
    }
  }
  return result;
};

export const mutateTaskState = ({ action, body, state, taskId, now, allowInlineImages = false }) => {
  if (!isCurrentAppState(state)) {
    throw httpError(409, 'The Workspace state is not a supported V12 state.');
  }
  const stateTimestamp = Math.max(
    now,
    Number(state.updatedAt ?? 0) + 1,
  );

  if (action === 'task.create') {
    const title = String(body.title ?? '').trim();
    const projectId = String(body.projectId ?? 'inbox');
    if (!title) {
      throw httpError(400, 'Task title is required.');
    }
    if (!state.projects.some((project) => project.id === projectId)) {
      throw httpError(400, 'Project not found.');
    }
    const scheduledDate = String(body.scheduledDate ?? '');
    if (!isDateKey(scheduledDate)) {
      throw httpError(400, 'scheduledDate must use YYYY-MM-DD.');
    }
    const scheduledTime = body.scheduledTime ?? null;
    if (scheduledTime !== null && !isTaskTime(scheduledTime)) {
      throw httpError(400, 'scheduledTime must use HH:mm or null.');
    }
    const priority = body.priority ?? 'none';
    if (!PRIORITIES.has(priority)) {
      throw httpError(400, 'Task priority is invalid.');
    }
    const parentId =
      body.parentId === undefined || body.parentId === null
        ? null
        : requireId(body.parentId, 'Parent task ID');
    const parent = parentId ? requireTask(state, parentId) : null;
    if (parent && parent.trashedAt !== null) {
      throw httpError(409, 'Restore the parent task before adding a subtask.');
    }
    if (parent && parent.projectId !== projectId) {
      throw httpError(400, 'A subtask must use its parent Project.');
    }
    const milestoneId =
      body.milestoneId === undefined || body.milestoneId === null
        ? null
        : requireId(body.milestoneId, 'Milestone ID');
    const milestone = milestoneId
      ? requireMilestone(state, milestoneId)
      : null;
    if (milestone && milestone.trashedAt !== null) {
      throw httpError(409, 'Restore the milestone before assigning it.');
    }
    const content =
      body.content === undefined
        ? { type: 'doc', content: [{ type: 'paragraph' }] }
        : normalizeRichTextDocument(body.content, allowInlineImages);
    const siblingSortOrder = Math.max(
      -1,
      ...state.todos
        .filter(
          (candidate) =>
            candidate.trashedAt === null &&
            candidate.projectId === projectId &&
            (candidate.parentId ?? null) === parentId,
        )
        .map((candidate) => Number(candidate.sortOrder) || 0),
    );
    const task = {
      id: body.generatedTaskId,
      title,
      completed: false,
      completedAt: null,
      createdAt: stateTimestamp,
      updatedAt: stateTimestamp,
      scheduledDate,
      scheduledTime,
      projectId,
      milestoneId,
      parentId,
      priority,
      sortOrder: siblingSortOrder + 1,
      trashedAt: null,
      content,
    };
    state.todos.push(task);
    appendEvent(state, task.id, 'created', stateTimestamp, {
      scheduledDate,
      scheduledTime,
    });
    state.updatedAt = stateTimestamp;
    return task;
  }

  const task = requireTask(state, taskId);
  requireExpectedVersion(task, body.expectedVersion);
  if (
    task.trashedAt !== null &&
    action !== 'task.restore' &&
    action !== 'task.delete'
  ) {
    throw httpError(409, 'Restore the task before changing it.');
  }
  const timestamp = nextTimestamp(task, stateTimestamp);

  if (action === 'task.update') {
    const changes = body.changes;
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      throw httpError(400, 'Task changes are required.');
    }
    const allowedChanges = new Set([
      'content',
      'milestoneId',
      'parentId',
      'priority',
      'projectId',
      'scheduledDate',
      'scheduledTime',
      'title',
    ]);
    if (
      Object.keys(changes).length === 0 ||
      Object.keys(changes).some((key) => !allowedChanges.has(key))
    ) {
      throw httpError(400, 'Task changes contain unsupported fields.');
    }
    if (changes.title !== undefined) {
      const title = String(changes.title).trim();
      if (!title) throw httpError(400, 'Task title cannot be empty.');
      task.title = title;
    }
    const previousScheduledDate = task.scheduledDate;
    const previousScheduledTime = task.scheduledTime ?? null;
    if (changes.scheduledDate !== undefined) {
      if (!isDateKey(changes.scheduledDate)) {
        throw httpError(400, 'scheduledDate must use YYYY-MM-DD.');
      }
      task.scheduledDate = changes.scheduledDate;
    }
    if (changes.scheduledTime !== undefined) {
      if (
        changes.scheduledTime !== null &&
        !isTaskTime(changes.scheduledTime)
      ) {
        throw httpError(400, 'scheduledTime must use HH:mm or null.');
      }
      task.scheduledTime = changes.scheduledTime;
    }
    if (
      previousScheduledDate !== task.scheduledDate ||
      previousScheduledTime !== (task.scheduledTime ?? null)
    ) {
      appendEvent(state, task.id, 'rescheduled', timestamp, {
        previousScheduledDate,
        scheduledDate: task.scheduledDate,
        previousScheduledTime,
        scheduledTime: task.scheduledTime ?? null,
      });
    }
    if (changes.priority !== undefined) {
      if (!PRIORITIES.has(changes.priority)) {
        throw httpError(400, 'Task priority is invalid.');
      }
      task.priority = changes.priority;
    }
    let nextProjectId =
      changes.projectId === undefined ? task.projectId : changes.projectId;
    let nextParentId =
      changes.parentId === undefined ? task.parentId : changes.parentId;
    if (nextParentId !== null && typeof nextParentId !== 'string') {
      throw httpError(400, 'parentId must be a task ID or null.');
    }
    const branchIds = collectDescendantIds(
      state.todos,
      task.id,
      false,
    );
    if (
      changes.parentId === undefined &&
      changes.projectId !== undefined &&
      nextParentId &&
      findTask(state, nextParentId)?.projectId !== nextProjectId
    ) {
      nextParentId = null;
    }
    if (nextParentId) {
      if (branchIds.has(nextParentId)) {
        throw httpError(400, 'A task cannot be its own descendant.');
      }
      const parent = requireTask(state, nextParentId);
      if (parent.trashedAt !== null) {
        throw httpError(409, 'Restore the parent task before reparenting.');
      }
      if (
        changes.projectId !== undefined &&
        changes.projectId !== parent.projectId
      ) {
        throw httpError(400, 'A subtask must use its parent Project.');
      }
      nextProjectId = parent.projectId;
    }
    if (
      !state.projects.some((project) => project.id === nextProjectId)
    ) {
      throw httpError(400, 'Project not found.');
    }
    if (nextProjectId !== task.projectId) {
      const branchIds = collectDescendantIds(
        state.todos,
        task.id,
        false,
      );
      for (const branchTask of state.todos) {
        if (branchIds.has(branchTask.id)) {
          branchTask.projectId = nextProjectId;
          branchTask.updatedAt = timestamp;
        }
      }
    }
    task.parentId = nextParentId;
    if (changes.milestoneId !== undefined) {
      if (changes.milestoneId === null) {
        task.milestoneId = null;
      } else {
        const milestone = requireMilestone(
          state,
          requireId(changes.milestoneId, 'Milestone ID'),
        );
        if (milestone.trashedAt !== null) {
          throw httpError(409, 'Restore the milestone before assigning it.');
        }
        task.milestoneId = milestone.id;
      }
    }
    if (changes.content !== undefined) {
      task.content = normalizeRichTextDocument(changes.content, allowInlineImages);
    }
    task.updatedAt = timestamp;
  } else if (action === 'task.complete' || action === 'task.reopen') {
    const completed = action === 'task.complete';
    if (task.completed !== completed) {
      task.completed = completed;
      task.completedAt = completed ? timestamp : null;
      task.updatedAt = timestamp;
      appendEvent(
        state,
        task.id,
        completed ? 'completed' : 'reopened',
        timestamp,
      );
    }
  } else if (action === 'task.trash') {
    const branchIds = collectDescendantIds(state.todos, task.id, false);
    for (const branchTask of state.todos) {
      if (branchIds.has(branchTask.id) && branchTask.trashedAt === null) {
        branchTask.trashedAt = timestamp;
        branchTask.updatedAt = timestamp;
        appendEvent(state, branchTask.id, 'trashed', timestamp);
      }
    }
  } else if (action === 'task.delete') {
    const branchIds = collectDescendantIds(state.todos, task.id);
    state.todos = state.todos.filter(
      (branchTask) => !branchIds.has(branchTask.id),
    );
    state.taskEvents = state.taskEvents.filter(
      (event) => !branchIds.has(event.taskId),
    );
  } else if (action === 'task.restore') {
    if (task.trashedAt !== null) {
      const branchIds = collectDescendantIds(state.todos, task.id, true);
      const parentWillBeActive =
        !task.parentId ||
        state.todos.some(
          (candidate) =>
            candidate.id === task.parentId &&
            (candidate.trashedAt === null || branchIds.has(candidate.id)),
        );
      for (const branchTask of state.todos) {
        if (branchIds.has(branchTask.id)) {
          if (branchTask.id === task.id && !parentWillBeActive) {
            branchTask.parentId = null;
          }
          branchTask.trashedAt = null;
          branchTask.updatedAt = timestamp;
          appendEvent(state, branchTask.id, 'restored', timestamp);
        }
      }
    }
  } else {
    throw httpError(400, 'Unsupported task action.');
  }

  state.updatedAt = Math.max(Number(state.updatedAt ?? 0) + 1, timestamp);
  return task;
};

export const mutateMilestoneState = ({
  action,
  body,
  milestoneId,
  now,
  state,
}) => {
  if (!isCurrentAppState(state)) {
    throw httpError(409, 'The Workspace state is not a supported V12 state.');
  }
  state.milestones = Array.isArray(state.milestones)
    ? state.milestones
    : [];
  const stateTimestamp = Math.max(
    now,
    Number(state.updatedAt ?? 0) + 1,
  );

  if (action === 'milestone.create') {
    const title = String(body.title ?? '').trim();
    const type = String(body.type ?? 'custom');
    if (!title || title.length > 120) {
      throw httpError(400, 'Milestone title must contain 1 to 120 characters.');
    }
    if (!MILESTONE_TYPES.has(type)) {
      throw httpError(400, 'Milestone type is invalid.');
    }
    const startYear =
      body.startYear === undefined || body.startYear === null
        ? null
        : Number(body.startYear);
    if (!validYear(startYear)) {
      throw httpError(400, 'Milestone startYear is invalid.');
    }
    const notes = String(body.notes ?? '').trim();
    if (notes.length > 500) {
      throw httpError(400, 'Milestone notes cannot exceed 500 characters.');
    }
    const theme = MILESTONE_THEMES[type];
    const color = String(body.color ?? theme.color);
    if (!/^#[0-9A-F]{6}$/i.test(color)) {
      throw httpError(400, 'Milestone color must use #RRGGBB.');
    }
    const icon = String(body.icon ?? theme.icon).trim();
    if (!icon || icon.length > 80) {
      throw httpError(400, 'Milestone icon is invalid.');
    }
    if (body.pinned !== undefined && typeof body.pinned !== 'boolean') {
      throw httpError(400, 'Milestone pinned must be boolean.');
    }
    const milestone = {
      id: body.generatedMilestoneId,
      title,
      type,
      dateRule: normalizeMilestoneDateRule(body.dateRule),
      startYear,
      reminderOffsets: normalizeReminderOffsets(
        body.reminderOffsets ?? [],
      ),
      notes,
      icon,
      color,
      pinned: body.pinned === true,
      archivedAt: null,
      trashedAt: null,
      createdAt: stateTimestamp,
      updatedAt: stateTimestamp,
      revision: 1,
    };
    state.milestones.push(milestone);
    state.updatedAt = stateTimestamp;
    return milestone;
  }

  const milestone = requireMilestone(state, milestoneId);
  requireMilestoneVersion(milestone, body.expectedVersion);
  if (milestone.trashedAt !== null && action !== 'milestone.restore') {
    throw httpError(409, 'Restore the milestone before changing it.');
  }
  const timestamp = Math.max(
    stateTimestamp,
    Number(milestone.updatedAt ?? 0) + 1,
  );

  if (action === 'milestone.update') {
    const changes = body.changes;
    if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
      throw httpError(400, 'Milestone changes are required.');
    }
    const allowedChanges = new Set([
      'color',
      'dateRule',
      'icon',
      'notes',
      'pinned',
      'reminderOffsets',
      'startYear',
      'title',
      'type',
    ]);
    if (
      Object.keys(changes).length === 0 ||
      Object.keys(changes).some((key) => !allowedChanges.has(key))
    ) {
      throw httpError(400, 'Milestone changes contain unsupported fields.');
    }
    if (changes.title !== undefined) {
      const title = String(changes.title).trim();
      if (!title || title.length > 120) {
        throw httpError(
          400,
          'Milestone title must contain 1 to 120 characters.',
        );
      }
      milestone.title = title;
    }
    if (changes.type !== undefined) {
      if (!MILESTONE_TYPES.has(changes.type)) {
        throw httpError(400, 'Milestone type is invalid.');
      }
      milestone.type = changes.type;
    }
    if (changes.dateRule !== undefined) {
      milestone.dateRule = normalizeMilestoneDateRule(changes.dateRule);
    }
    if (changes.startYear !== undefined) {
      const startYear =
        changes.startYear === null ? null : Number(changes.startYear);
      if (!validYear(startYear)) {
        throw httpError(400, 'Milestone startYear is invalid.');
      }
      milestone.startYear = startYear;
    }
    if (changes.reminderOffsets !== undefined) {
      milestone.reminderOffsets = normalizeReminderOffsets(
        changes.reminderOffsets,
      );
    }
    if (changes.notes !== undefined) {
      const notes = String(changes.notes).trim();
      if (notes.length > 500) {
        throw httpError(400, 'Milestone notes cannot exceed 500 characters.');
      }
      milestone.notes = notes;
    }
    if (changes.icon !== undefined) {
      const icon = String(changes.icon).trim();
      if (!icon || icon.length > 80) {
        throw httpError(400, 'Milestone icon is invalid.');
      }
      milestone.icon = icon;
    }
    if (changes.color !== undefined) {
      if (!/^#[0-9A-F]{6}$/i.test(changes.color)) {
        throw httpError(400, 'Milestone color must use #RRGGBB.');
      }
      milestone.color = changes.color;
    }
    if (changes.pinned !== undefined) {
      if (typeof changes.pinned !== 'boolean') {
        throw httpError(400, 'Milestone pinned must be boolean.');
      }
      milestone.pinned = changes.pinned;
    }
  } else if (action === 'milestone.archive') {
    milestone.archivedAt = timestamp;
  } else if (action === 'milestone.unarchive') {
    milestone.archivedAt = null;
  } else if (action === 'milestone.trash') {
    milestone.trashedAt = timestamp;
  } else if (action === 'milestone.restore') {
    milestone.trashedAt = null;
  } else {
    throw httpError(400, 'Unsupported milestone action.');
  }

  milestone.updatedAt = timestamp;
  milestone.revision = Number(milestone.revision) + 1;
  state.updatedAt = Math.max(Number(state.updatedAt ?? 0) + 1, timestamp);
  return milestone;
};

export const PROJECT_COLORS = [
  '#8B7EFF',
  '#55B9A5',
  '#EEA45E',
  '#6EA7E8',
  '#DD7C91',
];
const INBOX_PROJECT_ID = 'inbox';
const PROJECT_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const MAX_PROJECT_NAME_LENGTH = 100;

const findProject = (state, projectId) =>
  state?.projects?.find((project) => project.id === projectId) ?? null;

export const requireProject = (state, projectId) => {
  const project = findProject(state, projectId);
  if (!project) {
    throw httpError(404, 'Project not found.');
  }
  return project;
};

const inboxProject = (state) =>
  state.projects.find((project) => project.kind === 'inbox') ??
  findProject(state, INBOX_PROJECT_ID);

const orderedProjects = (state) =>
  [...state.projects].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      Number(left.createdAt ?? 0) - Number(right.createdAt ?? 0),
  );

// Reassign dense sortOrder values while keeping the reserved Inbox pinned first.
const normalizeProjectOrder = (projects) =>
  projects.map((project, index) => ({ ...project, sortOrder: index }));

export const publicProject = (project, revision) => ({
  id: project.id,
  name: project.name,
  color: project.color,
  kind: project.kind,
  sortOrder: project.sortOrder,
  createdAt: project.createdAt,
  workspaceRevision: revision,
});

export const mutateProjectState = ({
  action,
  body,
  projectId,
  now,
  state,
}) => {
  if (!isCurrentAppState(state)) {
    throw httpError(409, 'The Workspace state is not a supported V12 state.');
  }
  const timestamp = typeof now === 'function' ? now() : now;

  if (action === 'project.create') {
    const name = requireId(body.name, 'Project name');
    if (name.length > MAX_PROJECT_NAME_LENGTH) {
      throw httpError(400, 'Project name is too long.');
    }
    const id = requireId(body.generatedProjectId, 'Project id');
    if (findProject(state, id)) {
      throw httpError(409, 'Project already exists.');
    }
    const color = body.color ?? PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length];
    if (typeof color !== 'string' || !PROJECT_COLOR_PATTERN.test(color)) {
      throw httpError(400, 'Invalid project color.');
    }
    const project = {
      id,
      name,
      color: color.toUpperCase(),
      createdAt: timestamp,
      kind: 'standard',
      sortOrder:
        Math.max(0, ...state.projects.map((item) => item.sortOrder)) + 1,
    };
    const anchorId =
      typeof body.afterProjectId === 'string' ? body.afterProjectId : null;
    if (anchorId) {
      const anchor = findProject(state, anchorId);
      if (!anchor) {
        throw httpError(400, 'Anchor project not found.');
      }
      const ordered = orderedProjects(state);
      const anchorIndex = ordered.findIndex((item) => item.id === anchorId);
      ordered.splice(anchorIndex + 1, 0, project);
      state.projects = normalizeProjectOrder(ordered);
    } else {
      state.projects = [...state.projects, project];
    }
    state.updatedAt = Math.max(Number(state.updatedAt ?? 0) + 1, timestamp);
    return project;
  }

  const project = requireProject(state, projectId);
  if (project.kind === 'inbox') {
    throw httpError(400, 'The Inbox project is reserved and cannot be changed.');
  }

  if (action === 'project.update') {
    if (body.name !== undefined) {
      const name = requireId(body.name, 'Project name');
      if (name.length > MAX_PROJECT_NAME_LENGTH) {
        throw httpError(400, 'Project name is too long.');
      }
      project.name = name;
    }
    if (body.color !== undefined) {
      if (
        typeof body.color !== 'string' ||
        !PROJECT_COLOR_PATTERN.test(body.color)
      ) {
        throw httpError(400, 'Invalid project color.');
      }
      project.color = body.color.toUpperCase();
    }
  } else if (action === 'project.reorder') {
    const standards = state.projects
      .filter((item) => item.kind !== 'inbox')
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          Number(left.createdAt ?? 0) - Number(right.createdAt ?? 0),
      );
    const from = standards.findIndex((item) => item.id === projectId);
    if (!Number.isInteger(body.position)) {
      throw httpError(400, 'Project position must be an integer.');
    }
    const to = Math.max(0, Math.min(body.position, standards.length - 1));
    if (from !== to) {
      const [moved] = standards.splice(from, 1);
      standards.splice(to, 0, moved);
      const inbox = inboxProject(state);
      state.projects = normalizeProjectOrder(
        inbox ? [inbox, ...standards] : standards,
      );
    }
  } else if (action === 'project.delete') {
    const inbox = inboxProject(state);
    if (!inbox) {
      throw httpError(409, 'Inbox project is missing.');
    }
    // Deleting a project rehomes every task (including its subtasks) to Inbox;
    // the project is removed but no task is silently discarded.
    for (const task of state.todos) {
      if (task.projectId === projectId) {
        task.projectId = inbox.id;
        task.updatedAt = timestamp;
      }
    }
    state.projects = state.projects.filter((item) => item.id !== projectId);
  } else {
    throw httpError(400, 'Unsupported project action.');
  }

  state.updatedAt = Math.max(Number(state.updatedAt ?? 0) + 1, timestamp);
  return project;
};
