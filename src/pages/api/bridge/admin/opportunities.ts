import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, Opportunity, Application, eq } from 'astro:db';
import {
  parseOpportunityPayload,
  requireBridgeAdmin,
  serializeCarreras,
  serializeRequisitos,
} from '../../../../lib/bridge-admin';
import { parseRequisitos, parseCarreras } from '../../../../lib/bridge';
import type { OpportunityPayload } from '../../../../lib/bridge-admin-shared';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function toOpportunityResponse(id: string, data: OpportunityPayload, postulaciones = 0) {
  return {
    id,
    ...data,
    postulaciones,
    aplicado: false,
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireBridgeAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = parseOpportunityPayload(body);
    if (parsed.error) return json({ message: parsed.error }, 400);

    const id = generateId(15);
    const data = parsed.data!;

    await db.insert(Opportunity).values({
      id,
      titulo: data.titulo,
      empresa: data.empresa,
      tipo: data.tipo,
      horasSemanales: data.horasSemanales,
      duracionSemanas: data.duracionSemanas,
      duracionLabel: data.duracionLabel,
      ubicacion: data.ubicacion,
      descripcion: data.descripcion,
      requisitos: serializeRequisitos(data.requisitos),
      carreras: serializeCarreras(data.carreras),
      activo: data.activo,
      createdAt: new Date(),
    });

    return json({ success: true, opportunity: toOpportunityResponse(id, data, 0) });
  } catch (error) {
    console.error('Error crear oportunidad:', error);
    return json({ message: 'Error al crear oportunidad' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const auth = await requireBridgeAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const id = body.id?.toString();
    if (!id) return json({ message: 'ID requerido' }, 400);

    const existing = await db.select().from(Opportunity).where(eq(Opportunity.id, id)).get();
    if (!existing) return json({ message: 'Oportunidad no encontrada' }, 404);

    const parsed = parseOpportunityPayload(body);
    if (parsed.error) return json({ message: parsed.error }, 400);

    const data = parsed.data!;
    await db
      .update(Opportunity)
      .set({
        titulo: data.titulo,
        empresa: data.empresa,
        tipo: data.tipo,
        horasSemanales: data.horasSemanales,
        duracionSemanas: data.duracionSemanas,
        duracionLabel: data.duracionLabel,
        ubicacion: data.ubicacion,
        descripcion: data.descripcion,
        requisitos: serializeRequisitos(data.requisitos),
        carreras: serializeCarreras(data.carreras),
        activo: data.activo,
      })
      .where(eq(Opportunity.id, id));

    const postulaciones = await db
      .select()
      .from(Application)
      .all()
      .then((rows) => rows.filter((a) => a.opportunityId === id && a.estado !== 'withdrawn').length);

    return json({
      success: true,
      opportunity: {
        id,
        ...data,
        postulaciones,
        aplicado: false,
      },
    });
  } catch (error) {
    console.error('Error actualizar oportunidad:', error);
    return json({ message: 'Error al actualizar' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const auth = await requireBridgeAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const id = body.id?.toString();
    const hard = body.hard === true;
    if (!id) return json({ message: 'ID requerido' }, 400);

    const existing = await db.select().from(Opportunity).where(eq(Opportunity.id, id)).get();
    if (!existing) return json({ message: 'Oportunidad no encontrada' }, 404);

    if (hard) {
      const apps = await db.select().from(Application).all();
      for (const a of apps.filter((x) => x.opportunityId === id)) {
        await db.delete(Application).where(eq(Application.id, a.id));
      }
      await db.delete(Opportunity).where(eq(Opportunity.id, id));
    } else {
      await db.update(Opportunity).set({ activo: false }).where(eq(Opportunity.id, id));
    }

    return json({ success: true, id });
  } catch (error) {
    console.error('Error eliminar oportunidad:', error);
    return json({ message: 'Error al eliminar' }, 500);
  }
};
