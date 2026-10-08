import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const releaseNotesForVersion = (changelog, version) => {
  const lines = changelog.replaceAll('\r\n', '\n').split('\n');
  const heading = new RegExp(
    `^## \\[${escapeRegExp(version)}\\](?: - \\d{4}-\\d{2}-\\d{2})?$`,
  );
  const start = lines.findIndex((line) => heading.test(line));
  if (start < 0) {
    throw new Error(`CHANGELOG.md has no section for version ${version}.`);
  }
  const next = lines.findIndex(
    (line, index) => index > start && line.startsWith('## ['),
  );
  const body = lines
    .slice(start + 1, next < 0 ? lines.length : next)
    .join('\n')
    .trim();
  if (!body) {
    throw new Error(`CHANGELOG.md section ${version} is empty.`);
  }
  return body;
};

const entrypoint = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : '';
if (import.meta.url === entrypoint) {
  const [version, changelogPath = 'CHANGELOG.md'] = process.argv.slice(2);
  if (!version) {
    throw new Error('Usage: release-notes.mjs <version> [changelog-path]');
  }
  const changelog = await readFile(changelogPath, 'utf8');
  process.stdout.write(`${releaseNotesForVersion(changelog, version)}\n`);
}
