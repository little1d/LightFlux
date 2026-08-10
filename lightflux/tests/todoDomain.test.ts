import { describe, expect, it } from 'vitest';

import {
  buildChildCountByParent,
  buildSiblingIndexById,
  deleteTrashedTodoBranch,
  emptyTrashTodos,
  orderWithSubtasks,
  restoreTodoBranch,
} from '../store/todoDomain';
import { Todo } from '../types/todo';
import { emptyRichTextDocument } from '../utils/richText';

const todo = (
  id: string,
  overrides: Partial<Todo> = {},
): Todo => ({
  id,
  title: id,
  completed: false,
  completedAt: null,
  content: emptyRichTextDocument(),
  createdAt: 1,
  groupId: null,
  parentId: null,
  priority: 'none',
  scheduledDate: '2026-08-10',
  sortOrder: 0,
  trashedAt: null,
  updatedAt: 1,
  ...overrides,
});

describe('todo trash operations', () => {
  it('keeps a restored child when its trashed parent is deleted', () => {
    const source = [
      todo('parent', { trashedAt: 10 }),
      todo('child', { parentId: 'parent', trashedAt: 10 }),
    ];

    const restored = restoreTodoBranch(source, 'child', 20);
    expect(restored.find((item) => item.id === 'child')).toMatchObject({
      parentId: null,
      trashedAt: null,
    });

    const afterDelete = deleteTrashedTodoBranch(restored, 'parent', 30);
    expect(afterDelete.map((item) => item.id)).toEqual(['child']);
  });

  it('detaches active descendants when emptying old trash data', () => {
    const source = [
      todo('parent', { trashedAt: 10 }),
      todo('child', { parentId: 'parent' }),
    ];

    expect(emptyTrashTodos(source, 20)).toEqual([
      expect.objectContaining({
        id: 'child',
        parentId: null,
        updatedAt: 20,
      }),
    ]);
  });
});

describe('todo indexes', () => {
  it('counts children in one derived index', () => {
    const counts = buildChildCountByParent([
      todo('parent'),
      todo('child-1', { parentId: 'parent' }),
      todo('child-2', { parentId: 'parent' }),
    ]);

    expect(counts.get('parent')).toBe(2);
  });

  it('indexes siblings independently for each parent', () => {
    const indexes = buildSiblingIndexById([
      todo('root-1'),
      todo('root-2'),
      todo('child-1', { parentId: 'root-1' }),
      todo('child-2', { parentId: 'root-1' }),
    ]);

    expect(indexes.get('root-2')).toBe(1);
    expect(indexes.get('child-1')).toBe(0);
    expect(indexes.get('child-2')).toBe(1);
  });

  it('keeps cyclic legacy data visible without recurring forever', () => {
    const ordered = orderWithSubtasks([
      todo('a', { parentId: 'b' }),
      todo('b', { parentId: 'a' }),
    ]);

    expect(ordered.map((item) => item.id).sort()).toEqual(['a', 'b']);
  });
});
