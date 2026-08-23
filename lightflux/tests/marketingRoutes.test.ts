import { describe, expect, it } from 'vitest';

import {
  isPublicMarketingPath,
  MARKETING_PATHS,
} from '../components/marketing/marketingRoutes';

describe('public marketing routes', () => {
  it('exposes the first-release marketing route set', () => {
    expect(MARKETING_PATHS).toEqual([
      '/',
      '/features',
      '/download',
      '/help',
      '/privacy',
      '/terms',
      '/changelog',
    ]);
  });

  it('does not treat application or similarly prefixed paths as public', () => {
    expect(isPublicMarketingPath('/today')).toBe(false);
    expect(isPublicMarketingPath('/login')).toBe(false);
    expect(isPublicMarketingPath('/features/private')).toBe(false);
    expect(isPublicMarketingPath('/download-old')).toBe(false);
  });
});
