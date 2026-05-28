import type { APIRoute } from 'astro';
import { db, Enrollment, User, Subject, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';
import { isAdmin } from '../../../lib/roles';

export const prerender = false;

/** GET /api/wiki/enrollment-review  — list all pending enrollments (admin) */
export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isAdmin(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  const pendingEnrollments = await db
    .select()
    .from(Enrollment)
    .all()
    .then((rows) => rows.filter((e) => e.estado === 'pending'));

  const enriched = await Promise.all(
    pendingEnrollments.map(async (e) => {
      const [student, subject] = await Promise.all([
        db.select().from(User).where(eq(User.id, e.userId)).get(),
        db.select().from(Subject).where(eq(Subject.id, e.subjectId)).get(),
      ]);
      return {
        enrollmentId: e.id,
        userId: e.userId,
        studentNombre: student?.nombre ?? '—',
        studentEmail: student?.email ?? '—',
        studentCarrera: student?.carrera ?? '—',
        studentCiclo: student?.ciclo ?? '—',
        subjectId: e.subjectId,
        subjectNombre: subject?.nombre ?? '—',
        subjectCodigo: subject?.codigo ?? '—',
        subjectCiclo: subject?.semestre ?? '—',
        createdAt: e.createdAt,
      };
    })
  );

  // Sort by createdAt desc
  enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return new Response(JSON.stringify({ pending: enriched }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

/** PATCH /api/wiki/enrollment-review  — approve or reject an enrollment */
export const PATCH: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user || !isAdmin(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { enrollmentId, accion } = body;

    if (!enrollmentId || !['approve', 'reject'].includes(accion)) {
      return new Response(
        JSON.stringify({ message: 'enrollmentId y accion (approve|reject) requeridos' }),
        { status: 400 }
      );
    }

    const enrollment = await db
      .select()
      .from(Enrollment)
      .where(eq(Enrollment.id, enrollmentId))
      .get();

    if (!enrollment) {
      return new Response(JSON.stringify({ message: 'Inscripción no encontrada' }), { status: 404 });
    }

    const newEstado = accion === 'approve' ? 'approved' : 'rejected';

    await db
      .update(Enrollment)
      .set({ estado: newEstado })
      .where(eq(Enrollment.id, enrollmentId));

    return new Response(
      JSON.stringify({ success: true, enrollmentId, estado: newEstado }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al revisar inscripción:', error);
    return new Response(JSON.stringify({ message: 'Error interno' }), { status: 500 });
  }
};
