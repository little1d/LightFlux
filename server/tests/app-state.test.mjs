import assert from 'node:assert/strict';
import test from 'node:test';

import { isCurrentAppState } from '../src/app-state.mjs';

test('accepts only V12 Project aggregates', () => {
  assert.equal(
    isCurrentAppState({
      schemaVersion: 12,
      projects: [],
      todos: [],
    }),
    true,
  );
  assert.equal(
    isCurrentAppState({
      schemaVersion: 11,
      groups: [],
      todos: [],
    }),
    false,
  );
  assert.equal(
    isCurrentAppState({
      schemaVersion: 12,
      groups: [],
      todos: [],
    }),
    false,
  );
});
