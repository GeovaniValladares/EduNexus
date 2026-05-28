import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, User, Enrollment, eq } from 'astro:db';
import { hashPassword } from '../../../../lib/password';
import { ROLES } from '../../../../lib/roles';
import { parseStudentPayload, requireWikiAdmin } from '../../../../lib/wiki-admin';
import { guardarUsuariosEnSnapshot } from '../../../../lib/db-persist';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ url, cookies }) => {
  const auth = await requireWikiAdmin(cookies);
  if (auth.error) return auth.error;

  const q = url.searchParams.get('q')?.trim().toLowerCase() ?? '';
  const carrera = url.searchParams.get('carrera')?.trim() ?? '';

  const allUsers = await db.select().from(User).all();
  const enrollments = await db.select().from(Enrollment).all();
  const countByUser = enrollments.reduce<Record<string, number>>((acc, e) => {
    acc[e.userId] = (acc[e.userId] ?? 0) + 1;
    return acc;
  }, {});

  let students = allUsers.filter((u) => u.role === ROLES.ALUMNO || u.role === ROLES.STUDENT);

  if (carrera) {
    students = students.filter((u) => u.carrera === carrera);
  }
  if (q) {
    students = students.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.carrera ?? '').toLowerCase().includes(q)
    );
  }

  return json({
    students: students.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      carrera: u.carrera ?? '',
      inscripciones: countByUser[u.id] ?? 0,
      createdAt: u.createdAt,
    })),
    total: students.length,
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireWikiAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = parseStudentPayload(body);
    if (parsed.error) return json({ message: parsed.error }, 400);

    const { nombre, email, carrera, password } = parsed.data!;
    const pwd = password || 'AlumnoULS2026!';

    const existing = await db.select().from(User).where(eq(User.email, email)).get();
    if (existing) {
      return json({ message: 'El correo ya está registrado' }, 400);
    }

    const id = generateId(15);
    const hashedPassword = await hashPassword(pwd);

    await db.insert(User).values({
      id,
      email,
      nombre,
      carrera,
      hashedPassword,
      role: ROLES.ALUMNO,
      cvText: '',
      cvData: '',
      createdAt: new Date(),
    });

    guardarUsuariosEnSnapshot();

    return json({
      success: true,
      student: { id, nombre, email, carrera, inscripciones: 0 },
      tempPassword: password ? undefined : pwd,
    });
  } catch (error) {
    console.error('Error crear alumno:', error);
    return json({ message: 'Error al crear alumno' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  const auth = await requireWikiAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const id = body.id?.toString();
    if (!id) return json({ message: 'ID de alumno requerido' }, 400);

    const existing = await db.select().from(User).where(eq(User.id, id)).get();
    if (!existing) return json({ message: 'Alumno no encontrado' }, 404);
    if (existing.role !== ROLES.ALUMNO && existing.role !== ROLES.STUDENT) {
      return json({ message: 'Solo se pueden editar cuentas de estudiante' }, 400);
    }

    const parsed = parseStudentPayload(body);
    if (parsed.error) return json({ message: parsed.error }, 400);

    const { nombre, email, carrera, password } = parsed.data!;

    const emailTaken = await db
      .select()
      .from(User)
      .all()
      .then((rows) => rows.find((u) => u.email === email && u.id !== id));
    if (emailTaken) {
      return json({ message: 'El correo ya está en uso' }, 400);
    }

    const update: Record<string, unknown> = { nombre, email, carrera };
    if (password) {
      update.hashedPassword = await hashPassword(password);
    }

    await db.update(User).set(update).where(eq(User.id, id));

    const inscripciones = await db
      .select()
      .from(Enrollment)
      .all()
      .then((rows) => rows.filter((r) => r.userId === id).length);

    return json({
      success: true,
      student: { id, nombre, email, carrera, inscripciones },
    });
  } catch (error) {
    console.error('Error actualizar alumno:', error);
    return json({ message: 'Error al actualizar alumno' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const auth = await requireWikiAdmin(cookies);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const id = body.id?.toString();
    if (!id) return json({ message: 'ID de alumno requerido' }, 400);

    const existing = await db.select().from(User).where(eq(User.id, id)).get();
    if (!existing) return json({ message: 'Alumno no encontrado' }, 404);
    if (existing.role !== ROLES.ALUMNO && existing.role !== ROLES.STUDENT) {
      return json({ message: 'No se puede eliminar esta cuenta' }, 400);
    }

    const enrollments = await db.select().from(Enrollment).all();
    for (const e of enrollments.filter((r) => r.userId === id)) {
      await db.delete(Enrollment).where(eq(Enrollment.id, e.id));
    }

    await db.delete(User).where(eq(User.id, id));

    return json({ success: true, id });
  } catch (error) {
    console.error('Error eliminar alumno:', error);
    return json({ message: 'Error al eliminar alumno' }, 500);
  }
};
