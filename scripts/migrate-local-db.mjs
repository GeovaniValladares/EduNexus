/**
 * Applies missing column migrations to the local DB using the file:// URL
 * that Astro DB uses. Runs after Astro starts (so the DB file already exists).
 *
 * Uses Astro's own @astrojs/db runtime client — no sqlite3 CLI needed.
 * Each ALTER TABLE is wrapped in try/catch so duplicate-column errors are ignored.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { CANONICAL_DB } from './db-sync.mjs';

// All column additions ever made to the schema.
// SQLite ignores "duplicate column" at the error level — we filter them out.
const MIGRATIONS = [
  // ── Original columns (pre-ULS) ──────────────────────────────────────────
  `ALTER TABLE User ADD COLUMN cvText TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE User ADD COLUMN cvData TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE User ADD COLUMN cvUpdatedAt TEXT`,
  `ALTER TABLE Application ADD COLUMN cvText TEXT NOT NULL DEFAULT ''`,

  // ── ULS Ciclo / Perfil columns ───────────────────────────────────────────
  `ALTER TABLE User ADD COLUMN ciclo TEXT`,
  `ALTER TABLE User ADD COLUMN telefono TEXT`,
  `ALTER TABLE User ADD COLUMN perfilCompleto INTEGER DEFAULT 0`,
  `ALTER TABLE User ADD COLUMN avatarUrl TEXT`,

  // ── Enrollment estado ────────────────────────────────────────────────────
  `ALTER TABLE Enrollment ADD COLUMN estado TEXT DEFAULT 'pending'`,

  // ── Attendance table (CREATE IF NOT EXISTS) ──────────────────────────────
  `CREATE TABLE IF NOT EXISTS Attendance (
     id         TEXT PRIMARY KEY,
     userId     TEXT NOT NULL REFERENCES User(id),
     subjectId  TEXT NOT NULL REFERENCES Subject(id),
     fecha      TEXT NOT NULL,
     presente   INTEGER NOT NULL DEFAULT 0,
     nota       TEXT,
     createdAt  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

function runMigration(sql) {
  // Use node + @astrojs/db is complex; instead, use the file directly via
  // the built-in SQLite support that ships with Node 22 (node:sqlite, ESM).
  // If that's unavailable, fall back to a no-op (Astro handles schema on restart).
  try {
    // node:sqlite is only available as dynamic import in ESM or top-level in recent Node 22
    // We omit the manual execution here and let the async main handle it
  } catch {
    // Silent fallback
  }
}

// Node 22 has experimental sqlite — try it
async function main() {
  if (!existsSync(CANONICAL_DB)) {
    console.log('[migrate] DB no existe aún — se omite (Astro la creará).');
    return;
  }

  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import('node:sqlite'));
  } catch {
    console.log('[migrate] node:sqlite no disponible — migraciones se aplican en tiempo de ejecución por Astro.');
    return;
  }

  const db = new DatabaseSync(CANONICAL_DB);

  let applied = 0;
  for (const sql of MIGRATIONS) {
    try {
      db.exec(sql);
      applied++;
    } catch (e) {
      const msg = String(e?.message ?? e);
      if (
        msg.includes('duplicate column name') ||
        msg.includes('already exists') ||
        msg.includes('table already exists')
      ) {
        // Expected — column/table already present
        continue;
      }
      console.warn(`[migrate] Aviso: ${msg.slice(0, 120)}`);
    }
  }

  db.close();
  console.log(`[migrate] ✓ Migraciones aplicadas (${applied} cambios nuevos) en ${CANONICAL_DB}`);
}

main().catch((e) => {
  console.warn('[migrate] Error en migraciones:', String(e?.message ?? e).slice(0, 200));
});
