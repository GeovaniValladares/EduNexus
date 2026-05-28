const PLACEHOLDER = [
  'tu_clave',
  'tu_api',
  'sk-...',
  'coloca',
  'your_api',
  'example',
  'aqui',
  'aquí',
  'xxx',
  'pega',
];

export type AiProviderId = 'groq' | 'gemini' | 'openai' | 'openrouter' | 'local';

export type ResolvedAi = {
  provider: AiProviderId;
  label: string;
  model: string;
};

function env(name: string): string | undefined {
  const v = import.meta.env[name] ?? (typeof process !== 'undefined' ? process.env[name] : undefined);
  if (!v) return undefined;
  const s = String(v).trim();
  return s || undefined;
}

function isRealKey(key: string | undefined, minLen = 16): boolean {
  if (!key) return false;
  const lower = key.toLowerCase();
  if (key.length < minLen) return false;
  return !PLACEHOLDER.some((p) => lower.includes(p));
}

export function getGroqKey(): string | undefined {
  const k = env('GROQ_API_KEY');
  return isRealKey(k, 20) ? k : undefined;
}

export function getGeminiKey(): string | undefined {
  const k = env('GOOGLE_GEMINI_API_KEY') ?? env('GEMINI_API_KEY');
  return isRealKey(k, 20) ? k : undefined;
}

export function getOpenAiKey(): string | undefined {
  const k = env('OPENAI_API_KEY');
  return isRealKey(k, 20) && k!.startsWith('sk-') ? k : undefined;
}

export function getOpenRouterKey(): string | undefined {
  const k = env('OPENROUTER_API_KEY');
  return isRealKey(k, 20) && k!.startsWith('sk-or-') ? k : undefined;
}

export function getAiProviderPreference(): string {
  return (env('AI_PROVIDER') ?? 'auto').toLowerCase();
}

/** Orden en modo auto: OpenRouter → Groq → Gemini → OpenAI */
export function resolveAiProvider(): ResolvedAi {
  const pref = getAiProviderPreference();

  const tryOpenRouter = (): ResolvedAi | null =>
    getOpenRouterKey()
      ? {
          provider: 'openrouter',
          label: `OpenRouter (${env('OPENROUTER_MODEL') ?? 'meta-llama/llama-3.3-70b-instruct:free'})`,
          model: env('OPENROUTER_MODEL') ?? 'meta-llama/llama-3.3-70b-instruct:free',
        }
      : null;

  const tryGroq = (): ResolvedAi | null =>
    getGroqKey()
      ? {
          provider: 'groq',
          label: 'Llama 3.3 70B',
          model: env('GROQ_MODEL') ?? 'llama-3.3-70b-versatile',
        }
      : null;

  const tryGemini = (): ResolvedAi | null =>
    getGeminiKey()
      ? {
          provider: 'gemini',
          label: 'Google Gemini',
          model: env('GEMINI_MODEL') ?? 'gemini-2.0-flash',
        }
      : null;

  const tryOpenai = (): ResolvedAi | null =>
    getOpenAiKey()
      ? {
          provider: 'openai',
          label: 'OpenAI',
          model: env('OPENAI_MODEL') ?? 'gpt-4o-mini',
        }
      : null;

  if (pref === 'openrouter') return tryOpenRouter() ?? { provider: 'local', label: 'Modo local', model: '' };
  if (pref === 'groq')       return tryGroq()       ?? { provider: 'local', label: 'Modo local', model: '' };
  if (pref === 'gemini')     return tryGemini()     ?? { provider: 'local', label: 'Modo local', model: '' };
  if (pref === 'openai')     return tryOpenai()     ?? { provider: 'local', label: 'Modo local', model: '' };
  if (pref === 'local')      return { provider: 'local', label: 'Modo local', model: '' };

  // auto — prioridad: OpenRouter → Groq → Gemini → OpenAI
  return tryOpenRouter() ?? tryGroq() ?? tryGemini() ?? tryOpenai() ?? { provider: 'local', label: 'Modo local', model: '' };
}

export function isCloudAiConfigured(): boolean {
  return resolveAiProvider().provider !== 'local';
}

/** Cadena de proveedores a intentar (sin modo local). */
export function getActiveProviderChain(): ResolvedAi[] {
  const pref = getAiProviderPreference();

  const openrouter = getOpenRouterKey()
    ? {
        provider: 'openrouter' as const,
        label: `OpenRouter`,
        model: env('OPENROUTER_MODEL') ?? 'meta-llama/llama-3.3-70b-instruct:free',
      }
    : null;

  const groq = getGroqKey()
    ? { provider: 'groq' as const, label: 'Llama 3.3 70B', model: env('GROQ_MODEL') ?? 'llama-3.3-70b-versatile' }
    : null;

  const gemini = getGeminiKey()
    ? { provider: 'gemini' as const, label: 'Gemini', model: env('GEMINI_MODEL') ?? 'gemini-2.0-flash' }
    : null;

  const openai = getOpenAiKey()
    ? { provider: 'openai' as const, label: 'OpenAI', model: env('OPENAI_MODEL') ?? 'gpt-4o-mini' }
    : null;

  if (pref === 'openrouter') return openrouter ? [openrouter] : [];
  if (pref === 'groq')       return groq       ? [groq]       : [];
  if (pref === 'gemini')     return gemini      ? [gemini]     : [];
  if (pref === 'openai')     return openai      ? [openai]     : [];
  if (pref === 'local')      return [];

  // auto: solo el primer disponible para evitar costos accidentales
  const first = openrouter ?? groq ?? gemini ?? openai;
  return first ? [first] : [];
}

export function getAiStatus() {
  const resolved = resolveAiProvider();
  return {
    configured: resolved.provider !== 'local',
    provider: resolved.provider,
    label: resolved.label,
    model: resolved.model,
  };
}

/** @deprecated usar isCloudAiConfigured */
export function isValidOpenAiKey(key?: string): boolean {
  return !!getOpenAiKey() || isCloudAiConfigured();
}
