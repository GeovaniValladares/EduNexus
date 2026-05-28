/**
 * Export / snapshot — pure Node.js, no sqlite3 CLI required.
 *
 * We copy the entire canonical DB to the snapshot file.
 * This is safe to do while Astro is running because:
 *  - SQLite WAL mode keeps a consistent read view
 *  - We copy the .db + .db-wal files together so the snapshot is consistent
 */
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { CANONICAL_DB, SNAPSHOT_DB, copiarBase } from './db-sync.mjs';
import { isSqliteOk } from './db-integrity.mjs';

export function exportarUsuariosASnapshot() {
  if (!isSqliteOk(CANONICAL_DB)) {
    return { ok: false, users: 0 };
  }

  mkdirSync(dirname(SNAPSHOT_DB), { recursive: true });

  const ok = copiarBase(CANONICAL_DB, SNAPSHOT_DB);
  return { ok, users: ok ? 1 : 0 };
}
