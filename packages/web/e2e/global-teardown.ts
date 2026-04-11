import { execSync } from 'child_process';
import path from 'path';

export default function globalTeardown() {
  const apiDir = path.resolve(import.meta.dirname, '../../../api');
  try {
    execSync('npx tsx --env-file=.env src/db/clean.ts', {
      cwd: apiDir,
      stdio: 'inherit',
      env: { ...process.env, PATH: process.env['PATH'] },
    });
  } catch {
    console.warn('Global teardown: cleanup script failed, skipping');
  }
}
