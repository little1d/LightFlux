import { describe, expect, it } from 'vitest';

import {
  TRASH_RETENTION_MS,
  selectExpiredTrashIds,
} from '../store/todoDomain';

interface TrashItem {
  id: string;
  trashedAt: number | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const now = 1_000_000_000_000;

describe('selectExpiredTrashIds', () => {
  it('忽略未删除与刚进垃圾桶的项', () => {
    const items: TrashItem[] = [
      { id: 'active', trashedAt: null },
      { id: 'fresh', trashedAt: now - DAY_MS },
    ];
    expect(Array.from(selectExpiredTrashIds(items, now))).toEqual([]);
  });

  it('选出停留满 30 天的项（含恰好 30 天的边界）', () => {
    const items: TrashItem[] = [
      { id: 'boundary', trashedAt: now - TRASH_RETENTION_MS },
      { id: 'old', trashedAt: now - 31 * DAY_MS },
      { id: 'not-quite', trashedAt: now - 30 * DAY_MS + 1 },
    ];
    expect(Array.from(selectExpiredTrashIds(items, now)).sort()).toEqual([
      'boundary',
      'old',
    ]);
  });

  it('支持自定义保留时长', () => {
    const items: TrashItem[] = [
      { id: 'a', trashedAt: now - 7 * DAY_MS },
    ];
    expect(
      Array.from(selectExpiredTrashIds(items, now, 7 * DAY_MS)),
    ).toEqual(['a']);
  });
});
