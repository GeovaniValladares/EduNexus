import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, Application, Opportunity, User, eq } from 'astro:db';
import { requireBridgeAdmin } from '../../../../lib/bridge-admin';
import { formatFecha } from '../../../../lib/bridge';
import { ROLES } from '../../../../lib/roles';
import type { ApplicationEstado } from '../../../../lib/bridge';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ESTADOS: ApplicationEstado[] = ['pending', 'accepted', 'rejected', 'withdrawn'];

export const GET: APIRoute = async ({ url, cookies }) => {
  const auth = await requireBridgeAdmin(cookies);
  if (auth.error) return auth.error;

  const opportunityId = url.searchParams.get('opportunityId');
  const estado = url.searchParams.get('estado');

  const allApps = await db.select().from(Application).all();
  const opps = await db.select().from(Opportunity).all();
  const users = await db.select().from(User).all();

  const oppMap = Object.fromEntries(opps.map((o) => [o.id, o]));
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

  let filtered = allApps;
  if (opportunityId) {
    filtered = filtered.filter((a) => a.opportunityId === opportunityId);
  }
  if (estado && estado !== 'todas') {
    filtered = filtered.filter((a) => a.estado === estado);
  }

  const applications = filtered.map((a) => {
    const opp = oppMap[a.opportunityId];
    const u = userMap[a.userId];
    return {
      id: a.id,
      opportunityId: a.opportunityId,
      userId: a.userId,
      titulo: opp?.titulo ?? '—',
      empresa: opp?.empresa ?? '—',
      estudianteNombre: u?.nombre ?? '—',
      estudianteEmail: u?.email ?? '—',
      estudianteCarrera: u?.carrera ?? '—',
      estado: a.estado,
      mensaje: a.mensaje ?? '',
      fecha: formatFecha(a.createdAt),
      horasSemanales: opp?.horasSemanales ?? 0,
    };
  });

  applications.sort((a, b) => b.fecha.localeCompare(a.fecha));

  return json({ applications, total: applications.length });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireBridgeAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const { userId, opportunityId, mensaje } = await request.json();
    if (!userId || !opportunityId) {
      return json({ message: 'Alumno y oportunidad son obligatorios' }, 400);
    }

    const student = await db.select().from(User).where(eq(User.id, userId)).get();
    if (!student) return json({ message: 'Alumno no encontrado' }, 404);
    if (student.role !== ROLES.ALUMNO && student.role !== ROLES.STUDENT) {
      return json({ message: 'La cuenta no es de estudiante' }, 400);
    }

    const opp = await db.select().from(Opportunity).where(eq(Opportunity.id, opportunityId)).get();
    if (!opp) return json({ message: 'Oportunidad no encontrada' }, 404);
    if (!opp.activo) return json({ message: 'La oportunidad está inactiva' }, 400);

    const allApps = await db.select().from(Application).all();
    const activa = allApps.find(
      (a) => a.userId === userId && a.opportunityId === opportunityId && a.estado !== 'withdrawn'
    );
    if (activa) {
      return json({ message: 'El alumno ya tiene una aplicación activa a esta oportunidad' }, 400);
    }

    const id = generateId(15);
    const now = new Date();
    await db.insert(Application).values({
      id,
      userId,
      opportunityId,
      estado: 'pending',
      mensaje: String(mensaje ?? '').slice(0, 2000),
      cvText: '',
      createdAt: now,
      updatedAt: now,
    });

    return json({
      success: true,
      application: {
        id,
        opportunityId,
        userId,
        titulo: opp.titulo,
        empresa: opp.empresa,
        estudianteNombre: student.nombre,
        estudianteEmail: student.email,
        estudianteCarrera: student.carrera ?? '—',
        estado: 'pending',
        mensaje: String(mensaje ?? ''),
        fecha: formatFecha(now),
        horasSemanales: opp.horasSemanales,
      },
    });
  } catch (error) {
    console.error('Error crear aplicación (admin):', error);
    return json({ message: 'Error al registrar aplicación' }, 500);
  }
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
  const auth = await requireBridgeAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const id = body.applicationId?.toString();
    if (!id) return json({ message: 'ID de aplicación requerido' }, 400);

    const app = await db.select().from(Application).where(eq(Application.id, id)).get();
    if (!app) return json({ message: 'Aplicación no encontrada' }, 404);

    const update: Record<string, unknown> = { updatedAt: new Date() };

    if (body.estado !== undefined) {
      const estado = body.estado as ApplicationEstado;
      if (!ESTADOS.includes(estado)) {
        return json({ message: 'Estado no válido' }, 400);
      }
      update.estado = estado;
    }

    if (body.mensaje !== undefined) {
      update.mensaje = String(body.mensaje).slice(0, 2000);
    }

    await db.update(Application).set(update).where(eq(Application.id, id));

    const opp = await db.select().from(Opportunity).where(eq(Opportunity.id, app.opportunityId)).get();
    const u = await db.select().from(User).where(eq(User.id, app.userId)).get();

    return json({
      success: true,
      application: {
        id,
        opportunityId: app.opportunityId,
        userId: app.userId,
        titulo: opp?.titulo ?? '—',
        empresa: opp?.empresa ?? '—',
        estudianteNombre: u?.nombre ?? '—',
        estudianteEmail: u?.email ?? '—',
        estudianteCarrera: u?.carrera ?? '—',
        estado: (update.estado as string) ?? app.estado,
        mensaje: (update.mensaje as string) ?? app.mensaje,
        fecha: formatFecha(app.createdAt),
        horasSemanales: opp?.horasSemanales ?? 0,
      },
    });
  } catch (error) {
    console.error('Error actualizar aplicación (admin):', error);
    return json({ message: 'Error al actualizar' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const auth = await requireBridgeAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const id = body.applicationId?.toString();
    if (!id) return json({ message: 'ID requerido' }, 400);

    const app = await db.select().from(Application).where(eq(Application.id, id)).get();
    if (!app) return json({ message: 'Aplicación no encontrada' }, 404);

    await db
      .update(Application)
      .set({ estado: 'withdrawn', updatedAt: new Date() })
      .where(eq(Application.id, id));

    return json({ success: true, applicationId: id, opportunityId: app.opportunityId });
  } catch (error) {
    console.error('Error dar de baja aplicación (admin):', error);
    return json({ message: 'Error al dar de baja' }, 500);
  }
};
