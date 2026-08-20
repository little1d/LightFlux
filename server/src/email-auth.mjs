import { randomUUID } from 'node:crypto';

import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';

export const EMAIL_AUTH_BASE_PATH = '/api/auth/email';
export const EMAIL_AUTH_PROVIDER = 'better-auth-email';

const unique = (values) => [...new Set(values.filter(Boolean))];

export const createEmailAuth = ({
  baseUrl,
  database,
  ipAddressHeaders = [],
  secret,
  sendOtp,
  trustedProxies = [],
  trustedOrigins = [],
}) => {
  if (!database) {
    throw new Error('A PostgreSQL pool is required for email authentication.');
  }
  if (typeof secret !== 'string' || secret.length < 32) {
    throw new Error(
      'BETTER_AUTH_SECRET must contain at least 32 characters.',
    );
  }
  if (typeof sendOtp !== 'function') {
    throw new Error('An OTP email sender is required.');
  }

  return betterAuth({
    appName: 'LightFlux',
    basePath: EMAIL_AUTH_BASE_PATH,
    baseURL: baseUrl,
    database,
    secret,
    trustedOrigins: unique(trustedOrigins),
    advanced: {
      cookiePrefix: 'lightflux-auth',
      database: {
        generateId: () => randomUUID(),
      },
      ...((ipAddressHeaders.length > 0 || trustedProxies.length > 0) && {
        ipAddress: {
          ...(ipAddressHeaders.length > 0 && { ipAddressHeaders }),
          ...(trustedProxies.length > 0 && { trustedProxies }),
        },
      }),
      useSecureCookies: baseUrl.startsWith('https://'),
    },
    user: {
      modelName: 'email_auth_users',
      fields: {
        createdAt: 'created_at',
        emailVerified: 'email_verified',
        updatedAt: 'updated_at',
      },
    },
    session: {
      modelName: 'email_auth_sessions',
      expiresIn: 30 * 24 * 60 * 60,
      fields: {
        createdAt: 'created_at',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        updatedAt: 'updated_at',
        userAgent: 'user_agent',
        userId: 'auth_user_id',
      },
    },
    account: {
      modelName: 'email_auth_accounts',
      fields: {
        accessToken: 'access_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        accountId: 'account_id',
        createdAt: 'created_at',
        idToken: 'id_token',
        providerId: 'provider_id',
        refreshToken: 'refresh_token',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        updatedAt: 'updated_at',
        userId: 'auth_user_id',
      },
    },
    verification: {
      modelName: 'email_auth_verifications',
      fields: {
        createdAt: 'created_at',
        expiresAt: 'expires_at',
        updatedAt: 'updated_at',
      },
      storeIdentifier: 'hashed',
    },
    rateLimit: {
      enabled: true,
      max: 100,
      modelName: 'email_auth_rate_limits',
      storage: 'database',
      window: 60,
      fields: {
        lastRequest: 'last_request',
      },
    },
    plugins: [
      expo(),
      emailOTP({
        allowedAttempts: 3,
        expiresIn: 5 * 60,
        otpLength: 6,
        rateLimit: {
          max: 3,
          window: 60,
        },
        resendStrategy: 'rotate',
        storeOTP: 'hashed',
        sendVerificationOTP: ({ email, otp, type }) =>
          sendOtp({ email, otp, type }),
      }),
    ],
  });
};
