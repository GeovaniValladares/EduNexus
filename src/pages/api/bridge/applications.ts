import type { APIRoute } from 'astro';
import { db, Application, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const apps = await db
      .select({
        id: Application.id,
        estado: Application.estado,
        mensaje: Application.mensaje,
        createdAt: Application.createdAt,
        updatedAt: Application.updatedAt,
        opportunityId: Opportunity.id,
        opportunityTitle: Opportunity.titulo,
        empresa: Opportunity.empresa,
      })
      .from(Application)
      .innerJoin(Opportunity, eq(Application.opportunityId, Opportunity.id))
      .where(eq(Application.userId, user.id))
      .all();

    return new Response(JSON.stringify({ applications: apps }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error al obtener aplicaciones' }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const { applicationId, mensaje } = await request.json();

    if (!applicationId) {
      return new Response(JSON.stringify({ message: 'Aplicación no indicada' }), { status: 400 });
    }

    if (mensaje === undefined || mensaje === null) {
      return new Response(JSON.stringify({ message: 'Mensaje requerido' }), { status: 400 });
    }

    const apps = await db
      .select()
      .from(Application)
      .where(eq(Application.userId, user.id))
      .all();

    const app = apps.find((a) => a.id === applicationId);
    if (!app) {
      return new Response(JSON.stringify({ message: 'Aplicación no encontrada' }), { status: 404 });
    }

    if (app.estado !== 'pending') {
      return new Response(
        JSON.stringify({ message: 'Solo puedes editar aplicaciones pendientes' }),
        { status: 400 }
      );
    }

    const texto = String(mensaje).slice(0, 2000);
    const now = new Date();

    await db
      .update(Application)
      .set({ mensaje: texto, updatedAt: now })
      .where(eq(Application.id, applicationId));

    return new Response(
      JSON.stringify({ success: true, applicationId, mensaje: texto, updatedAt: now }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al actualizar aplicación:', error);
    return new Response(JSON.stringify({ message: 'Error al actualizar' }), { status: 500 });
  }
};
