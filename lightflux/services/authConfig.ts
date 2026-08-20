// Expo inlines `process.env.EXPO_PUBLIC_*` at build time only for direct
// member access, so read the variable directly instead of via an alias.
export const authApiUrl =
  process.env.EXPO_PUBLIC_AUTH_API_URL?.replace(/\/$/, '') ?? '';

export const emailAuthBaseUrl = `${
  authApiUrl || 'http://localhost:8787'
}/api/auth/email`;

export const isRemoteAuthConfigured = authApiUrl.length > 0;
