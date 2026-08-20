import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { DataType, newDb } from 'pg-mem';

import { createEmailAuth } from '../src/email-auth.mjs';
import { runMigrations } from '../src/postgres/migrations.mjs';

let auth;
let pool;
let sentOtp;

beforeEach(async () => {
  const database = newDb({
    autoCreateForeignKeyIndices: false,
    noAstCoverageCheck: true,
  });
  database.public.registerFunction({
    implementation: (value) =>
      [...value].reduce(
        (hash, character) =>
          ((hash << 5) - hash + character.charCodeAt(0)) | 0,
        0,
      ),
    name: 'hashtext',
    args: [DataType.text],
    returns: DataType.integer,
  });
  database.public.registerFunction({
    implementation: () => null,
    name: 'pg_advisory_xact_lock',
    args: [DataType.integer],
    returns: DataType.integer,
  });
  database.public.registerFunction({
    implementation: (value) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? 'object'
        : Array.isArray(value)
          ? 'array'
          : typeof value,
    name: 'jsonb_typeof',
    args: [DataType.jsonb],
    returns: DataType.text,
  });
  database.public.registerFunction({
    implementation: (value) => value.length,
    name: 'length',
    args: [DataType.text],
    returns: DataType.integer,
  });

  const adapter = database.adapters.createPg();
  pool = new adapter.Pool();
  await runMigrations({
    directory: fileURLToPath(new URL('../migrations/', import.meta.url)),
    pool,
    useAdvisoryLock: false,
  });
  auth = createEmailAuth({
    baseUrl: 'http://localhost:8787',
    database: pool,
    ipAddressHeaders: ['x-forwarded-for'],
    secret: '0123456789abcdef0123456789abcdef',
    sendOtp: async (message) => {
      sentOtp = message;
    },
    trustedOrigins: ['http://localhost:8081'],
  });
});

afterEach(async () => {
  await pool.end();
});

const authRequest = (path, body, cookie) =>
  auth.handler(
    new Request(`http://localhost:8787/api/auth/email${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        origin: 'http://localhost:8081',
        'x-forwarded-for': '127.0.0.1',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  );

test('signs in with an email OTP and restores the session', async () => {
  const sendResponse = await authRequest(
    '/email-otp/send-verification-otp',
    {
      email: 'person@example.com',
      type: 'sign-in',
    },
  );

  assert.equal(sendResponse.status, 200);
  assert.equal(sentOtp.email, 'person@example.com');
  assert.match(sentOtp.otp, /^\d{6}$/);
  const storedVerification = await pool.query(
    'SELECT value FROM email_auth_verifications',
  );
  assert.equal(storedVerification.rowCount, 1);
  assert.equal(storedVerification.rows[0].value.includes(sentOtp.otp), false);

  const signInResponse = await authRequest('/sign-in/email-otp', {
    email: 'person@example.com',
    name: 'Person',
    otp: sentOtp.otp,
  });
  assert.equal(signInResponse.status, 200);
  const cookie = signInResponse.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);

  const sessionResponse = await authRequest('/get-session', null, cookie);
  const session = await sessionResponse.json();
  assert.equal(sessionResponse.status, 200);
  assert.equal(session.user.email, 'person@example.com');
  assert.equal(session.user.emailVerified, true);

  const signOutResponse = await authRequest('/sign-out', {}, cookie);
  assert.equal(signOutResponse.status, 200);
  const expiredCookie = signOutResponse.headers.get('set-cookie');
  assert.match(expiredCookie, /Max-Age=0/);

  const expiredSessionResponse = await authRequest(
    '/get-session',
    null,
    cookie,
  );
  assert.equal(await expiredSessionResponse.json(), null);
});
