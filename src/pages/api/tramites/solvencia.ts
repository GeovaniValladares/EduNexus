import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, Tramite, Enrollment, eq, and } from 'astro:db';
import { getSessionUser } from '../../../lib/session';
import { formatFecha } from '../../../lib/bridge';
import {
  generarFolio,
  puedeSolicitarSolvencia,
  type SolvenciaEstado,
} from '../../../lib/solvencia';

export const prerender = false;

const TIPO = 'solvencia';

async function getLatestSolvencia(userId: string) {
  const rows = await db.select().from(Tramite).all();
  return rows
    .filter((t) => t.userId === userId && t.tipo === TIPO)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  const enrollments = await db
    .select()
    .from(Enrollment)
    .where(eq(Enrollment.userId, user.id))
    .all();

  const aprobadas = enrollments.filter((e) => e.estado === 'approved').length;

  const elegibilidad = puedeSolicitarSolvencia({
    carrera: user.carrera,
    materiasInscritas: enrollments.length,
    materiasAprobadas: aprobadas,
  });

  const tramite = await getLatestSolvencia(user.id);

  return new Response(
    JSON.stringify({
      elegibilidad,
      tramite: tramite
        ? {
            id: tramite.id,
            folio: tramite.folio,
            estado: tramite.estado as SolvenciaEstado,
            materiasCount: tramite.materiasCount,
            createdAt: formatFecha(tramite.createdAt),
            updatedAt: formatFecha(tramite.updatedAt),
          }
        : null,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

export const POST: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  const enrollments = await db
    .select()
    .from(Enrollment)
    .where(eq(Enrollment.userId, user.id))
    .all();

  const aprobadas = enrollments.filter((e) => e.estado === 'approved').length;

  const elegibilidad = puedeSolicitarSolvencia({
    carrera: user.carrera,
    materiasInscritas: enrollments.length,
    materiasAprobadas: aprobadas,
  });

  if (!elegibilidad.ok) {
    return new Response(JSON.stringify({ message: elegibilidad.mensaje }), { status: 400 });
  }

  const existente = await getLatestSolvencia(user.id);
  if (existente?.estado === 'completado') {
    return new Response(
      JSON.stringify({
        message: 'Ya tienes una constancia emitida. Puedes descargarla en PDF.',
        tramite: {
          id: existente.id,
          folio: existente.folio,
          estado: existente.estado,
        },
      }),
      { status: 400 }
    );
  }

  if (existente?.estado === 'en_proceso') {
    return new Response(JSON.stringify({ message: 'Tu solicitud ya está en proceso' }), {
      status: 400,
    });
  }

  const now = new Date();
  const folio = generarFolio();
  const id = generateId(15);

  await db.insert(Tramite).values({
    id,
    userId: user.id,
    tipo: TIPO,
    estado: 'completado',
    folio,
    materiasCount: aprobadas,
    createdAt: now,
    updatedAt: now,
  });

  return new Response(
    JSON.stringify({
      success: true,
      tramite: {
        id,
        folio,
        estado: 'completado',
        materiasCount: enrollments.length,
        createdAt: formatFecha(now),
        updatedAt: formatFecha(now),
      },
      message: 'Constancia de inscripción y solvencia emitida. Ya puedes descargar el PDF.',
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
