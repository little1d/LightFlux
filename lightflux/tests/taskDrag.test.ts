import { describe, expect, it } from 'vitest';

import {
  taskDragDisplacement,
  type TaskDragState,
} from '../components/tasks/taskDrag';

const state = (
  overrides: Partial<TaskDragState> = {},
): TaskDragState => ({
  id: 'dragged',
  scopeId: 'group:root',
  sourceIndex: 1,
  targetIndex: 3,
  ...overrides,
});

describe('task drag displacement', () => {
  it('opens a slot while dragging down', () => {
    expect(
      taskDragDisplacement({
        dragState: state(),
        id: 'second',
        index: 2,
        nested: false,
        scopeId: 'group:root',
      }),
    ).toBe(-54);
    expect(
      taskDragDisplacement({
        dragState: state(),
        id: 'third',
        index: 3,
        nested: false,
        scopeId: 'group:root',
      }),
    ).toBe(-54);
  });

  it('opens a nested slot while dragging up', () => {
    expect(
      taskDragDisplacement({
        dragState: state({
          scopeId: 'parent:one',
          sourceIndex: 3,
          targetIndex: 1,
        }),
        id: 'first',
        index: 1,
        nested: true,
        scopeId: 'parent:one',
      }),
    ).toBe(46);
  });

  it('does not move the dragged row or another scope', () => {
    expect(
      taskDragDisplacement({
        dragState: state(),
        id: 'dragged',
        index: 1,
        nested: false,
        scopeId: 'group:root',
      }),
    ).toBe(0);
    expect(
      taskDragDisplacement({
        dragState: state(),
        id: 'other',
        index: 2,
        nested: false,
        scopeId: 'another-group',
      }),
    ).toBe(0);
  });
});
