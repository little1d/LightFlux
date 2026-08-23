import { authClient, getAuthRequestHeaders } from './authClient';
import {
  authApiUrl,
  isRemoteAuthConfigured,
} from './authConfig';

export { isRemoteAuthConfigured } from './authConfig';

const authError = (
  error: { message?: string } | null,
  fallback: string,
) => new Error(error?.message || fallback);

export const requestEmailOtp = async (email: string): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    throw new Error('Email authentication API is not configured.');
  }
  const result = await authClient.emailOtp.sendVerificationOtp({
    email: email.trim().toLowerCase(),
    type: 'sign-in',
  });
  if (result.error) {
    throw authError(result.error, 'Unable to send the verification code.');
  }
};

export const requestEmailVerificationOtp = async (
  email: string,
): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    throw new Error('Email authentication API is not configured.');
  }
  const result = await authClient.emailOtp.sendVerificationOtp({
    email: email.trim().toLowerCase(),
    type: 'email-verification',
  });
  if (result.error) {
    throw authError(result.error, 'Unable to send the verification code.');
  }
};

export const verifyEmailOtp = async (
  email: string,
  otp: string,
): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    throw new Error('Email authentication API is not configured.');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const result = await authClient.signIn.emailOtp({
    email: normalizedEmail,
    name: normalizedEmail.split('@')[0] || 'LightFlux user',
    otp: otp.trim(),
  });
  if (result.error || !result.data?.user) {
    throw authError(result.error, 'Unable to verify the code.');
  }
  const session = await authClient.getSession();
  if (!session.data?.user) {
    throw new Error('The authenticated session could not be restored.');
  }
};

const requireRestoredSession = async (): Promise<void> => {
  const session = await authClient.getSession();
  if (!session.data?.user) {
    throw new Error('The authenticated session could not be restored.');
  }
};

export const signInWithEmailPassword = async (
  email: string,
  password: string,
): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    throw new Error('Email authentication API is not configured.');
  }
  const result = await authClient.signIn.email({
    email: email.trim().toLowerCase(),
    password,
    rememberMe: true,
  });
  if (result.error || !result.data?.user) {
    throw authError(result.error, 'Unable to sign in with this password.');
  }
  await requireRestoredSession();
};

export const registerWithEmailPassword = async (
  email: string,
  password: string,
): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    throw new Error('Email authentication API is not configured.');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const result = await authClient.signUp.email({
    email: normalizedEmail,
    name: normalizedEmail.split('@')[0] || 'LightFlux user',
    password,
  });
  if (result.error) {
    throw authError(result.error, 'Unable to create this account.');
  }
};

export const verifyPasswordRegistration = async (
  email: string,
  otp: string,
  password: string,
): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    throw new Error('Email authentication API is not configured.');
  }
  const normalizedEmail = email.trim().toLowerCase();
  const verification = await authClient.emailOtp.verifyEmail({
    email: normalizedEmail,
    otp: otp.trim(),
  });
  if (verification.error || !verification.data?.status) {
    throw authError(
      verification.error,
      'Unable to verify the registration code.',
    );
  }
  await signInWithEmailPassword(normalizedEmail, password);
};

export const getRemoteSession = async (): Promise<boolean> => {
  if (!isRemoteAuthConfigured) {
    return false;
  }
  const result = await authClient.getSession();
  return Boolean(result.data?.user);
};

// Whether the signed-in email account already has a credential password. Used
// after an OTP sign-in to decide whether to offer setting one, so the account
// can sign in with email + password next time.
export const getPasswordStatus = async (): Promise<boolean> => {
  if (!isRemoteAuthConfigured) {
    return true;
  }
  const response = await authenticatedFetch(
    `${authApiUrl}/api/auth/password-status`,
  );
  if (!response.ok) {
    throw new Error('Unable to check the password status.');
  }
  const body = (await response.json()) as { hasPassword?: boolean };
  return Boolean(body.hasPassword);
};

// Set the credential password for the signed-in email account. Fails if a
// password is already set (409) or the value is out of bounds (400).
export const setAccountPassword = async (
  password: string,
): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    throw new Error('Email authentication API is not configured.');
  }
  const response = await authenticatedFetch(
    `${authApiUrl}/api/auth/set-password`,
    {
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error || 'Unable to set the password.');
  }
};

