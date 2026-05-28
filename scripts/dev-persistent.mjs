import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ensureCleanDatabase } from './clean-local-db.mjs';
import { getAstroDatabaseFileEnv } from './db-path.mjs';
import { prepararBaseAlInicio, persistirAlCerrar, contarUsuariosEn, CANONICAL_DB } from './db-sync.mjs';
import { fusionarUsuariosDesdeSnapshot, exportarUsuariosASnapshot } from './db-merge-snapshot.mjs';
import { eliminarArchivosObsoletos } from './db-cleanup.mjs';

const dataDir = join(process.cwd(), 'data');
const ENV_LOCAL = join(process.cwd(), '.env.local');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

function asegurarEnvLocal() {
  const linea = 'ASTRO_DATABASE_FILE=data/uls-platform.db';
  const marcador = 'ASTRO_DATABASE_FILE=';

  if (!existsSync(ENV_LOCAL)) {
    writeFileSync(
      ENV_LOCAL,
      `# Base de datos persistente (una sola copia en data/)\n${linea}\n`,
      'utf8'
    );
    return;
  }

  let contenido = readFileSync(ENV_LOCAL, 'utf8');
  if (!contenido.includes(marcador)) {
    contenido = contenido.trimEnd() + `\n\n# Base de datos persistente\n${linea}\n`;
  } else if (!contenido.includes('data/uls-platform.db')) {
    contenido = contenido
      .split('\n')
      .map((l) => (l.startsWith(marcador) ? linea : l))
      .join('\n');
  }
  writeFileSync(ENV_LOCAL, contenido, 'utf8');
}

function esperar(ms) {
  spawnSync('node', ['-e', `setTimeout(()=>{},${ms})`], { stdio: 'ignore', shell: true });
}

asegurarEnvLocal();

const DB_ENV = {
  ...process.env,
  ASTRO_DATABASE_FILE: getAstroDatabaseFileEnv(),
};

console.log('[db] Archivos activos: data/uls-platform.db + data/uls-platform.snapshot.db');
console.log('[db] Usuarios se respaldan al registrarse y al cerrar con Ctrl+C.');
console.log('[db] No cierres la terminal con X forzado; usa Ctrl+C y espera el mensaje de guardado.\n');

const usuariosInicio = prepararBaseAlInicio();
console.log(`[db] Usuarios al iniciar: ${usuariosInicio}\n`);

const estado = ensureCleanDatabase();
if (estado === 'locked') {
  console.error('[db] ✗ Cierra el otro servidor (Ctrl+C) y ejecuta npm run dev.');
  process.exit(1);
}

const child = spawn('npx', ['astro', 'dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
  env: DB_ENV,
});

let postInicioHecho = false;

function postInicio() {
  if (postInicioHecho) return;
  postInicioHecho = true;

  setTimeout(() => {
    spawnSync('node', ['scripts/migrate-local-db.mjs'], { stdio: 'inherit', shell: true });

    const seed = spawn('npx', ['astro', 'db', 'execute', 'db/seed.ts'], {
      stdio: 'inherit',
      shell: true,
      env: DB_ENV,
    });

    seed.on('close', () => {
      const exp = exportarUsuariosASnapshot();
      eliminarArchivosObsoletos();
      const n = contarUsuariosEn(CANONICAL_DB);
      console.log(
        `[db] ✓ Catálogo listo. Usuarios en data/uls-platform.db: ${n}${exp.ok ? ' (snapshot actualizado)' : ''}\n`
      );
    });
  }, 1200);
}

child.stdout?.on('data', (chunk) => {
  process.stdout.write(chunk);
  const text = chunk.toString();
  if (text.includes('Seeded database')) {
    postInicio();
  } else if (text.includes('ready in')) {
    setTimeout(() => {
      if (!postInicioHecho) postInicio();
    }, 5000);
  }
});

child.stderr?.on('data', (chunk) => {
  process.stderr.write(chunk);
});

let cerrando = false;

function esperarCierreProceso(proc, ms = 8000) {
  return new Promise((resolve) => {
    if (proc.killed || proc.exitCode !== null) {
      resolve(proc.exitCode);
      return;
    }
    const t = setTimeout(() => resolve(null), ms);
    proc.once('close', (code) => {
      clearTimeout(t);
      resolve(code);
    });
  });
}

async function cerrarServidor(code = 0) {
  if (cerrando) return;
  cerrando = true;

  console.log('\n[db] Cerrando servidor y guardando (no interrumpas)...');

  try {
    child.kill('SIGINT');
  } catch {
    /* ignore */
  }

  await esperarCierreProceso(child);
  esperar(1200);

  exportarUsuariosASnapshot();

  let guardado = false;
  for (let i = 0; i < 5; i++) {
    const r = persistirAlCerrar();
    if (r.ok) {
      console.log(
        `[db] ✓ Guardado correctamente: ${r.users} usuario(s) en data/uls-platform.db (+ snapshot)`
      );
      guardado = true;
      break;
    }
    console.log('[db] Reintentando guardado...');
    esperar(1000);
  }

  if (!guardado) {
    console.warn(
      '[db] ⚠ No se pudo crear el snapshot. Los datos siguen en data/uls-platform.db si el archivo está íntegro.'
    );
  }

  process.exit(code);
}

process.on('SIGINT', () => {
  cerrarServidor(0);
});

process.on('SIGTERM', () => {
  cerrarServidor(0);
});

child.on('close', async (code) => {
  if (!cerrando) {
    cerrando = true;
    esperar(800);
    const r = persistirAlCerrar();
    if (r.ok) {
      console.log(`[db] ✓ Guardado: ${r.users} usuario(s)`);
    }
  }
  process.exit(code ?? 0);
});
