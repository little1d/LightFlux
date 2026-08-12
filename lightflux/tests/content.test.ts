import { describe, expect, it } from 'vitest';

import { translations } from '../content';

const contentShape = (value: unknown): unknown => {
  if (typeof value === 'function') {
    return 'function';
  }
  if (Array.isArray(value)) {
    return value.map(contentShape);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, contentShape(nested)]),
    );
  }
  return typeof value;
};

describe('localized content', () => {
  it('keeps the Chinese and English content trees structurally aligned', () => {
    expect(contentShape(translations.zh)).toEqual(
      contentShape(translations.en),
    );
  });

  it('formats desktop update labels through the localized content contract', () => {
    expect(translations.zh.desktop.updateToVersion('1.2.3')).toBe(
      '更新到 1.2.3',
    );
    expect(translations.en.desktop.updateToVersion('1.2.3')).toBe(
      'Update to 1.2.3',
    );
  });
});
