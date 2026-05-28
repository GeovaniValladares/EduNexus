import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const BACKUP_DEFAULT = join(process.cwd(), 'data', 'uls-platform.db');

/** Ruta en disco para sqlite3 y backups (Windows/Linux). */
export function getDatabaseFilePath() {
  const fromEnv = process.env.ASTRO_DATABASE_FILE;
  if (fromEnv) {
    if (fromEnv.startsWith('file://')) {
      return fileURLToPath(fromEnv);
    }
    if (fromEnv.startsWith('/') || /^[A-Za-z]:[\\/]/.test(fromEnv)) {
      return fromEnv;
    }
    return join(process.cwd(), fromEnv);
  }
  return BACKUP_DEFAULT;
}

/** Valor para ASTRO_DATABASE_FILE (libsql exige esquema file://). */
export function getAstroDatabaseFileEnv() {
  return pathToFileURL(getDatabaseFilePath()).href;
}

/** @deprecated alias */
export function getDatabasePath() {
  return getDatabaseFilePath();
}
