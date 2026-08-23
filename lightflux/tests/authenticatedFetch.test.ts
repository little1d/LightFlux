import { afterEach, describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  getAuthRequestHeaders: vi.fn(async () => ({
    Cookie: 'lightflux-auth.session=secure-cookie',
  })),
  getSession: vi.fn(),
  signInEmailOtp: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('../services/authClient', () => ({
  authClient: {
    getSession: authMocks.getSession,
    signIn: { emailOtp: authMocks.signInEmailOtp },
    updateUser: authMocks.updateUser,
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
    authMocks.updateUser.mockReset();
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

  it('updates the profile and returns the refreshed session user', async () => {
    authMocks.updateUser.mockResolvedValue({
      data: { status: true },
      error: null,
    });
    authMocks.getSession.mockResolvedValue({
      data: {
        user: {
          email: 'person@example.com',
          id: 'auth-user',
          image: 'https://cdn.example.com/avatar.png',
          name: 'Updated Profile',
        },
      },
    });
    const { updateRemoteProfile } = await import('../services/authApi');

    await expect(
      updateRemoteProfile({
        avatarUrl: 'https://cdn.example.com/avatar.png',
        name: ' Updated Profile ',
      }),
    ).resolves.toEqual({
      avatarUrl: 'https://cdn.example.com/avatar.png',
      email: 'person@example.com',
      id: 'auth-user',
      name: 'Updated Profile',
    });
    expect(authMocks.updateUser).toHaveBeenCalledWith({
      image: 'https://cdn.example.com/avatar.png',
      name: 'Updated Profile',
    });
  });
});
