export const postgresConfigFromEnvironment = (environment = process.env) => ({
  connectionString: environment.DATABASE_URL ?? '',
  maxConnections: Number(environment.DATABASE_MAX_CONNECTIONS ?? 10),
  sslEnabled: environment.DATABASE_SSL === 'true',
  sslRejectUnauthorized:
    environment.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
});
