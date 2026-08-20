import assert from 'node:assert/strict';
import test from 'node:test';

import { publicHttpError } from '../src/http-errors.mjs';

test('does not expose unexpected database errors', () => {
  assert.deepEqual(
    publicHttpError(new Error('relation users does not exist')),
    {
      message: 'Unexpected server error.',
      status: 500,
    },
  );
});

test('preserves explicit client errors', () => {
  const error = new Error('Invalid app state.');
  error.status = 400;
  assert.deepEqual(publicHttpError(error), {
    message: 'Invalid app state.',
    status: 400,
  });
});
