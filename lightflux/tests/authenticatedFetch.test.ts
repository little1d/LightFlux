import { afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getAuthRequestHeaders: vi.fn(async () => ({
    Cookie: 'lightflux-auth.session=secure-cookie',
  })),
  getSession: vi.fn(),
  signInEmailOtp: vi.fn(),
}));

vi.mock('../services/authClient', () => ({
  authClient: {
    getSession: authMocks.getSession,
    signIn: { emailOtp: authMocks.signInEmailOtp },
  },
  getAuthRequestHeaders: authMocks.getAuthRequestHeaders,
}));

vi.mock('../services/authConfig', () => ({
  authApiUrl: 'http://localhost:8787',
  isRemoteAuthConfigured: true,
}));

describe('authenticatedFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    authMocks.getSession.mockReset();
    authMocks.signInEmailOtp.mockReset();
  });

  it('forwards native secure-session headers to API requests', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 204 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { authenticatedFetch } = await import('../services/authApi');

    await authenticatedFetch('http://localhost:8787/api/app-state');

    const request = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(request?.headers).get('Cookie')).toBe(
      'lightflux-auth.session=secure-cookie',
    );
    expect(request?.credentials).toBe('include');
  });

  it('requires the native session to be restorable after OTP verification', async () => {
    authMocks.signInEmailOtp.mockResolvedValue({
      data: { user: { id: 'auth-user' } },
      error: null,
    });
    authMocks.getSession.mockResolvedValue({ data: null });
    const { verifyEmailOtp } = await import('../services/authApi');

    await expect(
      verifyEmailOtp('person@example.com', '123456'),
    ).rejects.toThrow('session could not be restored');
  });
});
