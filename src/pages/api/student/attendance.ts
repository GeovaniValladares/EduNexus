import type { APIRoute } from 'astro';
import { db, Attendance, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';

export const prerender = false;

/**
 * GET /api/student/attendance
 * Returns real attendance records for the logged-in student,
 * grouped by subjectId: { total, presente, pct }
 */
export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
  }

  const records = await db
    .select()
    .from(Attendance)
    .where(eq(Attendance.userId, user.id))
    .all();

  const bySubject: Record<string, { total: number; presente: number; pct: number }> = {};

  for (const rec of records) {
    if (!bySubject[rec.subjectId]) {
      bySubject[rec.subjectId] = { total: 0, presente: 0, pct: 0 };
    }
    bySubject[rec.subjectId].total++;
    if (rec.presente) bySubject[rec.subjectId].presente++;
  }

  for (const key of Object.keys(bySubject)) {
    const { total, presente } = bySubject[key];
    bySubject[key].pct = total > 0 ? Math.round((presente / total) * 100) : 0;
  }

  return new Response(JSON.stringify({ bySubject }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
