import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import { lucia } from '../../../lib/auth';
import { verifyPassword } from '../../../lib/password';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const email = body.email?.toString().trim().toLowerCase();
    const password = body.password?.toString();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ message: 'Correo y contraseña son obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const user = await db
      .select()
      .from(User)
      .where(eq(User.email, email))
      .get();

    if (!user?.hashedPassword) {
      return new Response(
        JSON.stringify({ message: 'Credenciales incorrectas' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validPassword = await verifyPassword(user.hashedPassword, password);

    if (!validPassword) {
      return new Response(
        JSON.stringify({ message: 'Credenciales incorrectas' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    return new Response(JSON.stringify({ success: true, role: user.role }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error en login:', error);
    return new Response(
      JSON.stringify({ message: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
