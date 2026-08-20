const publicEnvironment = process.env as Record<string, string | undefined>;

export const authApiUrl =
  publicEnvironment.EXPO_PUBLIC_AUTH_API_URL?.replace(/\/$/, '') ?? '';

export const emailAuthBaseUrl = `${
  authApiUrl || 'http://localhost:8787'
}/api/auth/email`;

export const isRemoteAuthConfigured = authApiUrl.length > 0;
