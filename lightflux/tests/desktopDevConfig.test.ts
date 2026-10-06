import { describe, expect, it } from 'vitest';

import pkg from '../package.json';
import release from '../src-tauri/tauri.conf.json';
import dev from '../src-tauri/tauri.dev.conf.json';

describe('desktop development isolation', () => {
  it('starts the dev command with a separate application identity', () => {
    const configPath = pkg.scripts['desktop:dev'].match(/--config\s+(\S+)/)?.[1];
    expect(configPath).toBe('src-tauri/tauri.dev.conf.json');
    expect(release.identifier).toBe('com.little1d.lightflux');
    expect(dev.identifier).toBe('com.little1d.lightflux.dev');
    expect(dev.productName).toBe('LightFlux Dev');
    expect(dev.app.windows[0]).toMatchObject({ label: 'main', title: 'LightFlux Dev' });
    expect('build' in dev).toBe(false);
    const stableSchemes = release.plugins['deep-link'].desktop.schemes;
    expect(dev.plugins['deep-link'].desktop.schemes.some(
      (scheme: string) => stableSchemes.includes(scheme),
    )).toBe(false);
  });
});
