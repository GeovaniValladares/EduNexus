import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, Opportunity, eq, and } from 'astro:db';
import { isEmpresa } from '../../../lib/roles';
import { guardarUsuariosEnSnapshot } from '../../../lib/db-persist';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ locals }) => {
  const user = locals.user;
  if (!user || !isEmpresa(user.role)) return json({ message: 'No autorizado' }, 401);

  try {
    const opps = await db
      .select()
      .from(Opportunity)
      .where(eq(Opportunity.companyId, user.id))
      .all();
    return json({ opportunities: opps });
  } catch (error) {
    return json({ message: 'Error al obtener vacantes' }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !isEmpresa(user.role)) return json({ message: 'No autorizado' }, 401);

  try {
    const data = await request.json();
    const id = generateId(15);

    await db.insert(Opportunity).values({
      id,
      companyId: user.id,
      titulo: data.titulo,
      empresa: user.nombre, // Use the user's company name
      tipo: data.tipo || 'Pasantía',
      horasSemanales: Number(data.horasSemanales) || 20,
      duracionSemanas: Number(data.duracionSemanas) || 12,
      duracionLabel: data.duracionLabel || '3 meses',
      ubicacion: data.ubicacion,
      descripcion: data.descripcion,
      requisitos: Array.isArray(data.requisitos) ? JSON.stringify(data.requisitos) : '[]',
      carreras: Array.isArray(data.carreras) ? JSON.stringify(data.carreras) : '[]',
      activo: true,
      createdAt: new Date(),
    });

    guardarUsuariosEnSnapshot();

    return json({ success: true, id });
  } catch (error) {
    console.error(error);
    return json({ message: 'Error al crear vacante' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !isEmpresa(user.role)) return json({ message: 'No autorizado' }, 401);

  try {
    const { id, ...data } = await request.json();
    if (!id) return json({ message: 'ID requerido' }, 400);

    // Verify ownership
    const existing = await db.select().from(Opportunity).where(and(eq(Opportunity.id, id), eq(Opportunity.companyId, user.id))).get();
    if (!existing) return json({ message: 'No encontrado' }, 404);

    await db.update(Opportunity).set({
      titulo: data.titulo,
      tipo: data.tipo,
      horasSemanales: Number(data.horasSemanales),
      duracionSemanas: Number(data.duracionSemanas),
      duracionLabel: data.duracionLabel,
      ubicacion: data.ubicacion,
      descripcion: data.descripcion,
      requisitos: Array.isArray(data.requisitos) ? JSON.stringify(data.requisitos) : data.requisitos,
      carreras: Array.isArray(data.carreras) ? JSON.stringify(data.carreras) : data.carreras,
      activo: data.activo,
    }).where(eq(Opportunity.id, id));

    guardarUsuariosEnSnapshot();

    return json({ success: true });
  } catch (error) {
    return json({ message: 'Error al actualizar' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user || !isEmpresa(user.role)) return json({ message: 'No autorizado' }, 401);

  try {
    const { id } = await request.json();
    const existing = await db.select().from(Opportunity).where(and(eq(Opportunity.id, id), eq(Opportunity.companyId, user.id))).get();
    if (!existing) return json({ message: 'No autorizado' }, 403);

    await db.delete(Opportunity).where(eq(Opportunity.id, id));

    guardarUsuariosEnSnapshot();

    return json({ success: true });
  } catch (error) {
    return json({ message: 'Error al eliminar' }, 500);
  }
};
