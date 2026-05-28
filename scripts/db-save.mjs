import { spawnSync } from 'node:child_process';
import { persistirAlCerrar, contarUsuariosEn, CANONICAL_DB } from './db-sync.mjs';

// Detectar si hay un servidor en el puerto 4321 (astro dev típico)
function hayServidorDev() {
  try {
    const r = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true });
    const out = r.stdout || '';
    return out.includes(':4321') && out.includes('LISTENING');
  } catch {
    return false;
  }
}

if (hayServidorDev()) {
  console.error('[db] ✗ Detén primero el servidor (Ctrl+C en npm run dev).');
  console.error('[db]   Guardar con Astro en ejecución puede dañar la base de datos.');
  process.exit(1);
}

const r = persistirAlCerrar();
if (r.ok) {
  console.log(`[db] ✓ Snapshot creado (${r.users} usuario(s) en data/uls-platform.db)`);
  process.exit(0);
}

console.error('[db] ✗ No se pudo guardar. Verifica que exista data/uls-platform.db');
process.exit(1);
