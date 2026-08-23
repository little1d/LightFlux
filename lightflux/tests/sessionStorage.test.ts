import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authConfigured: true,
  getRemoteSession: vi.fn(),
  logoutRemoteSession: vi.fn(),
  resetRemoteSyncContext: vi.fn(),
}));

vi.mock('expo-file-system', () => ({
  File: class {},
  Paths: { document: '' },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

vi.mock('../services/authApi', () => ({
  getRemoteSession: mocks.getRemoteSession,
  get isRemoteAuthConfigured() {
    return mocks.authConfigured;
  },
  logoutRemoteSession: mocks.logoutRemoteSession,
}));

vi.mock('../services/todoStorage', () => ({
  resetRemoteSyncContext: mocks.resetRemoteSyncContext,
}));

const createStorage = (entries: Record<string, string> = {}) => {
  const records = new Map(Object.entries(entries));
  return {
    getItem: (key: string) => records.get(key) ?? null,
    removeItem: (key: string) => records.delete(key),
    setItem: (key: string, value: string) => records.set(key, value),
  };
};

describe('sessionStorage', () => {
  beforeEach(() => {
    mocks.authConfigured = true;
    mocks.getRemoteSession.mockReset();
    mocks.logoutRemoteSession.mockReset();
    mocks.resetRemoteSyncContext.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('clears legacy session markers instead of bypassing login', async () => {
    const storage = createStorage({
      'lightflux.session.v1': 'local',
    });
    vi.stubGlobal('localStorage', storage);
    mocks.getRemoteSession.mockResolvedValue(false);
    const { loadSessionState } = await import(
      '../services/sessionStorage'
    );

    await expect(loadSessionState()).resolves.toBe('signed-out');
    expect(storage.getItem('lightflux.session.v1')).toBeNull();
  });

  it('requires an explicit local-mode choice when auth is unavailable', async () => {
    vi.stubGlobal('localStorage', createStorage());
    mocks.authConfigured = false;
    const { loadSessionState } = await import(
      '../services/sessionStorage'
    );

    await expect(loadSessionState()).resolves.toBe('signed-out');
  });

  it('restores local mode when the remote session check is offline', async () => {
    vi.stubGlobal(
      'localStorage',
      createStorage({ 'lightflux.session.v2': 'local' }),
    );
    mocks.getRemoteSession.mockRejectedValue(new Error('offline'));
    const { loadSessionState } = await import(
      '../services/sessionStorage'
    );

    await expect(loadSessionState()).resolves.toBe('local');
  });

  it('prefers an authenticated remote session over local mode', async () => {
    vi.stubGlobal(
      'localStorage',
      createStorage({ 'lightflux.session.v2': 'local' }),
    );
    mocks.getRemoteSession.mockResolvedValue(true);
    const { loadSessionState } = await import(
      '../services/sessionStorage'
    );

    await expect(loadSessionState()).resolves.toBe('authenticated');
  });

  it('clears local mode and remote sync context on sign out', async () => {
    const storage = createStorage({
      'lightflux.session.v2': 'local',
      'lightflux.session.v1': 'local',
    });
    vi.stubGlobal('localStorage', storage);
    mocks.logoutRemoteSession.mockResolvedValue(undefined);
    const { saveSessionState } = await import(
      '../services/sessionStorage'
    );

    await saveSessionState('signed-out');

    expect(storage.getItem('lightflux.session.v2')).toBeNull();
    expect(storage.getItem('lightflux.session.v1')).toBeNull();
    expect(mocks.logoutRemoteSession).toHaveBeenCalledOnce();
    expect(mocks.resetRemoteSyncContext).toHaveBeenCalledOnce();
  });
});
