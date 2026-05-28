import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, Subject, Enrollment, eq } from 'astro:db';
import { parseSubjectPayload, requireWikiAdmin } from '../../../../lib/wiki-admin';

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
    const body = await request.json();
    const parsed = parseSubjectPayload(body);
    if (parsed.error) return json({ message: parsed.error }, 400);

    const dup = await db
      .select()
      .from(Subject)
      .all()
      .then((rows) => rows.find((s) => s.codigo === parsed.data!.codigo));
    if (dup) {
      return json({ message: 'Ya existe una materia con ese código' }, 400);
    }

    const id = generateId(15);
    await db.insert(Subject).values({ id, ...parsed.data! });

    return json({ success: true, subject: { id, ...parsed.data!, inscritos: 0 } });
  } catch (error) {
    console.error('Error crear materia:', error);
    return json({ message: 'Error al crear materia' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const auth = await requireWikiAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const id = body.id?.toString();
    if (!id) return json({ message: 'ID de materia requerido' }, 400);

    const existing = await db.select().from(Subject).where(eq(Subject.id, id)).get();
    if (!existing) return json({ message: 'Materia no encontrada' }, 404);

    const parsed = parseSubjectPayload(body);
    if (parsed.error) return json({ message: parsed.error }, 400);

    const dup = await db
      .select()
      .from(Subject)
      .all()
      .then((rows) => rows.find((s) => s.codigo === parsed.data!.codigo && s.id !== id));
    if (dup) {
      return json({ message: 'Ya existe otra materia con ese código' }, 400);
    }

    await db.update(Subject).set(parsed.data!).where(eq(Subject.id, id));

    const inscritos = await db
      .select()
      .from(Enrollment)
      .all()
      .then((rows) => rows.filter((r) => r.subjectId === id).length);

    return json({ success: true, subject: { id, ...parsed.data!, inscritos } });
  } catch (error) {
    console.error('Error actualizar materia:', error);
    return json({ message: 'Error al actualizar materia' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const auth = await requireWikiAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const id = body.id?.toString();
    if (!id) return json({ message: 'ID de materia requerido' }, 400);

    const existing = await db.select().from(Subject).where(eq(Subject.id, id)).get();
    if (!existing) return json({ message: 'Materia no encontrada' }, 404);

    const enrollments = await db.select().from(Enrollment).all();
    for (const e of enrollments.filter((r) => r.subjectId === id)) {
      await db.delete(Enrollment).where(eq(Enrollment.id, e.id));
    }

    await db.delete(Subject).where(eq(Subject.id, id));

    return json({ success: true, id });
  } catch (error) {
    console.error('Error eliminar materia:', error);
    return json({ message: 'Error al eliminar materia' }, 500);
  }
};
