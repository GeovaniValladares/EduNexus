/**
 * turso-seed.mjs
 * Crea el usuario administrador inicial en Turso (ejecución única).
 *
 * Uso (PowerShell):
 *   $env:ASTRO_DB_REMOTE_URL = "libsql://..."
 *   $env:ASTRO_DB_APP_TOKEN  = "eyJ..."
 *   node scripts/turso-seed.mjs
 */
import { createClient } from '@libsql/client';
import { hash } from '@node-rs/argon2';
import { randomBytes } from 'node:crypto';

const url   = process.env.ASTRO_DB_REMOTE_URL;
const token = process.env.ASTRO_DB_APP_TOKEN;

if (!url || !token) {
  console.error('Faltan ASTRO_DB_REMOTE_URL o ASTRO_DB_APP_TOKEN');
  process.exit(1);
}

const db = createClient({ url, authToken: token });

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? 'admin@uls.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'AdminULS2026!';
const TEST_PASSWORD  = '12345678';

function genId(len = 15) {
  return randomBytes(len).toString('hex').slice(0, len);
}

async function upsertUser({ id, email, nombre, role, password, carrera = '' }) {
  const existing = await db.execute({
    sql: `SELECT id FROM "User" WHERE email = ?`,
    args: [email],
  });

  if (existing.rows.length > 0) {
    console.log(`  ↷  ${role.padEnd(10)} ${email} (ya existe)`);
    return;
  }

  const hashedPassword = await hash(password);
  await db.execute({
    sql: `INSERT INTO "User" (id, email, nombre, role, carrera, hashedPassword, perfilCompleto, cvText, cvData, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, '', '', datetime('now'))`,
    args: [id, email, nombre, role, carrera, hashedPassword, role !== 'alumno' ? 1 : 0],
  });
  console.log(`  ✓  ${role.padEnd(10)} ${email}`);
}

console.log(`\nConectando a: ${url}\n`);
console.log('Creando usuarios iniciales…');

await upsertUser({ id: 'admin_uls_001',    email: ADMIN_EMAIL,       nombre: 'Administrador ULS',         role: 'admin',      password: ADMIN_PASSWORD, carrera: '' });
await upsertUser({ id: 'superadmin_uls_01', email: 'superadmin@uls.edu', nombre: 'Super Admin ULS',       role: 'superadmin', password: ADMIN_PASSWORD, carrera: '' });
await upsertUser({ id: 'docente_uls_001',  email: 'docente@uls.edu',  nombre: 'Ing. Laura Castillo Ruiz', role: 'docente',    password: 'Docente2026!', carrera: '' });
await upsertUser({ id: 'test_empresa',     email: 'rrhh@empresa.com', nombre: 'Tech Solutions SV',        role: 'empresa',    password: TEST_PASSWORD,  carrera: '' });
await upsertUser({ id: 'test_alumno',      email: 'alumno@test.com',  nombre: 'Estudiante de Prueba',      role: 'alumno',     password: TEST_PASSWORD,  carrera: 'Licenciatura en Ciencias de la Computación' });

console.log('\nSeed completado.\n');
console.log('Credenciales de acceso:');
console.log(`  Admin:    ${ADMIN_EMAIL}  /  ${ADMIN_PASSWORD}`);
console.log(`  Docente:  docente@uls.edu  /  Docente2026!`);
console.log(`  Empresa:  rrhh@empresa.com  /  ${TEST_PASSWORD}`);
console.log(`  Alumno:   alumno@test.com  /  ${TEST_PASSWORD}`);
