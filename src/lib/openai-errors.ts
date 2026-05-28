/** Detecta cuota agotada o límite de OpenAI (429). */
export function isOpenAiQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { status?: number; code?: string; message?: string; error?: { code?: string } };
  if (e.status === 429) return true;
  if (e.code === 'insufficient_quota' || e.code === 'rate_limit_exceeded') return true;
  if (e.error?.code === 'insufficient_quota') return true;
  const msg = String(e.message ?? '').toLowerCase();
  return msg.includes('quota') || msg.includes('429') || msg.includes('billing');
}

export const OPENAI_QUOTA_MESSAGE =
  'Tu cuenta de OpenAI no tiene crédito disponible (error 429). Puedes seguir usando Lía y guardar tu CV en modo local. Revisa facturación en platform.openai.com/account/billing';
