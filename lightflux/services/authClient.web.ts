import { createAuthClient } from 'better-auth/client';
import { emailOTPClient } from 'better-auth/client/plugins';

import { emailAuthBaseUrl } from './authConfig';

export const authClient = createAuthClient({
  baseURL: emailAuthBaseUrl,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [emailOTPClient()],
});

export const getAuthRequestHeaders = async (): Promise<
  Record<string, string>
> => ({});
