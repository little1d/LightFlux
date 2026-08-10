import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createAgentService } from './agent.mjs';

const config = {
  port: Number(process.env.PORT ?? 8787),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? 'http://localhost:8787',
  appWebUrl: process.env.APP_WEB_URL ?? 'http://localhost:8081',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:8081',
  sessionSecret: process.env.SESSION_SECRET ?? '',
  dataFile: resolve(process.env.DATA_FILE ?? './data/auth.json'),
  uploadDir: resolve(process.env.UPLOAD_DIR ?? './data/uploads'),
  uploadAllowAnonymous: process.env.UPLOAD_ALLOW_ANONYMOUS === 'true',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 8 * 1024 * 1024),
  ai: {
    baseUrl: process.env.AI_BASE_URL ?? '',
    apiKey: process.env.AI_API_KEY ?? '',
    model: process.env.AI_MODEL ?? '',
    allowAnonymous: process.env.AI_ALLOW_ANONYMOUS === 'true',
    requestTimeoutMs: Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 30_000),
    rateLimitWindowMs: Number(
      process.env.AI_RATE_LIMIT_WINDOW_MS ?? 60_000,
    ),
    rateLimitMaxRequests: Number(
      process.env.AI_RATE_LIMIT_MAX_REQUESTS ?? 20,
    ),
  },
  web: {
    appId: process.env.WECHAT_WEB_APP_ID ?? '',
    appSecret: process.env.WECHAT_WEB_APP_SECRET ?? '',
    redirectUri:
      process.env.WECHAT_WEB_REDIRECT_URI ??
      'http://localhost:8787/api/auth/wechat/web/callback',
  },
  mobile: {
    appId: process.env.WECHAT_MOBILE_APP_ID ?? '',
    appSecret: process.env.WECHAT_MOBILE_APP_SECRET ?? '',
  },
};

if (!Number.isFinite(config.maxUploadBytes) || config.maxUploadBytes <= 0) {
  throw new Error('MAX_UPLOAD_BYTES must be a positive number.');
}
for (const [name, value] of [
  ['AI_REQUEST_TIMEOUT_MS', config.ai.requestTimeoutMs],
  ['AI_RATE_LIMIT_WINDOW_MS', config.ai.rateLimitWindowMs],
  ['AI_RATE_LIMIT_MAX_REQUESTS', config.ai.rateLimitMaxRequests],
]) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
  }
}

const agentService = createAgentService(config.ai);

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const STATE_TTL_MS = 10 * 60 * 1000;
const COOKIE_NAME = 'lightflux_session';

const emptyDatabase = () => ({
  schemaVersion: 1,
  users: [],
  identities: [],
  sessions: [],
});

let database = emptyDatabase();
let writeQueue = Promise.resolve();

