import { defineMiddleware } from 'astro:middleware';
import { getSessionUser } from './lib/session';

// Routes accessible without a completed student profile
const SETUP_ALLOWED = [
  '/auth/',
  '/api/',
  '/perfil/completar',
  '/docente',
  '/',
];

// Student-only routes — teachers should be redirected away from these
const STUDENT_ONLY_PREFIXES = [
  '/dashboard',
  '/wiki',
  '/concierge',
  '/bridge',
  '/perfil',
];

function isSetupAllowed(pathname: string): boolean {
  return SETUP_ALLOWED.some((prefix) => pathname.startsWith(prefix));
}

function isStudentOnly(pathname: string): boolean {
  return STUDENT_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const user = await getSessionUser(context.cookies);
  context.locals.user = user;

  if (user) {
    const path = context.url.pathname;

    // Teachers must stay inside their own panel
    if (user.role === 'docente' && isStudentOnly(path)) {
      return context.redirect('/docente');
    }

    // Company users must stay in the empresa panel
    if (user.role === 'empresa' && isStudentOnly(path)) {
      return context.redirect('/empresa');
    }

    // Students with incomplete profiles must finish setup before accessing anything else
    if (
      !user.perfilCompleto &&
      user.role === 'alumno' &&
      !isSetupAllowed(path) &&
      path !== '/perfil/completar'
    ) {
      return context.redirect('/perfil/completar');
    }
  }

  const response = await next();

  // Prevent browser from caching authenticated pages (fixes "back after logout" bug)
  if (user) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
});
