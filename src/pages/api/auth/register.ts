import type { APIRoute } from 'astro';
import { generateId } from 'lucia';
import { db, User, eq } from 'astro:db';
import { lucia } from '../../../lib/auth';
import { isCarreraValida } from '../../../lib/carreras';
import { hashPassword } from '../../../lib/password';
import { guardarUsuariosEnSnapshot } from '../../../lib/db-persist';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const email = body.email?.toString().trim().toLowerCase();
    const nombre = (body.name ?? body.nombre)?.toString().trim();
    const carrera = body.carrera?.toString().trim();
    const password = body.password?.toString();
    const role = body.role?.toString() || 'alumno';

    if (!email || !nombre || !password || !carrera) {
      return new Response(
        JSON.stringify({ message: 'Nombre, correo, carrera y contraseña son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Domain validation for companies
    if (role === 'empresa') {
      const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'msn.com'];
      const domain = email.split('@')[1]?.toLowerCase();
      if (personalDomains.includes(domain)) {
        return new Response(
          JSON.stringify({ message: 'Use un correo institucional de su empresa para registrarse como Empresa.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (role === 'alumno' && !isCarreraValida(carrera)) {
      return new Response(
        JSON.stringify({ message: 'Carrera no válida' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ message: 'La contraseña debe tener al menos 8 caracteres' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const existingUser = await db
      .select()
      .from(User)
      .where(eq(User.email, email))
      .get();

    if (existingUser) {
      return new Response(
        JSON.stringify({ message: 'El correo ya está registrado' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = generateId(15);
    const hashedPassword = await hashPassword(password);

    await db.insert(User).values({
      id: userId,
      email,
      nombre,
      carrera,
      hashedPassword,
      role: role as any,
      cvText: '',
      cvData: '',
      createdAt: new Date(),
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    guardarUsuariosEnSnapshot();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    return new Response(
      JSON.stringify({ message: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
