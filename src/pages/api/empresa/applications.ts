import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, Application, ApplicationHistory, Opportunity, User, eq, and, inArray } from 'astro:db';
import { isEmpresa } from '../../../lib/roles';
import { guardarUsuariosEnSnapshot } from '../../../lib/db-persist';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || !isEmpresa(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 401 });
  }

  try {
    // 1. Get company's opportunities
    const companyOpps = await db
      .select()
      .from(Opportunity)
      .where(eq(Opportunity.companyId, user.id))
      .all();

    if (companyOpps.length === 0) {
      return new Response(JSON.stringify({ applications: [] }), { status: 200 });
    }

    const oppIds = companyOpps.map(o => o.id);

    // 2. Get applications for these opportunities
    const apps = await db
      .select({
        id: Application.id,
        estado: Application.estado,
        mensaje: Application.mensaje,
        cvText: Application.cvText,
        createdAt: Application.createdAt,
        studentName: User.nombre,
        studentEmail: User.email,
        studentAvatar: User.avatarUrl,
        opportunityTitle: Opportunity.titulo,
        opportunityId: Opportunity.id
      })
      .from(Application)
      .innerJoin(User, eq(Application.userId, User.id))
      .innerJoin(Opportunity, eq(Application.opportunityId, Opportunity.id))
      .where(inArray(Application.opportunityId, oppIds))
      .all();

    return new Response(JSON.stringify({ applications: apps }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching company applications:', error);
    return new Response(JSON.stringify({ message: 'Error interno' }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !isEmpresa(user.role)) {
    return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 401 });
  }

  try {
    const { id, estado, comentario = '' } = await request.json();
    if (!id || !estado) {
      return new Response(JSON.stringify({ message: 'ID y estado son obligatorios' }), { status: 400 });
    }

    // Verify the application belongs to an opportunity of this company
    const app = await db
      .select({ companyId: Opportunity.companyId })
      .from(Application)
      .innerJoin(Opportunity, eq(Application.opportunityId, Opportunity.id))
      .where(eq(Application.id, id))
      .get();

    if (!app || app.companyId !== user.id) {
      return new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 });
    }

    await db
      .update(Application)
      .set({ estado, updatedAt: new Date() })
      .where(eq(Application.id, id));

    // Add history entry
    await db.insert(ApplicationHistory).values({
      id: generateId(15),
      applicationId: id,
      estado,
      comentario: comentario || getAutoComment(estado),
      createdAt: new Date(),
    });

    guardarUsuariosEnSnapshot();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Error al actualizar' }), { status: 500 });
  }
};

function getAutoComment(estado: string): string {
  const map: Record<string, string> = {
    'viewed': 'La empresa ha leído tu CV',
    'shortlisted': 'La empresa ha vuelto a considerar tu candidatura dentro del proceso de selección',
    'accepted': '¡Felicidades! Has sido aceptado en la oferta',
    'rejected': 'La empresa ha descartado tu CV',
  };
  return map[estado] || `Estado actualizado a ${estado}`;
}
