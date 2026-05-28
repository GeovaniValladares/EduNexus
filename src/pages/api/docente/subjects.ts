import type { APIRoute } from 'astro';
import { db, Subject, Enrollment, User, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';
import { isDocente } from '../../../lib/roles';

export const prerender = false;

/** GET /api/docente/subjects — list subjects assigned to this teacher */
export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  const subjects = await db
    .select()
    .from(Subject)
    .all()
    .then((rows) => rows.filter((s) => s.profesor === user.nombre));

  const enriched = await Promise.all(
    subjects.map(async (s) => {
      const enrollments = await db
        .select()
        .from(Enrollment)
        .where(eq(Enrollment.subjectId, s.id))
        .all();
      return {
        ...s,
        totalEnrolled: enrollments.filter((e) => e.estado === 'approved').length,
        totalPending: enrollments.filter((e) => e.estado === 'pending').length,
      };
    })
  );

  return new Response(JSON.stringify({ subjects: enriched }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/** PATCH /api/docente/subjects — update horario/aula of a subject */
export const PATCH: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  const body = await request.json();
  const { subjectId, horario, aula } = body;

  if (!subjectId) {
    return new Response(JSON.stringify({ message: 'subjectId requerido' }), { status: 400 });
  }

  const subject = await db.select().from(Subject).where(eq(Subject.id, subjectId)).get();
  if (!subject || subject.profesor !== user.nombre) {
    return new Response(JSON.stringify({ message: 'No autorizado para esta materia' }), { status: 403 });
  }

  const updates: { horario?: string; aula?: string } = {};
  if (horario !== undefined) updates.horario = String(horario).trim();
  if (aula !== undefined) updates.aula = String(aula).trim();

  await db.update(Subject).set(updates).where(eq(Subject.id, subjectId));

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
