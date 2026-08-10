import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-file-system', () => ({
  File: class {},
  Paths: { document: '' },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('../services/authApi', () => ({
  isRemoteAuthConfigured: false,
  loadRemoteAppState: vi.fn(),
  saveRemoteAppState: vi.fn(),
}));

vi.mock('../services/indexedDbStorage', () => ({
  loadWebState: vi.fn(),
  saveWebState: vi.fn(),
}));

import { parsePersistedAppState } from '../services/todoStorage';

const legacyTodo = {
  id: 'legacy-task',
  title: 'Legacy task',
  completed: false,
  createdAt: 10,
  updatedAt: 20,
  scheduledDate: '2026-08-10',
  groupId: null,
  parentId: null,
  priority: 'none',
  sortOrder: 0,
  trashedAt: null,
};

describe('persisted state V9 migration', () => {
  it('upgrades V7 state with milestone and analytics defaults', () => {
    const result = parsePersistedAppState(
      JSON.stringify({
        schemaVersion: 7,
        updatedAt: 20,
        language: 'zh',
        navigationOrder: [
          'search',
          'today',
          'completed',
          'calendar',
          'groups',
          'trash',
        ],
        ungroupedName: null,
        todos: [legacyTodo],
        groups: [],
      }),
      100,
    );

    expect(result).toMatchObject({
      schemaVersion: 9,
      analyticsStartedAt: 100,
      milestones: [],
      taskEvents: [
        expect.objectContaining({
          id: 'migration-legacy-task-created',
          taskId: 'legacy-task',
          type: 'created',
        }),
      ],
      todos: [expect.objectContaining({ milestoneId: null })],
    });
    expect(result?.navigationOrder).toContain('milestones');
    expect(result?.navigationOrder).not.toContain('search');
  });

  it('normalizes persisted V9 events and filters unknown tasks', () => {
    const result = parsePersistedAppState(
      JSON.stringify({
        schemaVersion: 9,
        updatedAt: 20,
        analyticsStartedAt: 15,
        language: 'zh',
        todos: [legacyTodo],
        groups: [],
        milestones: [],
        taskEvents: [
          {
            id: 'created',
            taskId: 'legacy-task',
            type: 'created',
            occurredAt: 10,
            metadata: {
              scheduledDate: '2026-08-10',
            },
          },
          {
            id: 'unknown',
            taskId: 'missing-task',
            type: 'completed',
            occurredAt: 11,
          },
          {
            id: 'invalid',
            taskId: 'legacy-task',
            type: 'deleted',
            occurredAt: 12,
          },
        ],
      }),
      100,
    );

    expect(result?.analyticsStartedAt).toBe(15);
    expect(result?.taskEvents).toEqual([
      expect.objectContaining({
        id: 'created',
        taskId: 'legacy-task',
      }),
    ]);
  });

  it('keeps valid milestones and filters invalid records', () => {
    const result = parsePersistedAppState(
      JSON.stringify({
        schemaVersion: 8,
        updatedAt: 1,
        language: 'en',
        todos: [
          { ...legacyTodo, id: 'linked-valid', milestoneId: 'valid' },
          { ...legacyTodo, id: 'linked-invalid', milestoneId: 'invalid' },
          { ...legacyTodo, id: 'linked-missing', milestoneId: 'missing' },
        ],
        groups: [],
        milestones: [
          {
            id: 'valid',
            title: 'Lunar birthday',
            type: 'birthday',
            dateRule: {
              calendar: 'lunar',
              year: null,
              month: 6,
              day: 1,
              isLeapMonth: false,
              missingLeapMonthPolicy: 'regular-month',
            },
            startYear: 2000,
            reminderOffsets: [7, 0, 7, 400],
            notes: 'Note',
            icon: 'gift-outline',
            color: '#F2A65A',
            pinned: true,
            archivedAt: null,
            trashedAt: null,
            createdAt: 10,
            updatedAt: 11,
            revision: 2,
          },
          {
            id: 'invalid',
            title: 'Invalid date',
            dateRule: {
              calendar: 'solar',
              year: 2026,
              month: 2,
              day: 31,
            },
            createdAt: 10,
          },
          {
            id: 'unknown-calendar',
            title: 'Unknown calendar',
            dateRule: {
              calendar: 'other',
              year: null,
              month: 8,
              day: 10,
            },
            createdAt: 10,
          },
        ],
      }),
    );

    expect(result?.milestones).toEqual([
      expect.objectContaining({
        id: 'valid',
        reminderOffsets: [0, 7],
        revision: 2,
      }),
    ]);
    expect(result?.todos).toEqual([
      expect.objectContaining({
        id: 'linked-valid',
        milestoneId: 'valid',
      }),
      expect.objectContaining({
        id: 'linked-invalid',
        milestoneId: null,
      }),
      expect.objectContaining({
        id: 'linked-missing',
        milestoneId: null,
      }),
    ]);
  });
});
