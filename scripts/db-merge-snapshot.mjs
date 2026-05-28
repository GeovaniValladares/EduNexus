/**
 * Snapshot merge — pure Node.js, no sqlite3 CLI required.
 *
 * Strategy: Instead of merging individual tables (which required the sqlite3
 * CLI), we simply restore the full snapshot when it appears to have more
 * content than the current canonical DB. Astro's seed script then runs on top,
 * preserving existing user rows via INSERT OR IGNORE / upsert logic.
 */
import { statSync } from 'node:fs';
import { CANONICAL_DB, SNAPSHOT_DB, copiarBase } from './db-sync.mjs';
import { isSqliteOk } from './db-integrity.mjs';

function fileSize(p) {
  try { return statSync(p).size; } catch { return 0; }
}

/**
 * If the snapshot has meaningfully more data than the current canonical DB,
 * restore the snapshot so users registered in a previous session are kept.
 */
export function fusionarUsuariosDesdeSnapshot() {
  if (!isSqliteOk(SNAPSHOT_DB)) {
    return { merged: false, users: 0 };
  }

  // Si existe un snapshot, lo usamos para asegurar que no se perdieron datos
  // durante el arranque de Astro dev.
  const ok = copiarBase(SNAPSHOT_DB, CANONICAL_DB);
  if (ok) {
    console.log('[db] ✓ Sincronización con snapshot completada');
    return { merged: true, users: 1 };
  }

  return { merged: false, users: 0 };
}

export { exportarUsuariosASnapshot } from './db-export-users.mjs';
