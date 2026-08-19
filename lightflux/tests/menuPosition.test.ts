import { describe, expect, it } from 'vitest';

import { clampMenuPosition } from '../components/ui/menuPosition';

describe('clampMenuPosition', () => {
  it('keeps an anchored menu next to its trigger when space is available', () => {
    expect(
      clampMenuPosition(
        { x: 140, y: 180 },
        { width: 390, height: 844 },
        240,
        220,
      ),
    ).toEqual({ x: 138, y: 180 });
  });

  it('moves a menu upward and left when a bottom-right trigger has no room', () => {
    expect(
      clampMenuPosition(
        { x: 360, y: 790 },
        { width: 390, height: 844 },
        240,
        220,
      ),
    ).toEqual({ x: 138, y: 612 });
  });

  it('uses the viewport gutter when the requested position is negative', () => {
    expect(
      clampMenuPosition(
        { x: -20, y: -12 },
        { width: 390, height: 844 },
        240,
        220,
      ),
    ).toEqual({ x: 12, y: 12 });
  });
});
