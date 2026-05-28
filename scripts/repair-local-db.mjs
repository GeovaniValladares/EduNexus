/**
 * Repara data/uls-platform.db copiando el snapshot disponible.
 * Cierra npm run dev antes de ejecutar.
 * No requiere sqlite3 CLI.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { isSqliteOk } from './db-integrity.mjs';
import { CANONICAL_DB, SNAPSHOT_DB, copiarBase } from './db-sync.mjs';
import { eliminarArchivosObsoletos } from './db-cleanup.mjs';

console.log('[db] Reparación de data/uls-platform.db\n');

if (existsSync(CANONICAL_DB) && isSqliteOk(CANONICAL_DB)) {
  console.log('[db] La base activa ya está bien.');
  eliminarArchivosObsoletos();
  process.exit(0);
}

mkdirSync(join(process.cwd(), 'data'), { recursive: true });

let fixed = false;

if (isSqliteOk(SNAPSHOT_DB)) {
  if (copiarBase(SNAPSHOT_DB, CANONICAL_DB)) {
    console.log('[db] ✓ Base restaurada desde snapshot');
    fixed = true;
  }
}

if (!fixed) {
  console.log('[db] No se pudo recuperar desde snapshot. Ejecuta: npm run dev:fresh');
  process.exit(1);
}

eliminarArchivosObsoletos();
spawnSync('node', ['scripts/migrate-local-db.mjs'], { stdio: 'inherit', shell: true });

console.log('\n[db] Listo. Ejecuta npm run dev');
