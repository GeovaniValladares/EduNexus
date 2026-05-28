import { OpenAI } from 'openai';

const PLACEHOLDER_PATTERNS = [
  'tu_clave',
  'tu_api',
  'sk-...',
  'coloca_tu',
  'your_api',
  'example',
  'aqui',
  'aquí',
  'xxx',
];

export function getOpenAiKey(): string | undefined {
  const fromImport = import.meta.env.OPENAI_API_KEY;
  if (fromImport && String(fromImport).trim()) return String(fromImport).trim();
  if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY.trim();
  }
  return undefined;
}

export function isValidOpenAiKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim();
  if (k.length < 20) return false;
  if (!k.startsWith('sk-')) return false;
  const lower = k.toLowerCase();
  return !PLACEHOLDER_PATTERNS.some((p) => lower.includes(p));
}

export function createOpenAiClient(): OpenAI | null {
  const apiKey = getOpenAiKey();
  if (!isValidOpenAiKey(apiKey)) return null;
  return new OpenAI({ apiKey });
}

export const OPENAI_CHAT_MODEL = 'gpt-4o-mini';
