/**
 * Libera puertos del dev server, borra bases y recrea datos en data/uls-platform.db.
 * Uso: npm run db:force-reset
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { isSqliteOk } from './db-integrity.mjs';
import { CANONICAL_DB, SNAPSHOT_DB } from './db-sync.mjs';
import { getAstroDatabaseFileEnv } from './db-path.mjs';
import { eliminarArchivosObsoletos } from './db-cleanup.mjs';

const PORTS = [4321, 4322, 4329, 4399];
const DB_ENV = {
  ...process.env,
  ASTRO_DATABASE_FILE: getAstroDatabaseFileEnv(),
};

function stopDevServers() {
  if (process.platform === 'win32') {
    const ports = PORTS.join(',');
    spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `foreach ($p in @(${ports})) { Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }`,
      ],
      { stdio: 'ignore' }
    );
  } else {
    for (const p of PORTS) {
      spawnSync('sh', ['-c', `lsof -ti:${p} | xargs kill -9 2>/dev/null`], { stdio: 'ignore' });
    }
  }
  spawnSync('node', ['-e', 'setTimeout(()=>{},2000)'], { shell: true, stdio: 'ignore' });
}

console.log('[db] Reinicio forzado de la base de datos...\n');
stopDevServers();

const reset = spawnSync('node', ['scripts/reset-local-db.mjs'], {
  encoding: 'utf8',
  shell: true,
});
if (reset.stdout) process.stdout.write(reset.stdout);
if (reset.status !== 0) {
  console.error('\n[db] Cierra npm run dev (Ctrl+C) y vuelve a ejecutar: npm run db:force-reset');
  process.exit(1);
}

console.log('[db] Creando base nueva (espera ~15 s)...\n');

spawnSync('npx', ['astro', 'dev', '--port', '4399'], {
  shell: true,
  stdio: 'inherit',
  timeout: 35000,
  env: DB_ENV,
});

stopDevServers();
eliminarArchivosObsoletos();

if (!existsSync(CANONICAL_DB) || !isSqliteOk(CANONICAL_DB)) {
  console.error('[db] ✗ Falló la creación. Ejecuta npm run dev y espera "Seeded database".');
  process.exit(1);
}

mkdirSync(join(process.cwd(), 'data'), { recursive: true });
const { copiarBase } = await import('./db-sync.mjs');
copiarBase(CANONICAL_DB, SNAPSHOT_DB);
spawnSync('node', ['scripts/migrate-local-db.mjs'], { stdio: 'inherit', shell: true });

console.log('\n[db] ✓ Listo en data/uls-platform.db. Ejecuta: npm run dev\n');

