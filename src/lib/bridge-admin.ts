import type { APIContext } from 'astro';
import { getSessionUser } from './session';
import { isAdmin } from './roles';

export {
  CARRERAS,
  BRIDGE_TIPOS,
  parseOpportunityPayload,
  serializeRequisitos,
  serializeCarreras,
  opportunityToForm,
} from './bridge-admin-shared';

export async function requireBridgeAdmin(cookies: APIContext['cookies']) {
  const user = await getSessionUser(cookies);
  if (!user) {
    return { error: new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 }) };
  }
  if (!isAdmin(user.role)) {
    return { error: new Response(JSON.stringify({ message: 'No autorizado' }), { status: 403 }) };
  }
  return { user };
}
