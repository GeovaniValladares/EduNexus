import type { APIRoute } from 'astro';
import { lucia } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const sessionId = cookies.get(lucia.sessionCookieName)?.value ?? null;

  if (sessionId) {
    await lucia.invalidateSession(sessionId);
  }

  const blankCookie = lucia.createBlankSessionCookie();
  cookies.set(blankCookie.name, blankCookie.value, blankCookie.attributes);

  return redirect('/auth/login');
};
