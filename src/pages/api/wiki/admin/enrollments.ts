import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, Subject, Enrollment, User, eq } from 'astro:db';
import { ROLES } from '../../../../lib/roles';
import { requireWikiAdmin } from '../../../../lib/wiki-admin';
import { formatFecha } from '../../../../lib/bridge';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireWikiAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const { userId, subjectId } = await request.json();
    if (!userId || !subjectId) {
      return json({ message: 'Alumno y materia son obligatorios' }, 400);
    }

    const student = await db.select().from(User).where(eq(User.id, userId)).get();
    if (!student) return json({ message: 'Alumno no encontrado' }, 404);
    if (student.role !== ROLES.ALUMNO && student.role !== ROLES.STUDENT) {
      return json({ message: 'La cuenta no es de estudiante' }, 400);
    }

    const subject = await db.select().from(Subject).where(eq(Subject.id, subjectId)).get();
    if (!subject) return json({ message: 'Materia no encontrada' }, 404);

    if (student.carrera && subject.carrera !== student.carrera) {
      return json(
        {
          message: `La materia es de ${subject.carrera}; el alumno está en ${student.carrera}`,
        },
        400
      );
    }

    const allEnrollments = await db.select().from(Enrollment).all();
    if (allEnrollments.some((e) => e.userId === userId && e.subjectId === subjectId)) {
      return json({ message: 'El alumno ya está inscrito en esta materia' }, 400);
    }

    const totalEnMateria = allEnrollments.filter((e) => e.subjectId === subjectId).length;
    if (totalEnMateria >= subject.cupo) {
      return json({ message: 'Cupo lleno para esta materia' }, 400);
    }

    const id = generateId(15);
    const createdAt = new Date();
    await db.insert(Enrollment).values({ id, userId, subjectId, createdAt });

    return json({
      success: true,
      enrollment: {
        enrollmentId: id,
        userId,
        subjectId,
        nombre: student.nombre,
        email: student.email,
        carrera: student.carrera ?? '—',
        fecha: formatFecha(createdAt),
      },
    });
  } catch (error) {
    console.error('Error inscribir (admin):', error);
    return json({ message: 'Error al inscribir alumno' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const auth = await requireWikiAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const enrollmentId = body.enrollmentId?.toString();
    const userId = body.userId?.toString();
    const subjectId = body.subjectId?.toString();

    let enrollment;
    if (enrollmentId) {
      enrollment = await db
        .select()
        .from(Enrollment)
        .all()
        .then((rows) => rows.find((e) => e.id === enrollmentId));
    } else if (userId && subjectId) {
      enrollment = await db
        .select()
        .from(Enrollment)
        .all()
        .then((rows) => rows.find((e) => e.userId === userId && e.subjectId === subjectId));
    } else {
      return json({ message: 'Indica enrollmentId o userId + subjectId' }, 400);
    }

    if (!enrollment) {
      return json({ message: 'Inscripción no encontrada' }, 404);
    }

    await db.delete(Enrollment).where(eq(Enrollment.id, enrollment.id));

    return json({ success: true, enrollmentId: enrollment.id, subjectId: enrollment.subjectId });
  } catch (error) {
    console.error('Error dar de baja (admin):', error);
    return json({ message: 'Error al dar de baja' }, 500);
  }
};
