import type { APIRoute } from 'astro';
import { getSessionUser } from '../../lib/session';
import { buildConciergeContext } from '../../lib/concierge-context';
import { chatWithAssistant } from '../../lib/concierge-ai';
import { getAiStatus } from '../../lib/ai-config';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getSessionUser(cookies);
    if (!user) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Se requiere un array de mensajes' }), {
        status: 400,
      });
    }

    const ctx = await buildConciergeContext(user.id);
    if (!ctx) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404 });
    }

    const sanitized = messages
      .filter((m: { role?: string; content?: string }) => m?.content && typeof m.content === 'string')
      .slice(-20)
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).slice(0, 4000),
      }));

    const { message, mode, quotaExceeded } = await chatWithAssistant(sanitized, ctx);

    return new Response(
      JSON.stringify({
        message,
        mode,
        quotaExceeded: quotaExceeded ?? false,
        ai: getAiStatus(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error en API de Concierge:', error);
    const msg = error instanceof Error ? error.message : 'Error al procesar la solicitud';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
