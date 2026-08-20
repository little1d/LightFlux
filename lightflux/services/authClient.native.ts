import { expoClient } from '@better-auth/expo/client';
import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import * as SecureStore from 'expo-secure-store';

import { emailAuthBaseUrl } from './authConfig';

export const authClient = createAuthClient({
  baseURL: emailAuthBaseUrl,
  plugins: [
    expoClient({
      cookiePrefix: 'lightflux-auth',
      scheme: 'lightflux',
      storage: SecureStore,
      storagePrefix: 'lightflux-auth',
    }),
    emailOTPClient(),
  ],
});

export const getAuthRequestHeaders = async (): Promise<
  Record<string, string>
> => {
  const cookie = await authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
};
