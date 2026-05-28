import { db, User, eq } from 'astro:db';
import { hash } from '@node-rs/argon2';
import { guardarUsuariosEnSnapshot } from '../src/lib/db-persist.ts';

async function createTestUsers() {
  console.log('[setup] Creando usuarios de prueba para todos los roles...');

  const password = '12345678';
  const hashedPassword = await hash(password);
  
  const testUsers = [
    {
      id: 'test_superadmin',
      email: 'admin@test.com',
      nombre: 'Admin de Prueba',
      role: 'superadmin',
      carrera: 'Sistemas'
    },
    {
      id: 'test_docente',
      email: 'docente@test.com',
      nombre: 'Ing. Laura Castillo Ruiz', // Vinculada al catálogo
      role: 'docente',
      carrera: 'Ciencias de la Computación'
    },
    {
      id: 'test_alumno',
      email: 'alumno@test.com',
      nombre: 'Estudiante de Prueba',
      role: 'alumno',
      carrera: 'Licenciatura en Ciencias de la Computación'
    },
    {
      id: 'test_empresa',
      email: 'rrhh@empresa.com',
      nombre: 'Tech Solutions SV',
      role: 'empresa',
      carrera: 'Empresa'
    }
  ];

  for (const u of testUsers) {
    const existing = await db.select().from(User).where(eq(User.email, u.email)).get();
    
    if (existing) {
      console.log(`[setup] Actualizando usuario existente: ${u.email}`);
      await db.update(User).set({ 
        role: u.role as any,
        nombre: u.nombre,
        hashedPassword,
        perfilCompleto: true 
      }).where(eq(User.id, existing.id));
    } else {
      console.log(`[setup] Insertando nuevo usuario: ${u.email}`);
      await db.insert(User).values({
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        carrera: u.carrera,
        hashedPassword,
        role: u.role as any,
        perfilCompleto: true,
        createdAt: new Date()
      });
    }
  }

  console.log('[setup] ✓ Usuarios creados con éxito.');
  console.log('[setup] Password para todos: 12345678');

  try {
    guardarUsuariosEnSnapshot();
    console.log('[setup] ✓ Respaldo en snapshot completado.');
  } catch (e) {
    console.warn('[setup] No se pudo persistir el snapshot.');
  }
}

createTestUsers().catch(console.error);
