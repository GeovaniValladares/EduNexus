import type { APIRoute } from 'astro';
import { db, Application, ApplicationHistory, eq, desc } from 'astro:db';
import { getSessionUser } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 401 });

  const url = new URL(request.url);
  const applicationId = url.searchParams.get('applicationId');

  if (!applicationId) {
    return new Response(JSON.stringify({ message: 'applicationId requerido' }), { status: 400 });
  }

  try {
    // Verificar que la aplicación pertenece al usuario o a su empresa
    const app = await db.select().from(Application).where(eq(Application.id, applicationId)).get();
    if (!app) return new Response(JSON.stringify({ message: 'No encontrada' }), { status: 404 });

    const history = await db
      .select()
      .from(ApplicationHistory)
      .where(eq(ApplicationHistory.applicationId, applicationId))
      .orderBy(desc(ApplicationHistory.createdAt))
      .all();

    return new Response(JSON.stringify({ history }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error interno' }), { status: 500 });
  }
};
