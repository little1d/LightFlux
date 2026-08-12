import { describe, expect, it } from 'vitest';

import { compareSemanticVersions } from '../utils/version';

describe('compareSemanticVersions', () => {
  it('compares each numeric version segment', () => {
    expect(compareSemanticVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareSemanticVersions('2.0.0', '10.0.0')).toBeLessThan(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareSemanticVersions('1.2', '1.2.0')).toBe(0);
  });

  it('ignores prerelease labels for minimum-supported checks', () => {
    expect(compareSemanticVersions('1.4.0-beta.2', '1.4.0')).toBe(0);
  });
});
