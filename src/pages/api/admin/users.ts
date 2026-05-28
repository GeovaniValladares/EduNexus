import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, User, eq } from 'astro:db';
import { isAdmin } from '../../../lib/roles';
import { hashPassword } from '../../../lib/password';
import { guardarUsuariosEnSnapshot } from '../../../lib/db-persist';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ALLOWED_ROLES = ['alumno', 'docente', 'empresa', 'admin'];

// ── GET — list all users ──────────────────────────────────────────────────────
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user || !isAdmin(locals.user.role)) return json({ message: 'No autorizado' }, 401);

  try {
    const users = await db
      .select({
        id: User.id,
        nombre: User.nombre,
        email: User.email,
        role: User.role,
        carrera: User.carrera,
        createdAt: User.createdAt,
        perfilCompleto: User.perfilCompleto,
      })
      .from(User)
      .all();
    return json({ users });
  } catch {
    return json({ message: 'Error al listar usuarios' }, 500);
  }
};

// ── POST — create a user ──────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !isAdmin(locals.user.role)) return json({ message: 'No autorizado' }, 401);

  try {
    const body = await request.json();
    const nombre: string   = body.nombre?.toString().trim() ?? '';
    const email: string    = body.email?.toString().trim().toLowerCase() ?? '';
    const password: string = body.password?.toString() ?? '';
    const role: string     = body.role?.toString() ?? 'alumno';
    const carrera: string  = body.carrera?.toString().trim() ?? '';

    if (!nombre || !email || !password) {
      return json({ message: 'Nombre, correo y contraseña son obligatorios.' }, 400);
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return json({ message: 'Rol no válido.' }, 400);
    }
    if (password.length < 6) {
      return json({ message: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
    }

    // Check duplicate email
    const existing = await db.select({ id: User.id }).from(User).where(eq(User.email, email)).get();
    if (existing) return json({ message: 'Ya existe un usuario con ese correo.' }, 409);

    const id = generateId(15);
    const hashedPassword = await hashPassword(password);

    await db.insert(User).values({
      id,
      nombre,
      email,
      role,
      carrera,
      hashedPassword,
      perfilCompleto: role !== 'alumno',
      cvText: '',
      cvData: '',
      createdAt: new Date(),
    });

    guardarUsuariosEnSnapshot();

    return json({ success: true, id, nombre, email, role });
  } catch (error) {
    console.error('[Admin/users POST]', error);
    return json({ message: 'Error al crear usuario.' }, 500);
  }
};

// ── DELETE — remove a user ────────────────────────────────────────────────────
export const DELETE: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !isAdmin(locals.user.role)) return json({ message: 'No autorizado' }, 401);

  try {
    const { id } = await request.json();
    if (!id) return json({ message: 'ID requerido.' }, 400);

    // Prevent self-deletion
    if (id === locals.user.id) return json({ message: 'No puedes eliminar tu propia cuenta.' }, 400);

    await db.delete(User).where(eq(User.id, id));
    guardarUsuariosEnSnapshot();
    return json({ success: true });
  } catch {
    return json({ message: 'Error al eliminar usuario.' }, 500);
  }
};
