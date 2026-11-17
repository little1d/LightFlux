/**
 * Command-line parsing for LightFlux.
 *
 * Every flag the CLI understands is declared once, with its kind. Parsing is
 * strict on purpose: a mistyped flag on a mutating command used to be ignored
 * silently, so `task create "x" --dat 2026-01-01` quietly scheduled the task
 * for today. Unknown flags, duplicate value flags and missing values now fail
 * before any request is sent.
 */

// A fixed threshold suggests "--date" for "--dinner". Scaling with the name
// length keeps short flags strict and long ones forgiving.
const editDistanceLimit = (name) => Math.max(1, Math.floor(name.length / 4));

const levenshtein = (left, right) => {
  const rows = Array.from({ length: left.length + 1 }, (_, row) =>
    Array.from({ length: right.length + 1 }, (_, column) =>
      row === 0 ? column : column === 0 ? row : 0,
    ),
  );
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = left[row - 1] === right[column - 1] ? 0 : 1;
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + substitution,
      );
    }
  }
  return rows[left.length][right.length];
};

/** Returns the closest known flag name for a typo, when it is close enough. */
export const suggestFlag = (unknown, known) => {
  let best;
  let bestDistance = Infinity;
  for (const candidate of known) {
    const distance = levenshtein(unknown, candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return bestDistance <= editDistanceLimit(unknown) ? best : undefined;
};

/**
 * Parses `argv` against a command spec.
 *
 * `spec.flags` maps every accepted flag to `'boolean'` or `'value'`. Both
 * `--date=value` and `--date value` are accepted, and `--` ends flag
 * processing so a value may begin with a dash.
 */
export const parseArgs = ({ argv, spec, usage }) => {
  const flags = new Map();
  const positionals = [];
  let literal = false;

  const reject = (message) => {
    throw new Error(usage ? `${message}\n\n${usage}` : message);
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (literal) {
      positionals.push(token);
      continue;
    }
    if (token === '--') {
      literal = true;
      continue;
    }
    if (!token.startsWith('--')) {
      positionals.push(token);
      continue;
    }

    const separator = token.indexOf('=');
    const name = separator === -1 ? token : token.slice(0, separator);
    let value = separator === -1 ? undefined : token.slice(separator + 1);
    const kind = spec.flags[name];

    if (!kind) {
      const suggestion = suggestFlag(name, Object.keys(spec.flags));
      reject(
        `Unknown option ${name}.${suggestion ? ` Did you mean ${suggestion}?` : ''}`,
      );
    }

    if (kind === 'boolean') {
      if (value !== undefined) {
        reject(`${name} does not take a value.`);
      }
      if (flags.get(name)) {
        reject(`${name} was given more than once.`);
      }
      flags.set(name, true);
      continue;
    }

    if (value === undefined) {
      const next = argv[index + 1];
      if (next === undefined || next === '--' || next.startsWith('--')) {
        reject(`${name} requires a value.`);
      }
      value = next;
      index += 1;
    } else if (value === '') {
      reject(`${name} requires a value.`);
    }

    if (flags.has(name)) {
      reject(`${name} was given more than once.`);
    }
    flags.set(name, value);
  }

  return {
    flags,
    json: flags.get('--json') === true,
    positionals,
    usage,
  };
};

/** Reads a value flag, or `undefined` when it was not supplied. */
export const value = (parsed, name) => parsed.flags.get(name);

/** Reads a boolean flag. */
export const enabled = (parsed, name) => parsed.flags.get(name) === true;

/** Reads an integer flag, keeping `undefined` distinct from `0`. */
export const integer = (parsed, name, { required = false, min = 0 } = {}) => {
  const raw = value(parsed, name);
  if (raw === undefined) {
    if (required) {
      throw new Error(`${name} is required.`);
    }
    return undefined;
  }
  const result = Number(raw);
  if (!Number.isSafeInteger(result) || result < min) {
    throw new Error(`${name} must be an integer of at least ${min}.`);
  }
  return result;
};

/**
 * Builds a partial mutation body from the flags that were supplied, so
 * `task update` sends only what changed.
 *
 * `fields` maps a flag to the body property it sets. A flag paired with a
 * `--no-` negation sends `null` when the negation is present instead.
 */
export const changes = (parsed, fields) => {
  const body = {};
  for (const [flag, property] of Object.entries(fields)) {
    const raw = value(parsed, flag);
    if (raw !== undefined) {
      body[property] = raw;
      continue;
    }
    if (enabled(parsed, `--no-${flag.slice(2)}`)) {
      body[property] = null;
    }
  }
  return body;
};

/** Throws unless `input` is a non-empty string, returning it trimmed. */
export const requireText = (input, name) => {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error(`${name} is required.`);
  }
  return input.trim();
};

/** Rejects `--time` given together with `--no-time`. */
export const rejectConflict = (parsed, flag) => {
  if (value(parsed, flag) !== undefined && enabled(parsed, `--no-${flag.slice(2)}`)) {
    throw new Error(`Use either ${flag} or --no-${flag.slice(2)}, not both.`);
  }
};

/** Rejects a pair of flags that cannot be combined (`--root` with `--parent`). */
export const rejectPair = (parsed, left, right) => {
  if (enabled(parsed, left) && value(parsed, right) !== undefined) {
    throw new Error(`Use either ${left} or ${right}, not both.`);
  }
};
