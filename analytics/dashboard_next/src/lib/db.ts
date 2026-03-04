import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var analyticsPool: Pool | undefined;
}

function getPool(): Pool {
  if (global.analyticsPool) {
    return global.analyticsPool;
  }
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString: value });
  if (process.env.NODE_ENV !== "production") {
    global.analyticsPool = pool;
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query(sql, params);
  return result.rows as T[];
}
