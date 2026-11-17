import { spawnSync } from 'node:child_process';

const env = { ...process.env, EXPO_NO_DOTENV: '1' };
const result = spawnSync(process.execPath, [
  './node_modules/expo/bin/cli', 'export', '--platform', 'web',
  '--output-dir', 'desktop-dist', '--clear',
], { env, stdio: 'inherit' });
process.exit(result.status ?? 1);
