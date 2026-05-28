import { db, User, eq } from 'astro:db';
import argon2 from 'argon2';
import { generateId } from 'lucia';
import { guardarUsuariosEnSnapshot } from '../src/lib/db-persist.ts';

async function createSpecialUsers() {
  console.log('[setup] Iniciando creación de usuarios especiales...');

  const users = [
    {
      id: 'special_admin_01',
      email: 'admin@uls.edu',
      nombre: 'Administrador General',
      role: 'superadmin',
      password: 'AdminULS2026!',
      carrera: 'Administración'
    },
    {
      id: 'special_docente_01',
      email: 'docente@uls.edu',
      nombre: 'Ing. Laura Castillo Ruiz',
      role: 'docente',
      password: 'Docente2026!',
      carrera: 'Ciencias de la Computación'
    }
  ];

  for (const u of users) {
    const existing = await db.select().from(User).where(eq(User.email, u.email)).get();
    
    if (existing) {
      console.log(`[setup] El usuario ${u.email} ya existe. Actualizando rol a ${u.role}...`);
      await db.update(User).set({ role: u.role as any }).where(eq(User.id, existing.id));
    } else {
      console.log(`[setup] Creando nuevo usuario ${u.role}: ${u.email}`);
      const hashedPassword = await argon2.hash(u.password);
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

  console.log('[setup] ✓ Usuarios creados/actualizados exitosamente.');
  
  // Persistir cambios
  try {
    guardarUsuariosEnSnapshot();
    console.log('[setup] ✓ Respaldo en snapshot completado.');
  } catch (e) {
    console.warn('[setup] No se pudo ejecutar el snapshot automático, los datos están en la base principal.');
  }
}

createSpecialUsers().catch(console.error);
