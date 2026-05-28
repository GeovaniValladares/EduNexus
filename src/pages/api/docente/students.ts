import type { APIRoute } from 'astro';
import { db, Subject, Enrollment, User, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';
import { isDocente } from '../../../lib/roles';

export const prerender = false;

/** GET /api/docente/students?subjectId=xxx — enrolled students for a subject */
export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  const subjectId = url.searchParams.get('subjectId');
  if (!subjectId) {
    return new Response(JSON.stringify({ message: 'subjectId requerido' }), { status: 400 });
  }

  const subject = await db.select().from(Subject).where(eq(Subject.id, subjectId)).get();
  if (!subject || subject.profesor !== user.nombre) {
    return new Response(JSON.stringify({ message: 'No autorizado para esta materia' }), { status: 403 });
  }

  const enrollments = await db
    .select()
    .from(Enrollment)
    .where(eq(Enrollment.subjectId, subjectId))
    .all();

  const students = await Promise.all(
    enrollments.map(async (e) => {
      const student = await db.select().from(User).where(eq(User.id, e.userId)).get();
      return {
        enrollmentId: e.id,
        userId: e.userId,
        nombre: student?.nombre ?? '—',
        email: student?.email ?? '—',
        carrera: student?.carrera ?? '—',
        ciclo: student?.ciclo ?? '—',
        avatarUrl: student?.avatarUrl ?? '',
        estado: e.estado ?? 'pending',
        createdAt: e.createdAt,
      };
    })
  );

  students.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return new Response(
    JSON.stringify({ subject: { id: subject.id, nombre: subject.nombre, codigo: subject.codigo }, students }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

/** PATCH /api/docente/students — approve or reject an enrollment */
export const PATCH: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  const body = await request.json();
  const { enrollmentId, accion } = body;

  if (!enrollmentId || !['approve', 'reject'].includes(accion)) {
    return new Response(JSON.stringify({ message: 'enrollmentId y accion requeridos' }), { status: 400 });
  }

  const enrollment = await db.select().from(Enrollment).where(eq(Enrollment.id, enrollmentId)).get();
  if (!enrollment) {
    return new Response(JSON.stringify({ message: 'Inscripción no encontrada' }), { status: 404 });
  }

  // Verify this subject belongs to the teacher
  const subject = await db.select().from(Subject).where(eq(Subject.id, enrollment.subjectId)).get();
  if (!subject || subject.profesor !== user.nombre) {
    return new Response(JSON.stringify({ message: 'No autorizado para esta materia' }), { status: 403 });
  }

  const newEstado = accion === 'approve' ? 'approved' : 'rejected';
  await db.update(Enrollment).set({ estado: newEstado }).where(eq(Enrollment.id, enrollmentId));

  return new Response(JSON.stringify({ success: true, estado: newEstado }), { status: 200 });
};
