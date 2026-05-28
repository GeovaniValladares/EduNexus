import {
  existsSync, mkdirSync, unlinkSync, renameSync,
  copyFileSync, statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { isSqliteOk } from './db-integrity.mjs';
import { getDatabaseFilePath } from './db-path.mjs';
import { eliminarArchivosObsoletos } from './db-cleanup.mjs';

/** Base única que usa Astro (ASTRO_DATABASE_FILE). */
export const CANONICAL_DB = join(process.cwd(), 'data', 'uls-platform.db');

/** Copia de seguridad al cerrar npm run dev. */
export const SNAPSHOT_DB = join(process.cwd(), 'data', 'uls-platform.snapshot.db');

/** Solo para migrar datos viejos de Astro, una vez al iniciar. */
export const ASTRO_LEGACY_DB = join(process.cwd(), '.astro', 'content.db');

function esperar(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* spin */ }
}

function fileSize(p) {
  try { return statSync(p).size; } catch { return 0; }
}

/**
 * Check if the database appears to have user data.
 */
export function contarUsuariosEn(dbPath) {
  if (!isSqliteOk(dbPath)) return 0;
  // A freshly seeded DB with 432 subjects + users is usually > 350 KB
  // An empty DB with just schema is ~40-60 KB
  const size = fileSize(dbPath);
  if (size > 300_000) return 'Si (Catalogado)';
  if (size > 80_000) return 'Si (Parcial)';
  return 0;
}

/**
 * Copy a SQLite file using pure Node.js fs.
 * Copies main file + WAL/SHM if present so no data is lost.
 */
export function copiarBase(origen, destino) {
  if (!isSqliteOk(origen)) return false;
  try {
    mkdirSync(dirname(destino), { recursive: true });
    const tmp = destino + '.tmp';

    copyFileSync(origen, tmp);

    // Copy WAL / SHM sidecar files if present
    for (const ext of ['-wal', '-shm']) {
      const src = origen + ext;
      if (existsSync(src)) {
        try { copyFileSync(src, tmp + ext); } catch { /* ignore */ }
      }
    }

    if (!isSqliteOk(tmp)) {
      try { unlinkSync(tmp); } catch { /* ignore */ }
      return false;
    }

    try { if (existsSync(destino)) unlinkSync(destino); } catch { /* ignore */ }
    renameSync(tmp, destino);

    return isSqliteOk(destino);
  } catch {
    return false;
  }
}

/**
 * Antes de arrancar Astro: recuperar snapshot si la base activa falta o es menor.
 */
export function prepararBaseAlInicio() {
  mkdirSync(dirname(CANONICAL_DB), { recursive: true });

  const canonOk   = isSqliteOk(CANONICAL_DB);
  const snapOk    = isSqliteOk(SNAPSHOT_DB);
  const legacyOk  = isSqliteOk(ASTRO_LEGACY_DB);

  if (snapOk) {
    console.log('[db] Cargando estado guardado desde snapshot...');
    copiarBase(SNAPSHOT_DB, CANONICAL_DB);
  } else if (!canonOk && legacyOk) {
    console.log('[db] Migrando datos desde .astro/content.db');
    copiarBase(ASTRO_LEGACY_DB, CANONICAL_DB);
  }

  eliminarArchivosObsoletos();
  return isSqliteOk(CANONICAL_DB) ? 1 : 0;
}

/**
 * Al cerrar el servidor: crea copia snapshot de la base activa.
 */
export function persistirAlCerrar() {
  if (!existsSync(CANONICAL_DB)) return { ok: false, users: 0 };

  esperar(500); // let Astro finish any pending writes

  for (let i = 0; i < 5; i++) {
    if (copiarBase(CANONICAL_DB, SNAPSHOT_DB)) {
      eliminarArchivosObsoletos();
      return { ok: true, users: 1 };
    }
    esperar(800);
  }

  eliminarArchivosObsoletos();
  return { ok: false, users: isSqliteOk(CANONICAL_DB) ? 1 : 0 };
}

/** @deprecated */
export function unificarHaciaCanonica() {
  return { ok: isSqliteOk(CANONICAL_DB), users: isSqliteOk(CANONICAL_DB) ? 1 : 0 };
}

/** @deprecated */
export function restaurarSiConviene() {
  prepararBaseAlInicio();
  return true;
}
