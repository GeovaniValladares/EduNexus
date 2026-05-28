import type { APIRoute } from 'astro';
import { db, User, Subject, eq } from 'astro:db';
import { isAdmin } from '../../../lib/roles';
import { guardarUsuariosEnSnapshot } from '../../../lib/db-persist';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// ── GET — return all subjects + all docentes ──────────────────────────────────
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user || !isAdmin(locals.user.role)) return json({ message: 'No autorizado' }, 401);

  try {
    const [subjects, docentes] = await Promise.all([
      db.select().from(Subject).all(),
      db
        .select({ id: User.id, nombre: User.nombre, email: User.email })
        .from(User)
        .all()
        .then((users) => users.filter((u) => u !== null && (u as { role?: string } & typeof u))),
    ]);

    // Fetch docentes separately for clarity
    const allUsers = await db
      .select({ id: User.id, nombre: User.nombre, email: User.email, role: User.role })
      .from(User)
      .all();
    const teachers = allUsers.filter((u) => u.role === 'docente');

    return json({ subjects, docentes: teachers });
  } catch (err) {
    console.error('[Admin/subjects GET]', err);
    return json({ message: 'Error al obtener datos.' }, 500);
  }
};

// ── PUT — assign a docente to a subject (updates Subject.profesor) ────────────
export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.user || !isAdmin(locals.user.role)) return json({ message: 'No autorizado' }, 401);

  try {
    const body = await request.json();
    const subjectId: string = body.subjectId?.toString() ?? '';
    const docenteId: string = body.docenteId?.toString() ?? '';   // '' = unassign

    if (!subjectId) return json({ message: 'subjectId requerido.' }, 400);

    if (!docenteId) {
      // Unassign — clear professor field
      await db.update(Subject).set({ profesor: '' }).where(eq(Subject.id, subjectId));
      guardarUsuariosEnSnapshot();
      return json({ success: true, profesor: '' });
    }

    const docente = await db
      .select({ nombre: User.nombre })
      .from(User)
      .where(eq(User.id, docenteId))
      .get();

    if (!docente) return json({ message: 'Docente no encontrado.' }, 404);

    await db.update(Subject).set({ profesor: docente.nombre }).where(eq(Subject.id, subjectId));
    guardarUsuariosEnSnapshot();

    return json({ success: true, profesor: docente.nombre });
  } catch (err) {
    console.error('[Admin/subjects PUT]', err);
    return json({ message: 'Error al asignar docente.' }, 500);
  }
};
