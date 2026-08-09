import { Platform } from 'react-native';

const apiUrl = process.env.EXPO_PUBLIC_AUTH_API_URL?.replace(/\/$/, '') ?? '';

export const isRemoteAuthConfigured = apiUrl.length > 0;

export const getRemoteSession = async (): Promise<boolean> => {
  if (!isRemoteAuthConfigured) {
    return false;
  }

  const response = await fetch(`${apiUrl}/api/auth/session`, {
    credentials: 'include',
  });
  return response.ok;
};

export const logoutRemoteSession = async (): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    return;
  }

  await fetch(`${apiUrl}/api/auth/logout`, {
    credentials: 'include',
    method: 'POST',
  });
};

export const beginWechatLogin = async (): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    throw new Error('WeChat authentication API is not configured.');
  }

  if (Platform.OS !== 'web') {
    throw new Error(
      'The native WeChat SDK requires an approved AppID and a development build.',
    );
  }

  const returnTo = globalThis.location?.href;
  const response = await fetch(
    `${apiUrl}/api/auth/wechat/web/start?return_to=${encodeURIComponent(
      returnTo ?? '',
    )}`,
    { credentials: 'include' },
  );
  const body = (await response.json()) as {
    authorizationUrl?: string;
    error?: string;
  };

  if (!response.ok || !body.authorizationUrl) {
    throw new Error(body.error || 'Unable to start WeChat login.');
  }

  globalThis.location?.assign(body.authorizationUrl);
};

export interface WechatMobileAuthRequest {
  appId: string;
  scope: string;
  state: string;
}

export const getWechatMobileAuthRequest =
  async (): Promise<WechatMobileAuthRequest> => {
    const response = await fetch(`${apiUrl}/api/auth/wechat/mobile/state`, {
      credentials: 'include',
    });
    const body = (await response.json()) as WechatMobileAuthRequest & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(body.error || 'Unable to initialize WeChat login.');
    }
    return body;
  };

export const exchangeWechatMobileCode = async (
  code: string,
  state: string,
): Promise<{ token: string; expiresIn: number }> => {
  const response = await fetch(
    `${apiUrl}/api/auth/wechat/mobile/exchange`,
    {
      body: JSON.stringify({ code, state }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    },
  );
  const body = (await response.json()) as {
    token?: string;
    expiresIn?: number;
    error?: string;
  };
  if (!response.ok || !body.token || !body.expiresIn) {
    throw new Error(body.error || 'Unable to complete WeChat login.');
  }
  return { token: body.token, expiresIn: body.expiresIn };
};

export const loadRemoteAppState = async (): Promise<unknown | null> => {
  if (!isRemoteAuthConfigured) {
    return null;
  }
  const response = await fetch(`${apiUrl}/api/app-state`, {
    credentials: 'include',
  });
  if (response.status === 401) {
    return null;
  }
  const body = (await response.json()) as {
    state?: unknown;
    error?: string;
  };
  if (!response.ok) {
    throw new Error(body.error || 'Unable to load task data.');
  }
  return body.state ?? null;
};

export const saveRemoteAppState = async (state: unknown): Promise<void> => {
  if (!isRemoteAuthConfigured) {
    return;
  }
  const response = await fetch(`${apiUrl}/api/app-state`, {
    body: JSON.stringify({ state }),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'PUT',
  });
  if (!response.ok) {
    const body = (await response.json()) as { error?: string };
    throw new Error(body.error || 'Unable to save task data.');
  }
};
