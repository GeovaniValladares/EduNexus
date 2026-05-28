import type { AstroCookies } from 'astro';
import { db, User, eq } from 'astro:db';
import { lucia } from './auth';

export type SessionUser = {
  id: string;
  email: string;
  nombre: string;
  carrera: string;
  ciclo: string;
  telefono: string;
  perfilCompleto: boolean;
  avatarUrl: string;
  role: string;
};

export async function getSessionUser(
  cookies: AstroCookies
): Promise<SessionUser | null> {
  const sessionId = cookies.get(lucia.sessionCookieName)?.value ?? null;
  if (!sessionId) return null;

  const { session, user } = await lucia.validateSession(sessionId);

  if (!session) {
    const blankCookie = lucia.createBlankSessionCookie();
    cookies.set(blankCookie.name, blankCookie.value, blankCookie.attributes);
    return null;
  }

  if (session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  }

  const dbUser = await db.select().from(User).where(eq(User.id, user.id)).get();
  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    nombre: dbUser.nombre,
    carrera: dbUser.carrera ?? '',
    ciclo: dbUser.ciclo ?? 'I',
    telefono: dbUser.telefono ?? '',
    perfilCompleto: dbUser.perfilCompleto ?? false,
    avatarUrl: dbUser.avatarUrl ?? '',
    role: dbUser.role ?? 'alumno',
  };
}

export function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export { getRoleLabel } from './roles';
