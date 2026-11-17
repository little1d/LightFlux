import assert from 'node:assert/strict';
import test from 'node:test';

import {
  changes,
  enabled,
  integer,
  parseArgs,
  rejectConflict,
  rejectPair,
  requireText,
  suggestFlag,
  value,
} from '../src/args.mjs';

const spec = {
  flags: {
    '--date': 'value',
    '--json': 'boolean',
    '--no-time': 'boolean',
    '--project': 'value',
    '--root': 'boolean',
    '--time': 'value',
    '--title': 'value',
  },
};

const parse = (argv) => parseArgs({ argv, spec });

test('parses value and boolean flags in either position', () => {
  const parsed = parse(['first', '--date', '2026-01-02', 'second', '--json']);
  assert.deepEqual(parsed.positionals, ['first', 'second']);
  assert.equal(value(parsed, '--date'), '2026-01-02');
  assert.equal(enabled(parsed, '--json'), true);
  assert.equal(parsed.json, true);
});

test('accepts --flag=value', () => {
  const parsed = parse(['--title=Release notes', '--json']);
  assert.equal(value(parsed, '--title'), 'Release notes');
});

test('rejects an unknown flag instead of ignoring it', () => {
  assert.throws(
    () => parse(['--dat', '2026-01-02']),
    /Unknown option --dat\. Did you mean --date\?/,
  );
});

test('rejects an unknown flag that has no close match', () => {
  assert.throws(() => parse(['--complete-on-schedule']), /Unknown option/);
});

test('rejects a value given to a boolean flag', () => {
  assert.throws(() => parse(['--json=true']), /--json does not take a value/);
});

test('rejects a repeated value flag', () => {
  assert.throws(
    () => parse(['--date', '2026-01-01', '--date=2026-02-02']),
    /--date was given more than once/,
  );
});

test('rejects a missing value', () => {
  assert.throws(() => parse(['--date']), /--date requires a value/);
  assert.throws(() => parse(['--date', '--json']), /--date requires a value/);
  assert.throws(() => parse(['--date=']), /--date requires a value/);
});

test('`--` ends flag processing so values may start with a dash', () => {
  const parsed = parse(['--', '--not-a-flag']);
  assert.deepEqual(parsed.positionals, ['--not-a-flag']);
  assert.equal(value(parsed, '--not-a-flag'), undefined);
});

test('suggests only flags within a small edit distance', () => {
  assert.equal(suggestFlag('--dat', ['--date', '--time']), '--date');
  assert.equal(suggestFlag('--totally-unrelated', ['--date', '--time']), undefined);
});

test('reports the usage line alongside the error', () => {
  const usage = 'lightflux task create <title>';
  assert.throws(
    () => parseArgs({ argv: ['--nope'], spec, usage }),
    (error) => error.message === `Unknown option --nope.\n\n${usage}`,
  );
});

test('integer keeps absent distinct from zero', () => {
  assert.equal(integer(parse([]), '--time'), undefined);
  assert.throws(() => integer(parse([]), '--time', { required: true }), /required/);
  assert.equal(integer(parse(['--time', '0']), '--time'), 0);
  assert.throws(() => integer(parse(['--time', '-1']), '--time'), /at least 0/);
  assert.throws(() => integer(parse(['--time', '1.5']), '--time'), /integer/);
});

test('changes sends only supplied flags and honours negations', () => {
  const fields = { '--time': 'scheduledTime', '--title': 'title' };
  assert.deepEqual(changes(parse(['--title', 'x']), fields), { title: 'x' });
  assert.deepEqual(changes(parse(['--no-time']), fields), { scheduledTime: null });
  assert.deepEqual(changes(parse([]), fields), {});
});

test('a supplied flag wins over its negation being absent', () => {
  const fields = { '--time': 'scheduledTime' };
  assert.deepEqual(changes(parse(['--time', '09:00']), fields), {
    scheduledTime: '09:00',
  });
});

test('rejectConflict only fires when both are present', () => {
  assert.doesNotThrow(() => rejectConflict(parse(['--time', '09:00']), '--time'));
  assert.doesNotThrow(() => rejectConflict(parse(['--no-time']), '--time'));
  assert.throws(
    () => rejectConflict(parse(['--time', '09:00', '--no-time']), '--time'),
    /Use either --time or --no-time, not both/,
  );
});

test('rejectPair catches a boolean combined with a value flag', () => {
  assert.doesNotThrow(() => rejectPair(parse(['--root']), '--root', '--project'));
  assert.throws(
    () => rejectPair(parse(['--root', '--project', 'p']), '--root', '--project'),
    /Use either --root or --project, not both/,
  );
});

test('requireText trims and rejects blanks', () => {
  assert.equal(requireText('  Prepare release  ', 'Task title'), 'Prepare release');
  assert.throws(() => requireText('   ', 'Task title'), /Task title is required/);
  assert.throws(() => requireText(undefined, 'Task ID'), /Task ID is required/);
});
