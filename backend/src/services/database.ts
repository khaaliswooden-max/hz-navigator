import dotenv from 'dotenv';
import { Pool } from 'pg';

import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

dotenv.config();

// Database configuration
const poolConfig = {
  host: process.env['POSTGRES_HOST'] ?? 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] ?? '5432', 10),
  user: process.env['POSTGRES_USER'] ?? 'hz_admin',
  password: process.env['POSTGRES_PASSWORD'] ?? '',
  database: process.env['POSTGRES_DB'] ?? 'hz_navigator',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);

// Log pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Database helper functions
export const db = {
  /**
   * Execute a query and return results
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env['NODE_ENV'] === 'development') {
      console.info('Executed query', {
        text: text.substring(0, 100),
        duration,
        rows: result.rowCount,
      });
    }

    return result;
  },

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    const client = await pool.connect();
    return client;
  },

  /**
   * Execute a transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Close the pool
   */
  async close(): Promise<void> {
    await pool.end();
  },
};

export default db;

