import { BRAND } from './branding';
import type { ConciergeContext } from './concierge-context';
import { contextToSystemPrompt } from './concierge-context';
import { generateLocalChatReply } from './concierge-local';
import { chatWithCloudAi, getAiStatus } from './ai-chat';
import type { AiProviderId } from './ai-config';
import { isCloudAiConfigured } from './ai-config';
import { OPENAI_QUOTA_MESSAGE } from './openai-errors';
import type { CvFormData } from './cv-form';
import { defaultCvForm, enhanceCvFormLocal } from './cv-form';

export { isCloudAiConfigured as isValidOpenAiKey, getAiStatus };
export { getOpenAiKey } from './ai-config';

export type AiResponseMode = AiProviderId | 'local';

const baseSystem = `Eres ${BRAND.assistant.name}, asistente académico y de carrera de la Universidad Luterana Salvadoreña (ULS).

REGLAS ABSOLUTAS:
1. Responde SIEMPRE en español. Jamás en otro idioma.
2. Usa los datos reales del estudiante que recibirás en el contexto: nombre, carrera, CUM, materias inscritas, oportunidades Bridge. NUNCA inventes datos que no están en el contexto.
3. Cuando menciones materias, cita su nombre y código exactos del contexto.
4. Cuando menciones oportunidades, cita el título y empresa exactos del contexto.
5. Sé concreto, motivador y profesional. Sin rodeos.

CAPACIDADES:
- Orientación académica personalizada por carrera y materias reales del estudiante
- Consejos específicos para mejorar el CUM (da estrategias por materia inscrita)
- Asesoría para aplicar en Bridge (cita oportunidades reales de la lista del contexto)
- Redacción y mejora del curriculum vitae profesional en español
- Explicación de trámites: constancia de inscripción, solvencia académica
- Orientación sobre el ciclo académico actual del estudiante

Para el CV: estructura según el estilo Harvard (perfil, formación, habilidades, experiencia, proyectos, idiomas). Enfoca habilidades según la carrera real del estudiante.`;

type ChatMsg = { role: 'user' | 'assistant' | 'system'; content: string };

export async function chatWithAssistant(
  messages: ChatMsg[],
  ctx: ConciergeContext
): Promise<{ message: string; mode: AiResponseMode; quotaExceeded?: boolean }> {
  const result = await chatWithCloudAi([baseSystem, contextToSystemPrompt(ctx)], messages);

  if (result?.quotaExceeded) {
    const base = generateLocalChatReply(messages, ctx);
    return {
      message: `Aviso: ${OPENAI_QUOTA_MESSAGE}\n\n${base}`,
      mode: 'local',
      quotaExceeded: true,
    };
  }

  if (result?.text) {
    return { message: result.text, mode: result.provider };
  }

  return {
    message: generateLocalChatReply(messages, ctx),
    mode: 'local',
  };
}

export async function enhanceCvFormWithOpenAI(
  form: CvFormData,
  ctx: ConciergeContext
): Promise<{ form: CvFormData; mode: AiResponseMode; quotaExceeded?: boolean }> {
  const localFallback = () => ({
    form: enhanceCvFormLocal({ ...defaultCvForm(ctx), ...form }, ctx),
    mode: 'local' as const,
  });

  if (!isCloudAiConfigured()) {
    return localFallback();
  }

  const cvSystemPrompt =
    `${baseSystem}\n\n${contextToSystemPrompt(ctx)}\n\n` +
    `TAREA: Mejorar el CV del estudiante. ` +
    `Responde ÚNICAMENTE con un JSON válido (sin texto adicional, sin markdown). ` +
    `El JSON debe tener EXACTAMENTE estas claves: nombreCompleto, email, telefono, ciudad, linkedin, carrera, perfil, formacion, materias, habilidades, experiencia, proyectos, idiomas. ` +
    `Reglas: ` +
    `(1) Perfil: 3-5 oraciones profesionales basadas en la carrera real. ` +
    `(2) Formacion: incluye ULS y la carrera real. ` +
    `(3) Materias: lista las materias inscritas reales del contexto. ` +
    `(4) Habilidades: relevantes para la carrera real. ` +
    `(5) Experiencia/Proyectos: si están vacíos, pon proyectos académicos plausibles para esa carrera. ` +
    `(6) NO inventes empleos formales, empresas ni fechas. ` +
    `(7) Conserva email, teléfono y ciudad del formulario original si están llenos.`;

  const result = await chatWithCloudAi(
    [cvSystemPrompt],
    [{ role: 'user', content: JSON.stringify({ formulario: form }) }],
    { json: true, maxTokens: 2000 }
  );

  if (result?.quotaExceeded) {
    return { ...localFallback(), quotaExceeded: true };
  }

  if (result?.text) {
    try {
      const parsed = JSON.parse(result.text) as Partial<CvFormData>;
      return {
        form: { ...form, ...parsed },
        mode: result.provider,
      };
    } catch {
      console.error('[Lía] JSON de CV inválido, usando plantilla local');
    }
  }

  return localFallback();
}

export async function generateCvWithAssistant(ctx: ConciergeContext) {
  const enhanced = await enhanceCvFormWithOpenAI(defaultCvForm(ctx), ctx);
  const { formToMarkdown } = await import('./cv-form');
  return {
    cv: formToMarkdown(enhanced.form),
    mode: enhanced.mode,
  };
}
