import type { APIRoute } from 'astro';
import { db, Enrollment, User, Subject, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';
import { isAdmin } from '../../../lib/roles';
import { formatFecha } from '../../../lib/bridge';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  if (!isAdmin(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  const subjectId = url.searchParams.get('subjectId');
  if (!subjectId) {
    return new Response(JSON.stringify({ message: 'Materia no indicada' }), { status: 400 });
  }

  const subject = await db.select().from(Subject).where(eq(Subject.id, subjectId)).get();
  if (!subject) {
    return new Response(JSON.stringify({ message: 'Materia no encontrada' }), { status: 404 });
  }

  const enrollments = await db
    .select()
    .from(Enrollment)
    .where(eq(Enrollment.subjectId, subjectId))
    .all();

  const students = await Promise.all(
    enrollments.map(async (e) => {
      const u = await db.select().from(User).where(eq(User.id, e.userId)).get();
      return {
        enrollmentId: e.id,
        userId: e.userId,
        nombre: u?.nombre ?? '—',
        email: u?.email ?? '—',
        carrera: u?.carrera ?? '—',
        fecha: formatFecha(e.createdAt),
      };
    })
  );

  return new Response(
    JSON.stringify({
      subject: {
        id: subject.id,
        nombre: subject.nombre,
        codigo: subject.codigo,
        carrera: subject.carrera,
      },
      students,
      total: students.length,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
