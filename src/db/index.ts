import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// PostgreSQL is telemetry/evaluation infrastructure, not a prerequisite for /hiwar.
// Reuse the pool across warm Vercel/Node invocations to avoid needless connection churn.
export const pool = databaseUrl
  ? (globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 3_000,
      idleTimeoutMillis: 10_000,
    }))
  : null;

if (pool) {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = pool ? drizzle(pool) : null;
