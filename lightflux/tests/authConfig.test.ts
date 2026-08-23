import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: null,
  },
}));

import { resolveDevelopmentAuthApiUrl } from '../services/authConfig';

describe('development auth API resolution', () => {
  it('derives the API host from the Expo development server', () => {
    expect(
      resolveDevelopmentAuthApiUrl('192.168.1.24:8081'),
    ).toBe('http://192.168.1.24:8787');
    expect(
      resolveDevelopmentAuthApiUrl('http://127.0.0.1:8081'),
    ).toBe('http://127.0.0.1:8787');
  });

  it('falls back to localhost when Expo has no usable host', () => {
    expect(resolveDevelopmentAuthApiUrl(undefined)).toBe(
      'http://localhost:8787',
    );
    expect(resolveDevelopmentAuthApiUrl('invalid host')).toBe(
      'http://localhost:8787',
    );
  });
});
