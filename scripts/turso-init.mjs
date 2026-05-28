/**
 * turso-init.mjs
 * Crea todas las tablas en la base de datos Turso (ejecución única antes del primer deploy).
 *
 * Uso (PowerShell):
 *   $env:ASTRO_DB_REMOTE_URL = "libsql://edunexus-geovani.aws-us-east-2.turso.io"
 *   $env:ASTRO_DB_APP_TOKEN  = "eyJ..."
 *   node scripts/turso-init.mjs
 */
import { createClient } from '@libsql/client';

const url   = process.env.ASTRO_DB_REMOTE_URL;
const token = process.env.ASTRO_DB_APP_TOKEN;

if (!url || !token) {
  console.error('Faltan ASTRO_DB_REMOTE_URL o ASTRO_DB_APP_TOKEN');
  process.exit(1);
}

const db = createClient({ url, authToken: token });

const tables = [
  `CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    carrera TEXT NOT NULL DEFAULT '',
    ciclo TEXT,
    telefono TEXT,
    perfilCompleto INTEGER,
    avatarUrl TEXT,
    hashedPassword TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'alumno',
    cvText TEXT NOT NULL DEFAULT '',
    cvData TEXT NOT NULL DEFAULT '',
    cvUpdatedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS "Session" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "User"(id),
    expiresAt TEXT NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "Subject" (
    id TEXT PRIMARY KEY,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    carrera TEXT NOT NULL,
    semestre TEXT NOT NULL,
    creditos REAL NOT NULL,
    profesor TEXT NOT NULL DEFAULT '',
    horario TEXT NOT NULL DEFAULT '',
    aula TEXT NOT NULL DEFAULT '',
    cupo REAL NOT NULL DEFAULT 35
  )`,

  `CREATE TABLE IF NOT EXISTS "Enrollment" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "User"(id),
    subjectId TEXT NOT NULL REFERENCES "Subject"(id),
    estado TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS "Opportunity" (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    empresa TEXT NOT NULL,
    companyId TEXT REFERENCES "User"(id),
    tipo TEXT NOT NULL,
    horasSemanales REAL NOT NULL,
    duracionSemanas REAL NOT NULL,
    duracionLabel TEXT NOT NULL,
    ubicacion TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    requisitos TEXT NOT NULL,
    carreras TEXT NOT NULL DEFAULT '',
    activo INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS "Application" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "User"(id),
    opportunityId TEXT NOT NULL REFERENCES "Opportunity"(id),
    estado TEXT NOT NULL DEFAULT 'pending',
    mensaje TEXT NOT NULL DEFAULT '',
    cvText TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS "ApplicationHistory" (
    id TEXT PRIMARY KEY,
    applicationId TEXT NOT NULL REFERENCES "Application"(id),
    estado TEXT NOT NULL,
    comentario TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS "Attendance" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "User"(id),
    subjectId TEXT NOT NULL REFERENCES "Subject"(id),
    fecha TEXT NOT NULL,
    presente INTEGER NOT NULL DEFAULT 0,
    nota TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS "Notice" (
    id TEXT PRIMARY KEY,
    subjectId TEXT NOT NULL REFERENCES "Subject"(id),
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    urgente INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS "Evaluation" (
    id TEXT PRIMARY KEY,
    subjectId TEXT NOT NULL REFERENCES "Subject"(id),
    userId TEXT NOT NULL REFERENCES "User"(id),
    titulo TEXT NOT NULL,
    nota REAL NOT NULL,
    comentario TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  `CREATE TABLE IF NOT EXISTS "Tramite" (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES "User"(id),
    tipo TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente',
    folio TEXT NOT NULL DEFAULT '',
    materiasCount REAL NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

console.log(`Conectando a: ${url}`);
let ok = 0;
for (const sql of tables) {
  const name = sql.match(/CREATE TABLE IF NOT EXISTS "(\w+)"/)?.[1] ?? '?';
  try {
    await db.execute(sql);
    console.log(`  ✓  ${name}`);
    ok++;
  } catch (err) {
    console.error(`  ✗  ${name}:`, err.message);
  }
}
console.log(`\nListo — ${ok}/${tables.length} tablas creadas/verificadas.`);
