import { drizzle as drizzleNodePostgres } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { MemoryFS, PGlite } from "@electric-sql/pglite";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const schemaSql = `
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  daily_wage NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  day INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'holiday', 'vacation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_unique UNIQUE (employee_id, year, month, day)
);
`;

let dbInstance;

if (process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  dbInstance = drizzleNodePostgres(pool, { schema });
} else {
  const client = new PGlite({ fs: new MemoryFS() });
  await client.exec(schemaSql);
  dbInstance = drizzlePglite(client, { schema });
}

export const db = dbInstance;

export * from "./schema";
