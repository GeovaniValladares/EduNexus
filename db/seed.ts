import { db, User, eq } from 'astro:db';
import argon2 from 'argon2';
import { seedWiki } from './seed-wiki';
import { seedBridge } from './seed-bridge';

// —— DEMO / TEST USERS ——
const TEST_PASSWORD = '12345678';

const ADMIN_ID = 'admin_uls_001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@uls.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'AdminULS2026!';
const ADMIN_NOMBRE = 'Administrador ULS';

const DOCENTE_ID = 'docente_uls_001';
const DOCENTE_EMAIL = 'docente@uls.edu';
const DOCENTE_PASSWORD = 'Docente2026!';
const DOCENTE_NOMBRE = 'Ing. Laura Castillo Ruiz';

const TEST_USERS = [
  {
    id: 'test_superadmin',
    email: 'admin@test.com',
    nombre: 'Admin de Prueba',
    role: 'superadmin',
    password: TEST_PASSWORD,
    carrera: 'Administración'
  },
  {
    id: 'test_docente',
    email: 'docente@test.com',
    nombre: 'Ing. Laura Castillo Ruiz',
    role: 'docente',
    password: TEST_PASSWORD,
    carrera: 'Ciencias de la Computación'
  },
  {
    id: 'test_alumno',
    email: 'alumno@test.com',
    nombre: 'Estudiante de Prueba',
    role: 'alumno',
    password: TEST_PASSWORD,
    carrera: 'Licenciatura en Ciencias de la Computación'
  },
  {
    id: 'test_empresa',
    email: 'rrhh@empresa.com',
    nombre: 'Tech Solutions SV',
    role: 'empresa',
    password: TEST_PASSWORD,
    carrera: 'Empresa'
  }
];

export default async function seed() {
  const allUsers = await db.select().from(User).all();
  if (allUsers.length > 2) {
    console.log(`[seed] ${allUsers.length} usuarios en base — se conservan (solo catálogo incremental).`);
  }

  // 1. Seed Default Demo Admin
  const existingAdmin = await db.select().from(User).where(eq(User.email, ADMIN_EMAIL.toLowerCase())).get();
  if (!existingAdmin) {
    const hashed = await argon2.hash(ADMIN_PASSWORD);
    await db.insert(User).values({
      id: ADMIN_ID,
      email: ADMIN_EMAIL.toLowerCase(),
      nombre: ADMIN_NOMBRE,
      carrera: 'Licenciatura en Administración de Empresas',
      ciclo: 'X',
      perfilCompleto: true,
      hashedPassword: hashed,
      role: 'superadmin',
      cvText: '', cvData: '', createdAt: new Date(),
    });
    console.log(`[seed] Admin demo creado: ${ADMIN_EMAIL}`);
  }

  // 2. Seed Default Demo Docente
  const existingDoc = await db.select().from(User).where(eq(User.email, DOCENTE_EMAIL)).get();
  if (!existingDoc) {
    const hashed = await argon2.hash(DOCENTE_PASSWORD);
    await db.insert(User).values({
      id: DOCENTE_ID,
      email: DOCENTE_EMAIL,
      nombre: DOCENTE_NOMBRE,
      carrera: 'Licenciatura en Ingeniería en Sistemas Informáticos',
      ciclo: 'X',
      perfilCompleto: true,
      hashedPassword: hashed,
      role: 'docente',
      cvText: '', cvData: '', createdAt: new Date(),
    });
    console.log(`[seed] Docente demo creado: ${DOCENTE_EMAIL}`);
  }

  // 3. Seed Test Users (12345678)
  for (const u of TEST_USERS) {
    const exists = await db.select().from(User).where(eq(User.email, u.email)).get();
    if (!exists) {
      const hashed = await argon2.hash(u.password);
      await db.insert(User).values({
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        carrera: u.carrera,
        hashedPassword: hashed,
        role: u.role as any,
        perfilCompleto: true,
        cvText: '', cvData: '', createdAt: new Date(),
      });
      console.log(`[seed] Usuario TEST creado: ${u.email} (Rol: ${u.role})`);
    }
  }

  await seedWiki();
  await seedBridge();
}
