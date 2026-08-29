import assert from 'node:assert/strict';
import test from 'node:test';

import { createApiClient, LightFluxApiError } from '../src/api.mjs';

test('API client uses the public versioned Workspace endpoint', async () => {
  const calls = [];
  const client = createApiClient({
    apiUrl: 'https://lightflux.site/',
    token: 'development-token',
    fetchImplementation: async (...args) => {
      calls.push(args);
      return Response.json({
        workspaces: [
          {
            id: 'personal',
            kind: 'personal',
            name: 'Personal',
            role: 'owner',
          },
        ],
      });
    },
  });

  assert.equal((await client.listWorkspaces()).length, 1);
  assert.equal(calls[0][0], 'https://lightflux.site/api/v1/workspaces');
  assert.equal(
    calls[0][1].headers.Authorization,
    'Bearer development-token',
  );
});

test('API client explains the 0.1.1 dependency', async () => {
  const client = createApiClient({
    apiUrl: 'https://lightflux.site',
    token: 'development-token',
    fetchImplementation: async () => Response.json({}, { status: 404 }),
  });

  await assert.rejects(
    client.listWorkspaces(),
    (error) =>
      error instanceof LightFluxApiError &&
      error.status === 404 &&
      error.message ===
        'Workspace API is not available. It requires LightFlux 0.1.1.',
  );
});
