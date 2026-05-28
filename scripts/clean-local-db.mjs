import { existsSync, unlinkSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isSqliteOk } from './db-integrity.mjs';
import { getDatabaseFilePath } from './db-path.mjs';
import { CANONICAL_DB, SNAPSHOT_DB } from './db-sync.mjs';

const LIVE = getDatabaseFilePath();

/** Elimina la base activa y archivos WAL/SHM asociados. */
export function removeLiveDb() {
  const base = LIVE.replace(/\.db$/, '');
  for (const f of [`${base}.db`, `${base}.db-wal`, `${base}.db-shm`]) {
    if (existsSync(f)) {
      try {
        unlinkSync(f);
      } catch {
        /* archivo en uso */
      }
    }
  }
}

export function restoreFromBackup() {
  const fuente = isSqliteOk(SNAPSHOT_DB) ? SNAPSHOT_DB : isSqliteOk(CANONICAL_DB) ? CANONICAL_DB : null;
  if (!fuente) return false;

  mkdirSync(dirname(LIVE), { recursive: true });
  try {
    copyFileSync(fuente, LIVE);
    // Copy WAL/SHM sidecars if present
    for (const ext of ['-wal', '-shm']) {
      const src = fuente + ext;
      if (existsSync(src)) {
        try { copyFileSync(src, LIVE + ext); } catch { /* ignore */ }
      }
    }
    return isSqliteOk(LIVE);
  } catch {
    return false;
  }
}

/**
 * Garantiza una base válida o ninguna (Astro creará una nueva).
 * @returns {'ok' | 'fresh' | 'locked'}
 */
export function ensureCleanDatabase() {
  mkdirSync(join(process.cwd(), 'data'), { recursive: true });
  mkdirSync(dirname(LIVE), { recursive: true });

  if (existsSync(LIVE) && !isSqliteOk(LIVE)) {
    console.warn('[db] Base dañada detectada; eliminando archivos locales...');
    removeLiveDb();
  }

  if (!existsSync(LIVE)) {
    if (restoreFromBackup()) {
      console.log('[db] ✓ Restaurado desde data/uls-platform.db');
      return 'ok';
    }
    if (existsSync(SNAPSHOT_DB) && !isSqliteOk(SNAPSHOT_DB)) {
      try {
        unlinkSync(SNAPSHOT_DB);
        console.warn('[db] Snapshot corrupto eliminado.');
      } catch {
        /* ignore */
      }
    }
    return 'fresh';
  }

  if (isSqliteOk(LIVE)) return 'ok';

  try {
    removeLiveDb();
  } catch {
    return 'locked';
  }

  if (existsSync(LIVE)) return 'locked';
  return restoreFromBackup() ? 'ok' : 'fresh';
}
