import type { APIRoute } from 'astro';
import { db, User, eq } from 'astro:db';
import { getSessionUser } from '../../../lib/session';
import { buildConciergeContext } from '../../../lib/concierge-context';
import {
  enhanceCvFormWithOpenAI,
} from '../../../lib/concierge-ai';
import { defaultCvForm, enhanceCvFormLocal, formToMarkdown } from '../../../lib/cv-form';
import type { CvFormData } from '../../../lib/cv-form';

export const prerender = false;

// ── POST — generate / enhance / local ────────────────────────────────────────
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const action: string = body.action ?? 'local';

    // Build DB context so Lía knows the student's career, subjects, grades, etc.
    const ctx = await buildConciergeContext(user.id);
    if (!ctx) {
      return new Response(JSON.stringify({ message: 'No se encontró el perfil del usuario.' }), {
        status: 404,
      });
    }

    // Merge incoming partial form with sensible defaults
    const baseForm = defaultCvForm(ctx);
    const incomingForm: CvFormData = body.form
      ? { ...baseForm, ...body.form }
      : baseForm;

    let result: { form: CvFormData; mode: string; quotaExceeded?: boolean };

    if (action === 'generate') {
      // Start from a clean context-filled form, then improve with AI
      result = await enhanceCvFormWithOpenAI(baseForm, ctx);
    } else if (action === 'enhance') {
      // Improve the student's existing draft with AI
      result = await enhanceCvFormWithOpenAI(incomingForm, ctx);
    } else {
      // 'local' — apply the template engine without any cloud call
      result = {
        form: enhanceCvFormLocal(incomingForm, ctx),
        mode: 'local',
      };
    }

    return new Response(
      JSON.stringify({
        cvData:   result.form,
        mode:     result.mode,
        warning:  result.quotaExceeded
          ? 'Lía usó su plantilla local porque el proveedor de IA no está disponible ahora.'
          : undefined,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[CV API] Error en POST:', error);
    return new Response(
      JSON.stringify({ message: 'Error al generar el CV. Intenta de nuevo.' }),
      { status: 500 }
    );
  }
};

// ── PUT — save cvData (JSON) + cvText (markdown preview) ─────────────────────
export const PUT: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ message: 'No autenticado' }), { status: 401 });
  }

  try {
    const body = await request.json();

    // cvData can be a CvFormData object or already a JSON string
    const cvDataRaw  = body.cvData;
    const cvDataStr  = typeof cvDataRaw === 'string' ? cvDataRaw : JSON.stringify(cvDataRaw ?? {});

    // cvText is the markdown preview; regenerate from form if not provided
    let cvText: string = body.cvText ?? '';
    if (!cvText && cvDataRaw && typeof cvDataRaw === 'object') {
      try { cvText = formToMarkdown(cvDataRaw as CvFormData); } catch { /* ignore */ }
    }

    await db
      .update(User)
      .set({ cvData: cvDataStr, cvText })
      .where(eq(User.id, user.id));

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('[CV API] Error en PUT:', error);
    return new Response(
      JSON.stringify({ message: 'Error al guardar los datos del CV.' }),
      { status: 500 }
    );
  }
};