const loadDatabase = async () => {
  try {
    const parsed = JSON.parse(await readFile(config.dataFile, 'utf8'));
    if (
      parsed?.schemaVersion === 1 &&
      Array.isArray(parsed.users) &&
      Array.isArray(parsed.identities) &&
      Array.isArray(parsed.sessions)
    ) {
      database = parsed;
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
};

const persistDatabase = async () => {
  const snapshot = JSON.stringify(database, null, 2);
  writeQueue = writeQueue.then(async () => {
    await mkdir(dirname(config.dataFile), { recursive: true });
    const temporaryFile = `${config.dataFile}.${process.pid}.tmp`;
    await writeFile(temporaryFile, snapshot, { mode: 0o600 });
    await rename(temporaryFile, config.dataFile);
  });
  return writeQueue;
};

const json = (response, status, body, headers = {}) => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(JSON.stringify(body));
};

const readBody = async (request, maxBytes) => {
  const declaredSize = Number(request.headers['content-length'] ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) {
    const error = new Error('Request body is too large.');
    error.status = 413;
    throw error;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const parseBody = async (request) => {
  const body = await readBody(request, 2 * 1024 * 1024);
  return body.length > 0 ? JSON.parse(body.toString('utf8')) : {};
};

const IMAGE_TYPES = {
  'image/avif': {
    extension: 'avif',
    matches: (body) =>
      body.length >= 12 &&
      body.subarray(4, 8).toString('ascii') === 'ftyp' &&
      ['avif', 'avis'].includes(body.subarray(8, 12).toString('ascii')),
  },
  'image/gif': {
    extension: 'gif',
    matches: (body) =>
      ['GIF87a', 'GIF89a'].includes(body.subarray(0, 6).toString('ascii')),
  },
  'image/jpeg': {
    extension: 'jpg',
    matches: (body) =>
      body.length >= 3 &&
      body[0] === 0xff &&
      body[1] === 0xd8 &&
      body[2] === 0xff,
  },
  'image/png': {
    extension: 'png',
    matches: (body) =>
      body.length >= 8 &&
      body.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
  },
  'image/webp': {
    extension: 'webp',
    matches: (body) =>
      body.length >= 12 &&
      body.subarray(0, 4).toString('ascii') === 'RIFF' &&
      body.subarray(8, 12).toString('ascii') === 'WEBP',
  },
};

const imageTypeFromFilename = (filename) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return Object.entries(IMAGE_TYPES).find(
    ([, definition]) => definition.extension === extension,
  )?.[0];
};

const base64url = (value) => Buffer.from(value).toString('base64url');
const stateKey = () => {
  if (config.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must contain at least 32 characters.');
  }
  return config.sessionSecret;
};

const createState = (platform, returnTo) => {
  const payload = base64url(
    JSON.stringify({
      platform,
      returnTo,
      nonce: randomBytes(18).toString('base64url'),
      issuedAt: Date.now(),
    }),
  );
  const signature = createHmac('sha256', stateKey())
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
};

const verifyState = (state, expectedPlatform) => {
  const [payload, signature] = String(state ?? '').split('.');
  if (!payload || !signature) {
    throw new Error('Invalid OAuth state.');
  }
  const expected = createHmac('sha256', stateKey()).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw new Error('Invalid OAuth state signature.');
  }
  const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (
    value.platform !== expectedPlatform ||
    Date.now() - value.issuedAt > STATE_TTL_MS
  ) {
    throw new Error('OAuth state has expired.');
  }
  return value;
};

const safeReturnTo = (value) => {
  try {
    const allowed = new URL(config.appWebUrl);
    const candidate = new URL(value || config.appWebUrl, allowed);
    return candidate.origin === allowed.origin
      ? candidate.toString()
      : allowed.toString();
  } catch {
    return config.appWebUrl;
  }
};

const providerConfig = (platform) =>
  platform === 'web' ? config.web : config.mobile;

const requireProvider = (platform) => {
  const provider = providerConfig(platform);
  const missing = [];
  const prefix = `WECHAT_${platform.toUpperCase()}`;
  if (!provider.appId) missing.push(`${prefix}_APP_ID`);
  if (!provider.appSecret) missing.push(`${prefix}_APP_SECRET`);
  if (missing.length > 0) {
    const error = new Error(
      `WeChat ${platform} login is not configured: ${missing.join(', ')}`,
    );
    error.status = 503;
    throw error;
  }
  return provider;
};

const requestWechat = async (url) => {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok || body.errcode) {
    const error = new Error(
      body.errmsg || `WeChat request failed with ${response.status}.`,
    );
    error.status = 502;
    throw error;
  }
  return body;
};

const exchangeWechatCode = async (platform, code) => {
  const provider = requireProvider(platform);
  const tokenUrl = new URL(
    'https://api.weixin.qq.com/sns/oauth2/access_token',
  );
  tokenUrl.search = new URLSearchParams({
    appid: provider.appId,
    secret: provider.appSecret,
    code,
    grant_type: 'authorization_code',
  }).toString();
  const token = await requestWechat(tokenUrl);

  const userUrl = new URL('https://api.weixin.qq.com/sns/userinfo');
  userUrl.search = new URLSearchParams({
    access_token: token.access_token,
    openid: token.openid,
    lang: 'zh_CN',
  }).toString();
  const profile = await requestWechat(userUrl);
  return {
    appId: provider.appId,
    openId: profile.openid,
    unionId: profile.unionid || token.unionid || null,
    displayName: profile.nickname || 'WeChat user',
    avatarUrl: profile.headimgurl || null,
  };
};

