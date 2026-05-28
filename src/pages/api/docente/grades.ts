import type { APIRoute } from 'astro';
import { db, Evaluation, Subject, eq, and } from 'astro:db';
import { getSessionUser } from '../../../lib/session';
import { isDocente } from '../../../lib/roles';
import { guardarUsuariosEnSnapshot } from '../../../lib/db-persist';

export const prerender = false;

async function getTeacherSubjectIds(teacherNombre: string): Promise<Set<string>> {
  const subs = await db
    .select({ id: Subject.id })
    .from(Subject)
    .where(eq(Subject.profesor, teacherNombre))
    .all();
  return new Set(subs.map((s) => s.id));
}

/**
 * GET /api/docente/grades?subjectId=...&titulo=...
 * Returns existing grades for a subject (and optionally a specific evaluation title).
 * Returns { evaluations: Evaluation[], byUser: Record<userId, nota> }
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
  }

  const url = new URL(request.url);
  const subjectId = url.searchParams.get('subjectId');
  const titulo = url.searchParams.get('titulo');

  if (!subjectId) {
    return new Response(JSON.stringify({ error: 'subjectId requerido' }), { status: 400 });
  }

  const teacherSubjectIds = await getTeacherSubjectIds(user.nombre);
  if (!teacherSubjectIds.has(subjectId)) {
    return new Response(JSON.stringify({ error: 'No autorizado para esta materia' }), { status: 403 });
  }

  let evals = await db
    .select()
    .from(Evaluation)
    .where(eq(Evaluation.subjectId, subjectId))
    .all();

  if (titulo) {
    evals = evals.filter((e) => e.titulo === titulo);
  }

  // Map userId → nota for easy lookup in the UI
  const byUser: Record<string, { nota: number; comentario: string }> = {};
  for (const ev of evals) {
    byUser[ev.userId] = { nota: ev.nota, comentario: ev.comentario ?? '' };
  }

  return new Response(JSON.stringify({ evaluations: evals, byUser }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/**
 * POST /api/docente/grades
 * Body: { subjectId, titulo, records: Array<{ userId, nota, comentario }> }
 * Upserts grades (delete existing for this subject+titulo+userId, then insert).
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
  }

  const body = await request.json();
  const { subjectId, titulo, records } = body as {
    subjectId: string;
    titulo: string;
    records: { userId: string; nota: number; comentario?: string }[];
  };

  if (!subjectId || !titulo?.trim() || !Array.isArray(records)) {
    return new Response(
      JSON.stringify({ error: 'subjectId, titulo y records son requeridos' }),
      { status: 400 }
    );
  }

  const teacherSubjectIds = await getTeacherSubjectIds(user.nombre);
  if (!teacherSubjectIds.has(subjectId)) {
    return new Response(JSON.stringify({ error: 'No autorizado para esta materia' }), { status: 403 });
  }

  let saved = 0;
  for (const rec of records) {
    const { userId, nota, comentario } = rec;
    if (typeof nota !== 'number' || nota < 0 || nota > 10) continue;

    // Delete existing entry for this user+subject+titulo
    const existing = await db
      .select()
      .from(Evaluation)
      .where(
        and(
          eq(Evaluation.subjectId, subjectId),
          eq(Evaluation.userId, userId),
          eq(Evaluation.titulo, titulo.trim())
        )
      )
      .get();

    if (existing) {
      await db.delete(Evaluation).where(eq(Evaluation.id, existing.id));
    }

    await db.insert(Evaluation).values({
      id: `eval_${subjectId.slice(-6)}_${userId.slice(-6)}_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
      subjectId,
      userId,
      titulo: titulo.trim(),
      nota,
      comentario: comentario?.trim() ?? '',
      createdAt: new Date(),
    });
    saved++;
  }

  guardarUsuariosEnSnapshot();

  return new Response(JSON.stringify({ ok: true, saved }), { status: 200 });
};
