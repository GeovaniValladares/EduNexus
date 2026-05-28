import type { APIRoute } from 'astro';
import { db, Notice, Subject, eq, and } from 'astro:db';
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

/** GET /api/docente/notices?subjectId=... */
export const GET: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
  }

  const url = new URL(request.url);
  const subjectId = url.searchParams.get('subjectId');
  if (!subjectId) {
    return new Response(JSON.stringify({ error: 'subjectId requerido' }), { status: 400 });
  }

  const teacherSubjectIds = await getTeacherSubjectIds(user.nombre);
  if (!teacherSubjectIds.has(subjectId)) {
    return new Response(JSON.stringify({ error: 'No autorizado para esta materia' }), { status: 403 });
  }

  const notices = await db
    .select()
    .from(Notice)
    .where(eq(Notice.subjectId, subjectId))
    .all();

  notices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return new Response(JSON.stringify({ notices }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/** POST /api/docente/notices — create a notice */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
  }

  const body = await request.json();
  const { subjectId, titulo, contenido, urgente } = body;

  if (!subjectId || !titulo?.trim() || !contenido?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Campos requeridos: subjectId, titulo, contenido' }),
      { status: 400 }
    );
  }

  const teacherSubjectIds = await getTeacherSubjectIds(user.nombre);
  if (!teacherSubjectIds.has(subjectId)) {
    return new Response(JSON.stringify({ error: 'No autorizado para esta materia' }), { status: 403 });
  }

  const id = `notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(Notice).values({
    id,
    subjectId,
    titulo: titulo.trim(),
    contenido: contenido.trim(),
    urgente: !!urgente,
    createdAt: new Date(),
  });

  const created = await db.select().from(Notice).where(eq(Notice.id, id)).get();
  guardarUsuariosEnSnapshot();
  return new Response(JSON.stringify({ notice: created }), { status: 201 });
};

/** DELETE /api/docente/notices?id=... */
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 403 });
  }

  const url = new URL(request.url);
  const noticeId = url.searchParams.get('id');
  if (!noticeId) {
    return new Response(JSON.stringify({ error: 'id requerido' }), { status: 400 });
  }

  const notice = await db.select().from(Notice).where(eq(Notice.id, noticeId)).get();
  if (!notice) {
    return new Response(JSON.stringify({ error: 'No encontrado' }), { status: 404 });
  }

  const teacherSubjectIds = await getTeacherSubjectIds(user.nombre);
  if (!teacherSubjectIds.has(notice.subjectId)) {
    return new Response(JSON.stringify({ error: 'No autorizado para esta materia' }), { status: 403 });
  }

  await db.delete(Notice).where(eq(Notice.id, noticeId));
  guardarUsuariosEnSnapshot();
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