const upsertWechatUser = async (platform, profile) => {
  const timestamp = Date.now();
  let identity =
    (profile.unionId &&
      database.identities.find(
        (item) =>
          item.provider === 'wechat' && item.unionId === profile.unionId,
      )) ||
    database.identities.find(
      (item) =>
        item.provider === 'wechat' &&
        item.appId === profile.appId &&
        item.openId === profile.openId,
    );
  let user = identity
    ? database.users.find((item) => item.id === identity.userId)
    : null;

  if (!user) {
    user = {
      id: randomUUID(),
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      appState: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    database.users.push(user);
  } else {
    user.displayName = profile.displayName || user.displayName;
    user.avatarUrl = profile.avatarUrl || user.avatarUrl;
    user.updatedAt = timestamp;
  }

  if (!identity) {
    identity = {
      id: randomUUID(),
      provider: 'wechat',
      platform,
      appId: profile.appId,
      openId: profile.openId,
      unionId: profile.unionId,
      userId: user.id,
      createdAt: timestamp,
    };
    database.identities.push(identity);
  } else if (!identity.unionId && profile.unionId) {
    identity.unionId = profile.unionId;
  }

  await persistDatabase();
  return user;
};

const tokenHash = (token) =>
  createHash('sha256').update(token).digest('hex');

const createSession = async (userId) => {
  const token = randomBytes(32).toString('base64url');
  const timestamp = Date.now();
  database.sessions = database.sessions.filter(
    (session) => session.expiresAt > timestamp,
  );
  database.sessions.push({
    id: randomUUID(),
    userId,
    tokenHash: tokenHash(token),
    createdAt: timestamp,
    expiresAt: timestamp + SESSION_TTL_MS,
  });
  await persistDatabase();
  return token;
};

const parseCookies = (request) =>
  Object.fromEntries(
    String(request.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );

const requestToken = (request) => {
  const authorization = request.headers.authorization ?? '';
  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7);
  }
  return parseCookies(request)[COOKIE_NAME] ?? null;
};

const currentSession = (request) => {
  const token = requestToken(request);
  if (!token) return null;
  const session = database.sessions.find(
    (item) =>
      item.tokenHash === tokenHash(token) && item.expiresAt > Date.now(),
  );
  if (!session) return null;
  const user = database.users.find((item) => item.id === session.userId);
  return user ? { session, user } : null;
};

const cookieHeader = (token, maxAge = SESSION_TTL_MS / 1000) => {
  const secure = config.publicBaseUrl.startsWith('https://')
    ? '; Secure'
    : '';
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
};

const publicUser = (user) => ({
  id: user.id,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
});

const agentOwnerId = (request, auth) =>
  auth?.user.id ??
  `anonymous:${request.socket.remoteAddress ?? 'unknown'}`;

