import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export function temariPool(): mysql.Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Managed database is not configured");
    pool = mysql.createPool(url);
  }
  return pool;
}

export async function rows<T = Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T[]> {
  const [result] = await temariPool().execute(sql, values as (string | number | Date | Buffer | null)[]);
  return result as T[];
}

export async function one<T = Record<string, unknown>>(sql: string, values: unknown[] = []): Promise<T | undefined> {
  const result = await rows<T>(sql, values);
  return result[0];
}

export async function transaction<T>(work: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const connection = await temariPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function readOptions(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}
