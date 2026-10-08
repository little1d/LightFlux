import { describe, expect, it } from 'vitest';

import { releaseNotesForVersion } from '../scripts/release-notes.mjs';

const changelog = `# Changelog

## [Unreleased]

- Pending

## [1.2.0] - 2026-10-08

### Added

- A useful feature.

## [1.1.0] - 2026-09-01

- Earlier work.
`;

describe('release notes', () => {
  it('extracts only the requested version body', () => {
    expect(releaseNotesForVersion(changelog, '1.2.0')).toBe(
      '### Added\n\n- A useful feature.',
    );
  });

  it('rejects missing and empty version sections', () => {
    expect(() => releaseNotesForVersion(changelog, '2.0.0')).toThrow(
      'no section',
    );
    expect(() =>
      releaseNotesForVersion(
        '## [1.2.0] - 2026-10-08\n\n## [1.1.0]',
        '1.2.0',
      ),
    ).toThrow('is empty');
  });
});
