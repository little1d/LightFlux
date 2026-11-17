import {
  changes,
  enabled,
  integer,
  parseArgs,
  rejectPair,
  requireText,
  value,
} from '../args.mjs';
import { emit, rows } from '../format.mjs';
import { milestoneDateRule, reminderOffsets } from '../milestone.mjs';
import { confirmDestructive, newIdempotencyKey } from '../session.mjs';

const IDENTITY = {
  '--idempotency-key': 'value',
  '--json': 'boolean',
};

const APPEARANCE = {
  '--color': 'value',
  '--icon': 'value',
  '--notes': 'value',
  '--pinned': 'boolean',
  '--reminders': 'value',
  '--title': 'value',
  '--unpinned': 'boolean',
};

const SCHEDULE = {
  '--date': 'value',
  '--leap-day-policy': 'value',
  '--leap-month': 'boolean',
  '--lunar': 'boolean',
  '--missing-leap-month-policy': 'value',
  '--no-start-year': 'boolean',
  '--start-year': 'value',
  '--yearly': 'boolean',
};

const MUTATION = {
  '--expected-version': 'value',
  '--yes': 'boolean',
};

export const specs = {
  archive: {
    flags: { ...MUTATION, '--idempotency-key': 'value', '--json': 'boolean' },
    usage: 'lightflux milestone archive <id> --expected-version <n>',
  },
  create: {
    flags: {
      ...IDENTITY,
      ...APPEARANCE,
      ...SCHEDULE,
      '--date': 'value',
      '--type': 'value',
    },
    usage: 'lightflux milestone create <title> --date <YYYY-MM-DD|MM-DD> [options]',
  },
  list: {
    flags: {
      '--archived': 'boolean',
      '--json': 'boolean',
      '--trash': 'boolean',
    },
    usage: 'lightflux milestone list [--archived] [--trash] [--json]',
  },
  restore: {
    flags: { ...MUTATION, '--idempotency-key': 'value', '--json': 'boolean' },
    usage: 'lightflux milestone restore <id> --expected-version <n>',
  },
  show: {
    flags: { '--json': 'boolean' },
    usage: 'lightflux milestone show <id> [--json]',
  },
  trash: {
    flags: { ...MUTATION, '--idempotency-key': 'value', '--json': 'boolean' },
    usage: 'lightflux milestone trash <id> --expected-version <n> [--yes]',
  },
  unarchive: {
    flags: { ...MUTATION, '--idempotency-key': 'value', '--json': 'boolean' },
    usage: 'lightflux milestone unarchive <id> --expected-version <n>',
  },
  update: {
    flags: { ...MUTATION, ...IDENTITY, ...APPEARANCE, ...SCHEDULE },
    usage: 'lightflux milestone update <id> --expected-version <n> [changes]',
  },
};

const scalarFields = {
  '--color': 'color',
  '--icon': 'icon',
  '--notes': 'notes',
  '--title': 'title',
  '--type': 'type',
};

const dateRule = (parsed) => {
  const date = value(parsed, '--date');
  if (date === undefined) {
    return {};
  }
  return {
    dateRule: milestoneDateRule({
      date,
      leapDayPolicy: value(parsed, '--leap-day-policy'),
      leapMonth: enabled(parsed, '--leap-month'),
      lunar: enabled(parsed, '--lunar'),
      missingLeapMonthPolicy: value(parsed, '--missing-leap-month-policy'),
      yearly: enabled(parsed, '--yearly'),
    }),
  };
};

const milestoneChanges = (parsed, { dateRequired = false } = {}) => {
  rejectPair(parsed, '--pinned', '--unpinned');
  if (dateRequired && value(parsed, '--date') === undefined) {
    throw new Error('--date is required for milestone creation.');
  }

  const body = changes(parsed, scalarFields);
  const rule = dateRule(parsed);
  if (rule.dateRule) {
    body.dateRule = rule.dateRule;
  }

  const startYear = value(parsed, '--start-year');
  if (startYear !== undefined) {
    body.startYear = integer(parsed, '--start-year');
  } else if (enabled(parsed, '--no-start-year')) {
    body.startYear = null;
  }

  const reminders = reminderOffsets(value(parsed, '--reminders'));
  if (reminders !== undefined) {
    body.reminderOffsets = reminders;
  }

  if (enabled(parsed, '--pinned')) {
    body.pinned = true;
  } else if (enabled(parsed, '--unpinned')) {
    body.pinned = false;
  }

  return body;
};

