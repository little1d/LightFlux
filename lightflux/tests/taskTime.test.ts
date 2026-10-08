import { describe, expect, it } from 'vitest';

import {
  isTaskTime,
  normalizeTaskTime,
  TASK_TIME_OPTIONS,
} from '../utils/taskTime';

describe('task time', () => {
  it('offers a full day in 30-minute increments', () => {
    expect(TASK_TIME_OPTIONS).toHaveLength(48);
    expect(TASK_TIME_OPTIONS[0]).toBe('00:00');
    expect(TASK_TIME_OPTIONS.at(-1)).toBe('23:30');
    expect(TASK_TIME_OPTIONS.every(isTaskTime)).toBe(true);
  });

  it('keeps valid minute precision while rejecting invalid values', () => {
    expect(normalizeTaskTime('09:45')).toBe('09:45');
    expect(normalizeTaskTime('24:00')).toBeNull();
    expect(normalizeTaskTime(undefined)).toBeNull();
  });
});
