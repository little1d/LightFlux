import pg from 'pg';

const { Pool } = pg;

const sslConfiguration = ({ enabled, rejectUnauthorized }) =>
  enabled ? { rejectUnauthorized } : undefined;

export const createPostgresPool = ({
  connectionString,
  maxConnections = 10,
  sslEnabled = false,
  sslRejectUnauthorized = true,
}) => {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }
  if (!Number.isInteger(maxConnections) || maxConnections <= 0) {
    throw new Error('DATABASE_MAX_CONNECTIONS must be a positive integer.');
  }

  const pool = new Pool({
    connectionString,
    max: maxConnections,
    ssl: sslConfiguration({
      enabled: sslEnabled,
      rejectUnauthorized: sslRejectUnauthorized,
    }),
  });
  pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error.', error);
  });
  return pool;
};
