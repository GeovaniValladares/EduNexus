import { unlinkSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { removeLiveDb } from './clean-local-db.mjs';
import { CANONICAL_DB, SNAPSHOT_DB } from './db-sync.mjs';
import { eliminarArchivosObsoletos } from './db-cleanup.mjs';

const dataDir = join(process.cwd(), 'data');

function eliminarSiExiste(f) {
  if (!existsSync(f)) return true;
  try {
    unlinkSync(f);
    console.log(`[db] Eliminado: ${f}`);
    return true;
  } catch {
    return false;
  }
}

let locked = false;

for (const base of [CANONICAL_DB, SNAPSHOT_DB]) {
  for (const f of [`${base}`, `${base}-wal`, `${base}-shm`]) {
    if (!eliminarSiExiste(f)) locked = true;
  }
}

if (existsSync(dataDir)) {
  for (const name of readdirSync(dataDir)) {
    if (name.includes('.corrupt-') || name.endsWith('.bak') || name.endsWith('.tmp')) {
      if (!eliminarSiExiste(join(dataDir, name))) locked = true;
    }
  }
}

try {
  removeLiveDb();
} catch {
  locked = true;
}

eliminarArchivosObsoletos();
mkdirSync(dataDir, { recursive: true });

if (locked) {
  console.error('\n[db] ✗ Archivo en uso. En la terminal del servidor pulsa Ctrl+C y ejecuta:');
  console.error('    npm run dev:fresh\n');
  process.exit(1);
}

console.log('[db] Bases eliminadas. Ejecuta npm run dev');
