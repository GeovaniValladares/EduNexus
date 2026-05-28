import type { APIContext } from 'astro';
import { getSessionUser } from './session';
import { isAdmin } from './roles';

export {
  CARRERAS,
  WIKI_SEMESTRES,
  parseSubjectPayload,
  parseStudentPayload,
} from './wiki-admin-shared';
export type { SubjectPayload } from './wiki-admin-shared';

export async function requireWikiAdmin(cookies: APIContext['cookies']) {
  const user = await getSessionUser(cookies);
  if (!user) {
    return { error: new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 }) };
  }
  if (!isAdmin(user.role)) {
    return { error: new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 }) };
  }
  return { user };
}
