import { describe, expect, it } from 'vitest';

import {
  buildChildCountByParent,
  buildSiblingIndexById,
  deleteTrashedTodoBranch,
  emptyTrashTodos,
  moveTodoBranchToGroup,
  orderWithSubtasks,
  restoreTodoBranch,
  selectActiveTodos,
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
  milestoneId: overrides.milestoneId ?? null,
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

describe('active task views', () => {
  it('excludes completed tasks without deleting them', () => {
    const source = [
      todo('active'),
      todo('completed', { completed: true, completedAt: 10 }),
      todo('trashed', { trashedAt: 10 }),
    ];

    expect(selectActiveTodos(source).map((item) => item.id)).toEqual([
      'active',
    ]);
    expect(source).toHaveLength(3);
  });
});

describe('moving tasks between groups', () => {
  it('moves a root task and its descendants as one branch', () => {
    const source = [
      todo('target-root', { groupId: 'target', sortOrder: 3 }),
      todo('parent', { groupId: 'source', sortOrder: 0 }),
      todo('child', {
        groupId: 'source',
        parentId: 'parent',
        sortOrder: 0,
      }),
    ];

    const moved = moveTodoBranchToGroup(
      source,
      'parent',
      'target',
      20,
    );

    expect(moved.find((item) => item.id === 'parent')).toMatchObject({
      groupId: 'target',
      parentId: null,
      sortOrder: 4,
      updatedAt: 20,
    });
    expect(moved.find((item) => item.id === 'child')).toMatchObject({
      groupId: 'target',
      parentId: 'parent',
      updatedAt: 20,
    });
  });

  it('detaches a moved subtask from a parent in another group', () => {
    const source = [
      todo('parent', { groupId: 'source' }),
      todo('child', {
        groupId: 'source',
        parentId: 'parent',
      }),
      todo('grandchild', {
        groupId: 'source',
        parentId: 'child',
      }),
    ];

    const moved = moveTodoBranchToGroup(
      source,
      'child',
      'target',
      20,
    );

    expect(moved.find((item) => item.id === 'child')).toMatchObject({
      groupId: 'target',
      parentId: null,
    });
    expect(moved.find((item) => item.id === 'grandchild')).toMatchObject({
      groupId: 'target',
      parentId: 'child',
    });
    expect(moved.find((item) => item.id === 'parent')).toMatchObject({
      groupId: 'source',
    });
  });

  it('does not move a task that is already in trash', () => {
    const source = [
      todo('trashed', { groupId: 'source', trashedAt: 10 }),
    ];

    expect(
      moveTodoBranchToGroup(source, 'trashed', 'target', 20),
    ).toBe(source);
  });
});