const handleRequest = async (request, response) => {
  const url = new URL(request.url, config.publicBaseUrl);
  const corsHeaders = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': config.corsOrigin,
    Vary: 'Origin',
  };

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      ...corsHeaders,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    });
    response.end();
    return;
  }

  if (url.pathname === '/health' && request.method === 'GET') {
    json(response, 200, {
      status: 'ok',
      aiConfigured: agentService.isConfigured(),
      wechat: {
        webConfigured: Boolean(config.web.appId && config.web.appSecret),
        mobileConfigured: Boolean(
          config.mobile.appId && config.mobile.appSecret,
        ),
      },
    });
    return;
  }

  const uploadMatch = url.pathname.match(
    /^\/uploads\/([0-9a-f-]+\.(?:avif|gif|jpg|png|webp))$/,
  );
  if (uploadMatch && request.method === 'GET') {
    const filename = uploadMatch[1];
    const contentType = imageTypeFromFilename(filename);
    try {
      const body = await readFile(resolve(config.uploadDir, filename));
      response.writeHead(200, {
        ...corsHeaders,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': body.length,
        'Content-Type': contentType ?? 'application/octet-stream',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      response.end(body);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        json(response, 404, { error: 'Image not found.' }, corsHeaders);
        return;
      }
      throw error;
    }
    return;
  }

  if (url.pathname === '/api/uploads' && request.method === 'POST') {
    const auth = currentSession(request);
    if (!auth && !config.uploadAllowAnonymous) {
      json(response, 401, { error: 'Authentication required.' }, corsHeaders);
      return;
    }

    const contentType = String(request.headers['content-type'] ?? '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    const imageType = IMAGE_TYPES[contentType];
    if (!imageType) {
      json(response, 415, { error: 'Unsupported image type.' }, corsHeaders);
      return;
    }

    const body = await readBody(request, config.maxUploadBytes);
    if (body.length === 0 || !imageType.matches(body)) {
      json(response, 400, { error: 'Invalid image data.' }, corsHeaders);
      return;
    }

    await mkdir(config.uploadDir, { recursive: true });
    const filename = `${randomUUID()}.${imageType.extension}`;
    const temporaryFile = resolve(config.uploadDir, `${filename}.tmp`);
    const destination = resolve(config.uploadDir, filename);
    await writeFile(temporaryFile, body, { mode: 0o600 });
    await rename(temporaryFile, destination);

    json(
      response,
      201,
      {
        contentType,
        size: body.length,
        url: new URL(`/uploads/${filename}`, config.publicBaseUrl).toString(),
      },
      corsHeaders,
    );
    return;
  }

  if (
    url.pathname === '/api/auth/wechat/web/start' &&
    request.method === 'GET'
  ) {
    const provider = requireProvider('web');
    const returnTo = safeReturnTo(url.searchParams.get('return_to'));
    const authorizationUrl = new URL(
      'https://open.weixin.qq.com/connect/qrconnect',
    );
    authorizationUrl.search = new URLSearchParams({
      appid: provider.appId,
      redirect_uri: config.web.redirectUri,
      response_type: 'code',
      scope: 'snsapi_login',
      state: createState('web', returnTo),
    }).toString();
    authorizationUrl.hash = 'wechat_redirect';
    json(response, 200, { authorizationUrl: authorizationUrl.toString() }, corsHeaders);
    return;
  }

  if (
    url.pathname === '/api/auth/wechat/web/callback' &&
    request.method === 'GET'
  ) {
    const state = verifyState(url.searchParams.get('state'), 'web');
    const code = url.searchParams.get('code');
    if (!code) throw new Error('WeChat did not return an authorization code.');
    const profile = await exchangeWechatCode('web', code);
    const user = await upsertWechatUser('web', profile);
    const token = await createSession(user.id);
    response.writeHead(302, {
      'Set-Cookie': cookieHeader(token),
      Location: safeReturnTo(state.returnTo),
    });
    response.end();
    return;
  }

  if (
    url.pathname === '/api/auth/wechat/mobile/state' &&
    request.method === 'GET'
  ) {
    const provider = requireProvider('mobile');
    json(
      response,
      200,
      {
        appId: provider.appId,
        scope: 'snsapi_userinfo',
        state: createState('mobile', null),
      },
      corsHeaders,
    );
    return;
  }

  if (
    url.pathname === '/api/auth/wechat/mobile/exchange' &&
    request.method === 'POST'
  ) {
    const body = await parseBody(request);
    verifyState(body.state, 'mobile');
    if (!body.code) throw new Error('WeChat authorization code is required.');
    const profile = await exchangeWechatCode('mobile', body.code);
    const user = await upsertWechatUser('mobile', profile);
    const token = await createSession(user.id);
    json(
      response,
      200,
      { token, expiresIn: SESSION_TTL_MS / 1000, user: publicUser(user) },
      corsHeaders,
    );
    return;
  }

  if (url.pathname === '/api/auth/session' && request.method === 'GET') {
    const auth = currentSession(request);
    json(
      response,
      auth ? 200 : 401,
      auth
        ? { authenticated: true, user: publicUser(auth.user) }
        : { authenticated: false },
      corsHeaders,
    );
    return;
  }

  if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
    const auth = currentSession(request);
    if (auth) {
      database.sessions = database.sessions.filter(
        (session) => session.id !== auth.session.id,
      );
      await persistDatabase();
    }
    json(response, 200, { ok: true }, {
      ...corsHeaders,
      'Set-Cookie': cookieHeader('', 0),
    });
    return;
  }

  if (url.pathname === '/api/ai/turns' && request.method === 'POST') {
    const auth = currentSession(request);
    if (!auth && !config.ai.allowAnonymous) {
      json(response, 401, { error: 'Authentication required.' }, corsHeaders);
      return;
    }
    const body = await parseBody(request);
    const abortController = new AbortController();
    const abortProviderRequest = () => abortController.abort();
    request.once('aborted', abortProviderRequest);
    let result;
    try {
      result = await agentService.turn({
        ownerId: agentOwnerId(request, auth),
        request: body,
        signal: abortController.signal,
      });
    } finally {
      request.removeListener('aborted', abortProviderRequest);
    }
    json(response, 200, result, corsHeaders);
    return;
  }

  const proposalResultMatch = url.pathname.match(
    /^\/api\/ai\/proposals\/([^/]+)\/result$/,
  );
  if (proposalResultMatch && request.method === 'POST') {
    const auth = currentSession(request);
    if (!auth && !config.ai.allowAnonymous) {
      json(response, 401, { error: 'Authentication required.' }, corsHeaders);
      return;
    }
    const body = await parseBody(request);
    if (
      typeof body.beforeRevision !== 'number' ||
      typeof body.afterRevision !== 'number' ||
      !Array.isArray(body.operations)
    ) {
      json(
        response,
        400,
        { error: 'Invalid proposal execution result.' },
        corsHeaders,
      );
      return;
    }
    await agentService.proposalResult({
      ownerId: agentOwnerId(request, auth),
      proposalId: decodeURIComponent(proposalResultMatch[1]),
      result: body,
    });
    json(response, 200, { ok: true }, corsHeaders);
    return;
  }

  if (url.pathname === '/api/app-state' && request.method === 'GET') {
    const auth = currentSession(request);
    if (!auth) {
      json(response, 401, { error: 'Authentication required.' }, corsHeaders);
      return;
    }
    json(
      response,
      200,
      { state: auth.user.appState ?? null },
      corsHeaders,
    );
    return;
  }

  if (url.pathname === '/api/app-state' && request.method === 'PUT') {
    const auth = currentSession(request);
    if (!auth) {
      json(response, 401, { error: 'Authentication required.' }, corsHeaders);
      return;
    }
    const body = await parseBody(request);
    if (
      !body?.state ||
      !Array.isArray(body.state.todos) ||
      !Array.isArray(body.state.groups)
    ) {
      json(response, 400, { error: 'Invalid app state.' }, corsHeaders);
      return;
    }
    auth.user.appState = body.state;
    auth.user.updatedAt = Date.now();
    await persistDatabase();
    json(response, 200, { ok: true }, corsHeaders);
    return;
  }

  json(response, 404, { error: 'Not found.' }, corsHeaders);
};

await loadDatabase();

createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    if (response.destroyed || response.writableEnded) {
      return;
    }
    if (!error.status || error.status >= 500) {
      console.error(error);
    }
    json(
      response,
      error.status ?? 400,
      { error: error.message || 'Unexpected server error.' },
      {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': config.corsOrigin,
        Vary: 'Origin',
      },
    );
  });
}).listen(config.port, () => {
  console.log(`LightFlux auth API listening on ${config.publicBaseUrl}`);
});
