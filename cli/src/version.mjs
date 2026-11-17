import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * The package version, read from package.json so `--version` and the API
 * User-Agent header cannot drift from what npm publishes.
 */
export const VERSION = require('../package.json').version;

export default VERSION;
