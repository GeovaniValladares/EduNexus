import type { APIRoute } from 'astro';
import { db, Evaluation, Subject, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';

export const prerender = false;

/**
 * GET /api/student/grades
 * Returns all evaluation records for the logged-in student,
 * enriched with subject name and código.
 */
export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const evals = await db
    .select()
    .from(Evaluation)
    .where(eq(Evaluation.userId, user.id))
    .all();

  const allSubjects = await db.select().from(Subject).all();
  const subjectMap = Object.fromEntries(allSubjects.map((s) => [s.id, s]));

  const enriched = evals
    .map((e) => ({
      id: e.id,
      titulo: e.titulo,
      nota: e.nota,
      comentario: e.comentario,
      createdAt: e.createdAt,
      subjectId: e.subjectId,
      subjectNombre: subjectMap[e.subjectId]?.nombre ?? '',
      subjectCodigo: subjectMap[e.subjectId]?.codigo ?? '',
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return new Response(JSON.stringify({ grades: enriched }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
