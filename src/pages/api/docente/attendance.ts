import type { APIRoute } from 'astro';
import { db, Subject, Enrollment, Attendance, eq, and } from 'astro:db';
import { generateId } from 'lucia';
import { getSessionUser } from '../../../lib/session';
import { isDocente } from '../../../lib/roles';
import { guardarUsuariosEnSnapshot } from '../../../lib/db-persist';

export const prerender = false;

/** GET /api/docente/attendance?subjectId=xxx&fecha=2026-05-25 */
export const GET: APIRoute = async ({ url, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  const subjectId = url.searchParams.get('subjectId');
  const fecha = url.searchParams.get('fecha');

  if (!subjectId || !fecha) {
    return new Response(JSON.stringify({ message: 'subjectId y fecha requeridos' }), { status: 400 });
  }

  const subject = await db.select().from(Subject).where(eq(Subject.id, subjectId)).get();
  if (!subject || subject.profesor !== user.nombre) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  const records = await db
    .select()
    .from(Attendance)
    .where(and(eq(Attendance.subjectId, subjectId), eq(Attendance.fecha, fecha)))
    .all();

  return new Response(JSON.stringify({ records }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/** POST /api/docente/attendance — save attendance for a date */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isDocente(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  const body = await request.json();
  const { subjectId, fecha, records } = body;
  // records: Array<{ userId: string, presente: boolean, nota?: string }>

  if (!subjectId || !fecha || !Array.isArray(records)) {
    return new Response(JSON.stringify({ message: 'subjectId, fecha y records requeridos' }), { status: 400 });
  }

  const subject = await db.select().from(Subject).where(eq(Subject.id, subjectId)).get();
  if (!subject || subject.profesor !== user.nombre) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  // Upsert each record
  for (const rec of records) {
    const existing = await db
      .select()
      .from(Attendance)
      .where(
        and(
          eq(Attendance.userId, rec.userId),
          eq(Attendance.subjectId, subjectId),
          eq(Attendance.fecha, fecha)
        )
      )
      .get();

    if (existing) {
      await db
        .update(Attendance)
        .set({ presente: rec.presente ?? false, nota: rec.nota ?? null })
        .where(eq(Attendance.id, existing.id));
    } else {
      await db.insert(Attendance).values({
        id: generateId(15),
        userId: rec.userId,
        subjectId,
        fecha,
        presente: rec.presente ?? false,
        nota: rec.nota ?? null,
        createdAt: new Date(),
      });
    }
  }

  guardarUsuariosEnSnapshot();

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
