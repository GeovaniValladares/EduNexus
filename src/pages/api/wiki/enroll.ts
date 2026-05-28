import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, Subject, Enrollment, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function cicloIndex(ciclo: string): number {
  return ROMAN.indexOf(ciclo.toUpperCase());
}

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const { subjectId } = await request.json();
    if (!subjectId) {
      return new Response(JSON.stringify({ message: 'Materia no indicada' }), { status: 400 });
    }

    const subject = await db.select().from(Subject).where(eq(Subject.id, subjectId)).get();

    if (!subject) {
      return new Response(JSON.stringify({ message: 'Materia no encontrada' }), { status: 404 });
    }

    // Career check
    if (user.carrera && subject.carrera !== user.carrera) {
      return new Response(
        JSON.stringify({ message: 'Esta materia no pertenece a tu carrera' }),
        { status: 400 }
      );
    }

    // Ciclo access check — students can only enroll in subjects up to their current ciclo
    const userCicloIdx = cicloIndex(user.ciclo ?? 'I');
    const subjectCicloIdx = cicloIndex(subject.semestre ?? 'I');
    if (userCicloIdx >= 0 && subjectCicloIdx > userCicloIdx) {
      return new Response(
        JSON.stringify({
          message: `No puedes inscribirte en materias del Ciclo ${subject.semestre} hasta que avances a ese ciclo.`,
        }),
        { status: 400 }
      );
    }

    // Duplicate check (any estado)
    const existing = await db
      .select()
      .from(Enrollment)
      .where(eq(Enrollment.userId, user.id))
      .all();

    if (existing.some((e) => e.subjectId === subjectId)) {
      return new Response(
        JSON.stringify({ message: 'Ya tienes una solicitud activa para esta materia' }),
        { status: 400 }
      );
    }

    // Cupo check (only count approved enrollments)
    const allEnrollments = await db.select().from(Enrollment).all();
    const approvedCount = allEnrollments.filter(
      (r) => r.subjectId === subjectId && (r.estado === 'approved' || r.estado == null)
    ).length;

    if (approvedCount >= subject.cupo) {
      return new Response(
        JSON.stringify({ message: 'Cupo lleno para esta materia' }),
        { status: 400 }
      );
    }

    await db.insert(Enrollment).values({
      id: generateId(15),
      userId: user.id,
      subjectId,
      estado: 'pending',
      createdAt: new Date(),
    });

    return new Response(
      JSON.stringify({ success: true, subjectId, estado: 'pending' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al inscribir:', error);
    return new Response(JSON.stringify({ message: 'Error al inscribir' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const { subjectId } = await request.json();
    if (!subjectId) {
      return new Response(JSON.stringify({ message: 'Materia no indicada' }), { status: 400 });
    }

    const inscripciones = await db
      .select()
      .from(Enrollment)
      .where(eq(Enrollment.userId, user.id))
      .all();

    const inscripcion = inscripciones.find((e) => e.subjectId === subjectId);
    if (!inscripcion) {
      return new Response(
        JSON.stringify({ message: 'No tienes una solicitud para esta materia' }),
        { status: 400 }
      );
    }

    // Only allow cancellation if still pending
    if (inscripcion.estado === 'approved') {
      return new Response(
        JSON.stringify({ message: 'No puedes cancelar una inscripción ya aprobada. Contacta a tu docente.' }),
        { status: 400 }
      );
    }

    await db.delete(Enrollment).where(eq(Enrollment.id, inscripcion.id));

    return new Response(JSON.stringify({ success: true, subjectId }), { status: 200 });
  } catch (error) {
    console.error('Error al cancelar inscripción:', error);
    return new Response(JSON.stringify({ message: 'Error al cancelar' }), { status: 500 });
  }
};