const summary = (milestone) =>
  `${milestone.id}\tv${milestone.version}\t${milestone.type}\t${milestone.title}`;

const list = async ({ client, config, parsed }) => {
  const result = await client.listMilestones(config.workspaceId, {
    includeArchived: enabled(parsed, '--archived'),
    includeTrash: enabled(parsed, '--trash'),
  });
  emit(result, parsed.json, (payload) =>
    rows(payload.milestones.map(summary)),
  );
};

const show = async ({ client, parsed }) => {
  const milestoneId = requireText(parsed.positionals[0], 'Milestone ID');
  const result = await client.showMilestone(milestoneId);
  emit(result, parsed.json, (payload) => summary(payload.milestone));
};

const create = async ({ client, config, parsed }) => {
  const title = requireText(parsed.positionals.join(' '), 'Milestone title');
  const result = await client.createMilestone(
    config.workspaceId,
    {
      ...milestoneChanges(parsed, { dateRequired: true }),
      title,
      type: value(parsed, '--type') ?? 'custom',
    },
    value(parsed, '--idempotency-key') ?? newIdempotencyKey(),
  );
  emit(
    result,
    parsed.json,
    (payload) =>
      `Created milestone ${payload.milestone.id}: ${payload.milestone.title}`,
  );
};

const mutate = async ({ action, client, parsed }) => {
  const milestoneId = requireText(parsed.positionals[0], 'Milestone ID');
  const expectedVersion = integer(parsed, '--expected-version', {
    required: true,
  });
  const idempotencyKey =
    value(parsed, '--idempotency-key') ?? newIdempotencyKey();

  if (action === 'update') {
    const updated = milestoneChanges(parsed);
    if (Object.keys(updated).length === 0) {
      throw new Error('Milestone update requires at least one change.');
    }
    const result = await client.mutateMilestone(
      milestoneId,
      { action: 'milestone.update', changes: updated, expectedVersion },
      idempotencyKey,
    );
    return emit(
      result,
      parsed.json,
      (payload) =>
        `Updated milestone ${payload.milestone.id} to v${payload.milestone.version}.`,
    );
  }

  if (action === 'trash') {
    const proceed = await confirmDestructive({
      command: 'Milestone trash',
      message: `Move milestone ${milestoneId} to trash?`,
      yes: enabled(parsed, '--yes'),
    });
    if (!proceed) {
      return undefined;
    }
  }

  const result = await client.mutateMilestone(
    milestoneId,
    { action: `milestone.${action}`, expectedVersion },
    idempotencyKey,
  );
  return emit(
    result,
    parsed.json,
    (payload) =>
      `Updated milestone ${payload.milestone.id} to v${payload.milestone.version}.`,
  );
};

const HANDLERS = { create, list, show };

/** Resolves one `lightflux milestone ...` subcommand and parses its flags. */
export const prepare = ({ action, argv }) => {
  const spec = specs[action];
  if (!spec) {
    throw new Error(`Unknown milestone command: ${action ?? ''}`);
  }
  const parsed = parseArgs({ argv, spec, usage: spec.usage });
  const requiresId = !['create', 'list'].includes(action);
  if (requiresId) {
    requireText(parsed.positionals[0], 'Milestone ID');
    integer(parsed, '--expected-version', { required: true });
  }
  if (action === 'update') {
    milestoneChanges(parsed);
  }
  return { action, parsed };
};

/** Runs a prepared subcommand against an open session. */
export const run = async ({ action, client, config, parsed }) =>
  (HANDLERS[action] ?? mutate)({ action, client, config, parsed });
