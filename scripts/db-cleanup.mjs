import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const DATA_DIR = join(process.cwd(), 'data');
const ASTRO_LEGACY_DB = join(process.cwd(), '.astro', 'content.db');

/** Quita copias viejas de Astro y archivos corruptos/temporales en data/. */
export function eliminarArchivosObsoletos() {
  const eliminados = [];

  const legacy = [
    ASTRO_LEGACY_DB,
    `${ASTRO_LEGACY_DB}-wal`,
    `${ASTRO_LEGACY_DB}-shm`,
    `${ASTRO_LEGACY_DB}.bak`,
  ];

  for (const f of legacy) {
    if (!existsSync(f)) continue;
    try {
      unlinkSync(f);
      eliminados.push(f);
    } catch {
      /* servidor en marcha */
    }
  }

  if (existsSync(DATA_DIR)) {
    for (const name of readdirSync(DATA_DIR)) {
      if (
        name.includes('.corrupt-') ||
        name.endsWith('.bak') ||
        name.endsWith('.tmp') ||
        name.endsWith('.new')
      ) {
        const ruta = join(DATA_DIR, name);
        try {
          unlinkSync(ruta);
          eliminados.push(ruta);
        } catch {
          /* ignore */
        }
      }
    }
  }

  return eliminados;
}
