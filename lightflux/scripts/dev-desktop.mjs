import { spawnSync } from 'node:child_process';

const env = { ...process.env, EXPO_NO_DOTENV: '1', BROWSER: 'none' };
const result = spawnSync(process.execPath, [
  './node_modules/expo/bin/cli', 'start', '--web', '--localhost', '--port', '1420',
], { env, stdio: 'inherit' });
process.exit(result.status ?? 1);
