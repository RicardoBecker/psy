/**
 * Helpers para testes de migration contra um PostgreSQL 16 real e
 * descartável (usados por CR-03.1 e CR-03.2). Por padrão aponta para o
 * mesmo Postgres do devOps/docker-compose.yml (postgres/postgres@
 * localhost:5432). Sobrescreva com TEST_DATABASE_ADMIN_URL para apontar
 * para outro host.
 */
import { execSync } from 'child_process';
import { Client } from 'pg';

export const ADMIN_URL =
  process.env.TEST_DATABASE_ADMIN_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres';

export function dbUrl(dbName: string): string {
  const admin = new URL(ADMIN_URL);
  admin.pathname = `/${dbName}`;
  return admin.toString();
}

export function runSqlFile(dbName: string, sqlFile: string): void {
  execSync(`psql "${dbUrl(dbName)}" -v ON_ERROR_STOP=1 -q -f "${sqlFile}"`, { stdio: 'pipe' });
}

export async function createDatabase(dbName: string): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();
}

export async function dropDatabase(dbName: string): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  await admin.end();
}