export interface RemoteUser {
  id: string;
  email: string;
  avatarUrl?: string;
  name?: string;
}

export const getRemoteUser = async (): Promise<RemoteUser | null> => {
  if (!isRemoteAuthConfigured) {
    return null;
  }
  const result = await authClient.getSession();
  if (!result.data?.user) {
    return null;
  }
  const { user } = result.data;
  return {
    id: user.id,
    email: user.email,
    avatarUrl: user.image || undefined,
    name: user.name || undefined,
  };
};

export const updateRemoteProfile = async ({
  avatarUrl,
  name,
}: {
  avatarUrl?: string;
  name?: string;
}): Promise<RemoteUser> => {
  if (!isRemoteAuthConfigured) {
    throw new Error('Email authentication API is not configured.');
  }
  const result = await authClient.updateUser({
    ...(avatarUrl !== undefined ? { image: avatarUrl } : {}),
    ...(name !== undefined ? { name: name.trim() } : {}),
  });
  if (result.error) {
    throw authError(result.error, 'Unable to update this profile.');
  }
  const user = await getRemoteUser();
  if (!user) {
    throw new Error('The updated session could not be restored.');
  }
  return user;
};

export const logoutRemoteSession = async (): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    return;
  }
  const result = await authClient.signOut();
  if (result.error) {
    throw authError(result.error, 'Unable to sign out.');
  }
};

export const authenticatedFetch = async (
  input: string,
  init: RequestInit = {},
): Promise<Response> => {
  const headers = new Headers(init.headers);
  const authHeaders = await getAuthRequestHeaders();
  for (const [name, value] of Object.entries(authHeaders)) {
    headers.set(name, value);
  }
  return fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
};

export interface RemoteAppStateSnapshot {
  ownerId: string;
  revision: number;
  state: unknown | null;
}

export class RemoteAppStateConflictError extends Error {
  snapshot: RemoteAppStateSnapshot;

  constructor(snapshot: RemoteAppStateSnapshot) {
    super('A newer app state already exists.');
    this.snapshot = snapshot;
  }
}

export const loadRemoteAppState =
  async (): Promise<RemoteAppStateSnapshot | null> => {
  if (!isRemoteAuthConfigured) {
    return null;
  }
  const response = await authenticatedFetch(
    `${authApiUrl}/api/app-state`,
  );
  if (response.status === 401) {
    return null;
  }
  const body = (await response.json()) as {
    ownerId?: string;
    revision?: number;
    state?: unknown;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || 'Unable to load task data.');
  }
  if (
    typeof body.ownerId !== 'string' ||
    !Number.isSafeInteger(body.revision) ||
    (body.revision ?? -1) < 0
  ) {
    throw new Error('The cloud returned invalid synchronization metadata.');
  }
  const revision = body.revision as number;
  return {
    ownerId: body.ownerId,
    revision,
    state: body.state ?? null,
  };
};

export const saveRemoteAppState = async (
  state: unknown,
  baseRevision: number,
): Promise<number> => {
  if (!isRemoteAuthConfigured) {
    return baseRevision;
  }
  const response = await authenticatedFetch(
    `${authApiUrl}/api/app-state`,
    {
      body: JSON.stringify({ baseRevision, state }),
      headers: { 'Content-Type': 'application/json' },
      method: 'PUT',
    },
  );
  const body = (await response.json()) as {
    error?: string;
    ownerId?: string;
    revision?: number;
    state?: unknown;
  };
  if (
    response.status === 409 &&
    Number.isSafeInteger(body.revision) &&
    (body.revision ?? -1) >= 0
  ) {
    throw new RemoteAppStateConflictError({
      ownerId: body.ownerId ?? '',
      revision: body.revision as number,
      state: body.state ?? null,
    });
  }
  if (!response.ok) {
    throw new Error(body.error || 'Unable to save task data.');
  }
  if (!Number.isSafeInteger(body.revision) || (body.revision ?? -1) <= 0) {
    throw new Error('The cloud returned an invalid app-state revision.');
  }
  return body.revision as number;
};
