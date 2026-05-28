import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, Opportunity, Application, ApplicationHistory, User, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';
import { guardarUsuariosEnSnapshot } from '../../../lib/db-persist';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { opportunityId, mensaje = '', adjuntarCv = false } = body;

    if (!opportunityId) {
      return new Response(JSON.stringify({ message: 'Oportunidad no indicada' }), { status: 400 });
    }

    const opp = await db
      .select()
      .from(Opportunity)
      .where(eq(Opportunity.id, opportunityId))
      .get();

    if (!opp || !opp.activo) {
      return new Response(JSON.stringify({ message: 'Oportunidad no encontrada' }), { status: 404 });
    }

    const carreras = opp.carreras ? JSON.parse(opp.carreras || '[]') : [];
    if (
      Array.isArray(carreras) &&
      carreras.length > 0 &&
      user.carrera &&
      !carreras.includes(user.carrera)
    ) {
      return new Response(
        JSON.stringify({ message: 'Esta oportunidad no está disponible para tu carrera' }),
        { status: 400 }
      );
    }

    const existentes = await db
      .select()
      .from(Application)
      .where(eq(Application.userId, user.id))
      .all();

    const yaAplicado = existentes.find(
      (a) => a.opportunityId === opportunityId && a.estado !== 'withdrawn'
    );

    if (yaAplicado) {
      return new Response(JSON.stringify({ message: 'Ya aplicaste a esta oportunidad' }), {
        status: 400,
      });
    }

    let cvText = '';
    if (adjuntarCv) {
      const dbUser = await db.select().from(User).where(eq(User.id, user.id)).get();
      cvText = dbUser?.cvText?.trim() ?? '';
      if (!cvText || cvText.length < 80) {
        return new Response(
          JSON.stringify({
            message:
              'Guarda tu CV en Lía antes de aplicar (sección Mi CV) o desmarca "Adjuntar mi CV".',
          }),
          { status: 400 }
        );
      }
    }

    const id = generateId(15);
    const now = new Date();
    const mensajeFinal = String(mensaje).slice(0, 2000);

    await db.insert(Application).values({
      id,
      userId: user.id,
      opportunityId,
      estado: 'pending',
      mensaje: mensajeFinal,
      cvText: cvText.slice(0, 12000),
      createdAt: now,
      updatedAt: now,
    });

    // Add initial history entry
    await db.insert(ApplicationHistory).values({
      id: generateId(15),
      applicationId: id,
      estado: 'pending',
      comentario: 'Te has inscrito en la oferta',
      createdAt: now,
    });

    guardarUsuariosEnSnapshot();

    return new Response(
      JSON.stringify({
        success: true,
        application: {
          id,
          opportunityId,
          estado: 'pending',
          mensaje: mensajeFinal,
          tieneCv: cvText.length > 0,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al aplicar:', error);
    return new Response(JSON.stringify({ message: 'Error al enviar aplicación' }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const { applicationId } = await request.json();
    if (!applicationId) {
      return new Response(JSON.stringify({ message: 'Aplicación no indicada' }), { status: 400 });
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

    if (app.estado === 'accepted') {
      return new Response(
        JSON.stringify({ message: 'No puedes retirar una aplicación ya aceptada' }),
        { status: 400 }
      );
    }

    await db
      .update(Application)
      .set({ estado: 'withdrawn', updatedAt: new Date() })
      .where(eq(Application.id, applicationId));

    return new Response(JSON.stringify({ success: true, applicationId }), { status: 200 });
  } catch (error) {
    console.error('Error al retirar aplicación:', error);
    return new Response(JSON.stringify({ message: 'Error al retirar aplicación' }), { status: 500 });
  }
};
