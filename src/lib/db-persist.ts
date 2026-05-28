import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/**
 * In development: syncs users to the local SQLite snapshot file.
 * In production (Turso remote DB): this is a no-op — Turso persists data automatically.
 */
export function guardarUsuariosEnSnapshot(): void {
  // Skip in production — Turso handles persistence
  if (process.env.ASTRO_DB_REMOTE_URL) return;

  try {
    const script = join(process.cwd(), 'scripts/db-export-users.mjs');
    spawnSync('node', [script], {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: true,
      timeout: 10000,
    });
  } catch {
    // Non-critical — don't crash the app if snapshot fails
  }
}
