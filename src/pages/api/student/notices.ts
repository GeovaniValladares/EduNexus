import type { APIRoute } from 'astro';
import { db, Notice, Enrollment, Subject, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';

export const prerender = false;

/**
 * GET /api/student/notices
 * Returns notices published by teachers for all subjects the student is enrolled in.
 */
export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  // Get all enrollments for this student
  const enrollments = await db
    .select()
    .from(Enrollment)
    .where(eq(Enrollment.userId, user.id))
    .all();

  if (enrollments.length === 0) {
    return new Response(JSON.stringify({ notices: [] }), { status: 200 });
  }

  const enrolledSubjectIds = new Set(enrollments.map((e) => e.subjectId));

  // Fetch all notices and filter by enrolled subjects
  const allNotices = await db.select().from(Notice).all();
  const relevant = allNotices.filter((n) => enrolledSubjectIds.has(n.subjectId));

  // Enrich with subject name
  const allSubjects = await db.select().from(Subject).all();
  const subjectMap = Object.fromEntries(allSubjects.map((s) => [s.id, s]));

  const enriched = relevant
    .map((n) => ({
      id: n.id,
      titulo: n.titulo,
      contenido: n.contenido,
      urgente: n.urgente,
      createdAt: n.createdAt,
      subjectNombre: subjectMap[n.subjectId]?.nombre ?? '',
      subjectCodigo: subjectMap[n.subjectId]?.codigo ?? '',
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  return new Response(JSON.stringify({ notices: enriched }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
