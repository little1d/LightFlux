import { describe, expect, it } from 'vitest';

import {
  buildChildCountByParent,
  buildSiblingIndexById,
  deleteTrashedTodoBranch,
  emptyTrashTodos,
  moveTodoBranchToProject,
  orderWithSubtasks,
  reorderList,
  restoreTodoBranch,
  searchResultView,
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
  projectId: 'inbox',
  parentId: null,
  priority: 'none',
  scheduledDate: '2026-08-10',
  sortOrder: 0,
  trashedAt: null,
  updatedAt: 1,
  ...overrides,
  milestoneId: overrides.milestoneId ?? null,
});

describe('search result routing', () => {
  it('opens completed and active tasks on their owning surfaces', () => {
    expect(searchResultView({ completed: true })).toBe('completed');
    expect(searchResultView({ completed: false })).toBe('projects');
  });
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

describe('moving tasks between projects', () => {
  it('moves a root task and its descendants as one branch', () => {
    const source = [
      todo('target-root', { projectId: 'target', sortOrder: 3 }),
      todo('parent', { projectId: 'source', sortOrder: 0 }),
      todo('child', {
        projectId: 'source',
        parentId: 'parent',
        sortOrder: 0,
      }),
    ];

    const moved = moveTodoBranchToProject(
      source,
      'parent',
      'target',
      20,
    );

    expect(moved.find((item) => item.id === 'parent')).toMatchObject({
      projectId: 'target',
      parentId: null,
      sortOrder: 4,
      updatedAt: 20,
    });
    expect(moved.find((item) => item.id === 'child')).toMatchObject({
      projectId: 'target',
      parentId: 'parent',
      updatedAt: 20,
    });
  });

  it('detaches a moved subtask from a parent in another project', () => {
    const source = [
      todo('parent', { projectId: 'source' }),
      todo('child', {
        projectId: 'source',
        parentId: 'parent',
      }),
      todo('grandchild', {
        projectId: 'source',
        parentId: 'child',
      }),
    ];

    const moved = moveTodoBranchToProject(
      source,
      'child',
      'target',
      20,
    );

    expect(moved.find((item) => item.id === 'child')).toMatchObject({
      projectId: 'target',
      parentId: null,
    });
    expect(moved.find((item) => item.id === 'grandchild')).toMatchObject({
      projectId: 'target',
      parentId: 'child',
    });
    expect(moved.find((item) => item.id === 'parent')).toMatchObject({
      projectId: 'source',
    });
  });

  it('does not move a task that is already in trash', () => {
    const source = [
      todo('trashed', { projectId: 'source', trashedAt: 10 }),
    ];

    expect(
      moveTodoBranchToProject(source, 'trashed', 'target', 20),
    ).toBe(source);
  });
});

describe('reorderList', () => {
  it('moves an item down to a later slot', () => {
    expect(reorderList(['a', 'b', 'c', 'd'], 'a', 2)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('moves an item up to an earlier slot', () => {
    expect(reorderList(['a', 'b', 'c', 'd'], 'd', 1)).toEqual([
      'a',
      'd',
      'b',
      'c',
    ]);
  });

  it('clamps a target index beyond the list end', () => {
    expect(reorderList(['a', 'b', 'c'], 'a', 99)).toEqual([
      'b',
      'c',
      'a',
    ]);
  });

  it('clamps a negative target index to the front', () => {
    expect(reorderList(['a', 'b', 'c'], 'c', -5)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('returns the same reference for a no-op move', () => {
    const source = ['a', 'b', 'c'];
    expect(reorderList(source, 'b', 1)).toBe(source);
  });

  it('returns the same reference when the id is missing', () => {
    const source = ['a', 'b', 'c'];
    expect(reorderList(source, 'z', 0)).toBe(source);
  });
});
