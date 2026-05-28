import type { APIRoute } from 'astro';
import { db, Tramite, Enrollment, Subject, eq, and } from 'astro:db';
import { getSessionUser } from '../../../../lib/session';
import { formatFecha } from '../../../../lib/bridge';
import { generarPdfConstancia } from '../../../../lib/solvencia-pdf';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response('No autenticado', { status: 401 });
  }

  const tramites = await db.select().from(Tramite).all();
  const solvencia = tramites
    .filter((t) => t.userId === user.id && t.tipo === 'solvencia' && t.estado === 'completado')
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];

  if (!solvencia?.folio) {
    return new Response(
      JSON.stringify({ message: 'Primero debes solicitar tu constancia de inscripción y solvencia' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Only include enrollments that have been approved by the teacher
  const enrollments = await db
    .select()
    .from(Enrollment)
    .where(and(eq(Enrollment.userId, user.id), eq(Enrollment.estado, 'approved')))
    .all();

  const materias = [];
  for (const e of enrollments) {
    const s = await db.select().from(Subject).where(eq(Subject.id, e.subjectId)).get();
    if (s) {
      materias.push({
        codigo: s.codigo,
        nombre: s.nombre,
        semestre: s.semestre,
        creditos: s.creditos,
        profesor: s.profesor,
        horario: s.horario,
        aula: s.aula,
      });
    }
  }

  const now = new Date();
  const periodo = `I semestre ${now.getFullYear()}`;

  const pdfBytes = await generarPdfConstancia({
    folio: solvencia.folio,
    nombre: user.nombre,
    email: user.email,
    carrera: user.carrera || '—',
    periodo,
    materias,
    emitidoEl: formatFecha(solvencia.updatedAt),
  });

  const filename = `constancia-inscripcion-solvencia-${solvencia.folio}.pdf`;

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
};
