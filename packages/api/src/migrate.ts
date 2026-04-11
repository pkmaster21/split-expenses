import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { sql } from 'drizzle-orm';
import { readMigrationFiles } from 'drizzle-orm/migrator';

const sqlClient = neon(process.env['DATABASE_URL']!);
const db = drizzle(sqlClient);

if (process.argv.includes('--baseline')) {
  // Mark all existing migrations as applied without running them.
  // Use this when the database schema was created via `drizzle-kit push`
  // and you need to initialize the migrations tracking table.
  const migrations = readMigrationFiles({ migrationsFolder: './drizzle' });
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
  let baselined = 0;
  for (const migration of migrations) {
    const existing = await db.execute(
      sql`SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = ${migration.hash}`
    );
    if (existing.rows.length === 0) {
      await db.execute(
        sql`INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
            VALUES (${migration.hash}, ${migration.folderMillis})`
      );
      baselined++;
    }
  }
  console.log(`Baselined ${baselined} migration(s)`);
} else {
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations applied successfully');
}
