// End-to-end smoke test against a fake loopback API. Not part of the suite:
// it exercises the real entry point as a child process.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const calls = [];

const task = {
  completed: false,
  content: { type: 'doc', content: [] },
  id: 't1',
  milestoneId: null,
  parentId: null,
  projectId: 'p1',
  scheduledDate: '2026-01-02',
  scheduledTime: null,
  title: 'Existing',
  version: 4,
};

const server = createServer((request, response) => {
  let body = '';
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    calls.push({ body: body ? JSON.parse(body) : undefined, method: request.method, url: request.url, headers: request.headers });
    const json = (payload) => {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(payload));
    };
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/api/v1/workspaces') return json({ workspaces: [{ id: 'local', kind: 'personal', name: 'Local' }] });
    if (url.pathname === '/api/v1/workspaces/local/projects') {
      if (request.method === 'POST') return json({ project: { color: '#000', id: 'p2', kind: 'regular', name: body && JSON.parse(body).name, sortOrder: 2 } });
      return json({ projects: [
        { color: '#8B7EFF', id: 'p1', kind: 'inbox', name: 'Inbox', sortOrder: 0 },
        { color: '#55B9A5', id: 'p2', kind: 'regular', name: 'Work', sortOrder: 1 },
      ] });
    }
    if (url.pathname === '/api/v1/workspaces/local/milestones') {
      if (request.method === 'POST') {
        return json({ milestone: { id: 'm2', title: 'Birthday', type: 'birthday', version: 1 } });
      }
      return json({ milestones: [{ archived: false, id: 'm1', title: 'Launch', type: 'countdown', version: 1 }] });
    }
    if (url.pathname === '/api/v1/workspaces/local/audit') {
      return json({ mutations: [{ action: 'task.update', createdAt: '2026-01-01T00:00:00Z', id: 'u1', undoneAt: null }] });
    }
    if (/^\/api\/v1\/projects\/[^/]+\/tasks$/.test(url.pathname)) {
      if (request.method === 'POST') {
        return json({ task: { ...task, ...JSON.parse(body), id: 't3', version: 1 } });
      }
      return json({ tasks: [task, { ...task, id: 't2', parentId: 't1', title: 'Child' }] });
    }
    if (/^\/api\/v1\/tasks\/[^/]+$/.test(url.pathname)) return json({ task });
    if (/mutations$/.test(url.pathname)) return json({ task: { ...task, version: 5 }, milestone: { id: 'm1', version: 2, type: 'countdown', title: 'Launch' }, project: { color: '#55B9A5', id: 'p1', kind: 'inbox', name: 'Inbox', sortOrder: 0 } });
    if (/\/comments$/.test(url.pathname)) return json({ comment: { id: 'c1' } });
    if (/\/undo$/.test(url.pathname)) return json({ revision: 9 });
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  });
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const dataDirectory = await mkdtemp(join(tmpdir(), 'lf-smoke-'));
const descriptor = join(dataDirectory, 'local-api.json');
await writeFile(descriptor, JSON.stringify({ apiUrl: `http://127.0.0.1:${port}/`, schemaVersion: 1, token: 'x'.repeat(48) }));
await chmod(descriptor, 0o600);

const cli = async (args) => {
  const env = { ...process.env, LIGHTFLUX_DESKTOP_DATA_DIR: dataDirectory, LIGHTFLUX_NO_AUTOSTART: '1', XDG_CONFIG_HOME: dataDirectory };
  try {
    const { stdout } = await run(process.execPath, ['src/cli.mjs', ...args], { env });
    return { code: 0, out: stdout.trim() };
  } catch (error) {
    return { code: error.code, out: `${error.stdout}${error.stderr}`.trim() };
  }
};

const cases = [
  ['context'],
  ['context', '--json'],
  ['projects'],
  ['task', 'list', '--project=p1'],
  ['task', 'list', '--project', 'p1', '--all', '--trash'],
  ['task', 'list', '--project', 'p1', '--root'],
  ['task', 'list', '--parent', 't1'],
  ['task', 'show', 't1'],
  ['task', 'create', 'Release', '--date', '2026-03-04', '--content', 'Note'],
  ['task', 'create', 'Child', '--parent', 't1'],
  ['task', 'update', 't1', '--expected-version', '4', '--no-time'],
  ['task', 'update', 't1', '--expected-version', '4', '--milestone', 'm1'],
  ['task', 'complete', 't1', '--expected-version', '4'],
  ['task', 'trash', 't1', '--expected-version', '4', '--yes'],
  ['task', 'comment', 't1', '--message', 'ok'],
  ['milestone', 'list'],
  ['milestone', 'create', 'Birthday', '--type', 'birthday', '--date', '08-15', '--yearly', '--reminders', '7,1,0'],
  ['milestone', 'update', 'm1', '--expected-version', '1', '--pinned'],
  ['project', 'create', 'New', '--color', '#123456', '--after', 'p1'],
  ['project', 'rename', 'p1', 'Renamed'],
  ['project', 'color', 'p1', '#ABCDEF'],
  ['project', 'reorder', 'p1', '--position', '0'],
  ['project', 'delete', 'p1', '--yes'],
  ['audit'],
  ['undo', 'u1', '--yes'],
  ['login'],
];

let failures = 0;
for (const args of cases) {
  const result = await cli(args);
  const ok = result.code === 0;
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  lightflux ${args.join(' ')}\n      ${result.out.replace(/\n/g, '\n      ')}`);
}

const mutationCalls = calls.filter((call) => call.method === 'POST' && /mutations$/.test(call.url));
const missingKey = mutationCalls.filter((call) => !call.headers['idempotency-key']);
console.log(`\nPOSTs: ${mutationCalls.length}, without Idempotency-Key: ${missingKey.length}`);
const created = calls.find((call) => /\/tasks$/.test(call.url) && call.method === 'POST');
console.log('create payload:', JSON.stringify(created?.body));
console.log(`\nfailures: ${failures}`);
server.close();
process.exitCode = failures > 0 || missingKey.length > 0 ? 1 : 0;
