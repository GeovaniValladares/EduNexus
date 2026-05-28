import { eliminarArchivosObsoletos } from './db-cleanup.mjs';

const eliminados = eliminarArchivosObsoletos();

if (eliminados.length === 0) {
  console.log('[db] Nada que limpiar.');
} else {
  console.log('[db] Archivos obsoletos eliminados:');
  for (const f of eliminados) {
    console.log(`  ${f}`);
  }
}
