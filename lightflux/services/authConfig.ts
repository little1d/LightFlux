import Constants from 'expo-constants';

// Expo inlines `process.env.EXPO_PUBLIC_*` at build time only for direct
// member access, so read the variable directly instead of via an alias.
const configuredAuthApiUrl =
  process.env.EXPO_PUBLIC_AUTH_API_URL?.replace(/\/$/, '') ?? '';

export const resolveDevelopmentAuthApiUrl = (
  hostUri: string | undefined,
): string => {
  if (!hostUri) {
    return 'http://localhost:8787';
  }
  try {
    const url = new URL(
      hostUri.includes('://') ? hostUri : `http://${hostUri}`,
    );
    return `http://${url.hostname}:8787`;
  } catch {
    return 'http://localhost:8787';
  }
};

const developmentAuthApiUrl =
  typeof __DEV__ !== 'undefined' && __DEV__
    ? resolveDevelopmentAuthApiUrl(Constants.expoConfig?.hostUri)
    : '';

export const authApiUrl =
  configuredAuthApiUrl || developmentAuthApiUrl;

export const emailAuthBaseUrl = `${
  authApiUrl || 'http://localhost:8787'
}/api/auth/email`;

export const isRemoteAuthConfigured = authApiUrl.length > 0;
