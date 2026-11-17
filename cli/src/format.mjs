/**
 * Output helpers. Every command prints either JSON for agents or compact
 * tab-separated lines for humans; both go through `emit`, so the newline and
 * empty-result conventions live in one place.
 */

const write = (text) => {
  process.stdout.write(`${text}\n`);
};

/** Filters out rows that rendered as empty strings. */
export const rows = (lines) => lines.filter((line) => line !== '');

/**
 * Prints either the raw JSON payload or the human rendering of it. `render`
 * receives the payload and returns a string or an array of lines.
 */
export const emit = (payload, json, render) => {
  if (json) {
    write(JSON.stringify(payload));
    return;
  }
  const rendered = render(payload);
  if (Array.isArray(rendered)) {
    if (rendered.length === 0) {
      write('No results.');
      return;
    }
    write(rendered.join('\n'));
    return;
  }
  write(rendered);
};

/** Writes a plain informational line to stdout. */
export const note = (message) => write(message);

export default { emit, note, rows };
