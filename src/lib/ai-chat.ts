import { OpenAI } from 'openai';
import type { AiProviderId, ResolvedAi } from './ai-config';
import {
  getGroqKey,
  getGeminiKey,
  getOpenAiKey,
  getOpenRouterKey,
  getActiveProviderChain,
} from './ai-config';
import { isOpenAiQuotaError } from './openai-errors';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type ChatResult = {
  text: string;
  provider: AiProviderId;
  quotaExceeded?: boolean;
};

function buildOpenAiMessages(systemParts: string[], messages: ChatMessage[]) {
  return [
    ...systemParts.map((content) => ({ role: 'system' as const, content })),
    ...messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
  ];
}

async function chatViaOpenAiCompatible(
  apiKey: string,
  baseURL: string | undefined,
  model: string,
  systemParts: string[],
  messages: ChatMessage[],
  opts: { json?: boolean; maxTokens?: number },
  extraHeaders?: Record<string, string>
): Promise<string> {
  const client = new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders: extraHeaders,
  });
  const response = await client.chat.completions.create({
    model,
    messages: buildOpenAiMessages(systemParts, messages),
    temperature: 0.65,
    max_tokens: opts.maxTokens ?? 900,
    ...(opts.json ? { response_format: { type: 'json_object' as const } } : {}),
  });
  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error('Respuesta vacía del modelo');
  return text;
}

async function chatViaGemini(
  apiKey: string,
  model: string,
  systemParts: string[],
  messages: ChatMessage[],
  opts: { json?: boolean; maxTokens?: number }
): Promise<string> {
  const systemText = systemParts.join('\n\n');
  const contents = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: opts.maxTokens ?? 900,
        ...(opts.json ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Respuesta vacía de Gemini');
  return text;
}

async function callProvider(
  resolved: ResolvedAi,
  systemParts: string[],
  messages: ChatMessage[],
  opts: { json?: boolean; maxTokens?: number }
): Promise<string> {
  if (resolved.provider === 'openrouter') {
    return chatViaOpenAiCompatible(
      getOpenRouterKey()!,
      'https://openrouter.ai/api/v1',
      resolved.model,
      systemParts,
      messages,
      opts,
      {
        'HTTP-Referer': 'https://edunexus.uls.edu.sv',
        'X-Title': 'Edunexus — Plataforma ULS',
      }
    );
  }
  if (resolved.provider === 'groq') {
    return chatViaOpenAiCompatible(
      getGroqKey()!,
      'https://api.groq.com/openai/v1',
      resolved.model,
      systemParts,
      messages,
      opts
    );
  }
  if (resolved.provider === 'openai') {
    return chatViaOpenAiCompatible(
      getOpenAiKey()!,
      undefined,
      resolved.model,
      systemParts,
      messages,
      opts
    );
  }
  if (resolved.provider === 'gemini') {
    return chatViaGemini(getGeminiKey()!, resolved.model, systemParts, messages, opts);
  }
  throw new Error('Proveedor no soportado');
}

export async function chatWithCloudAi(
  systemParts: string[],
  messages: ChatMessage[],
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<ChatResult | null> {
  const chain = getActiveProviderChain();
  if (chain.length === 0) return null;

  let openaiQuota = false;
  let lastError: unknown;

  for (const resolved of chain) {
    try {
      const text = await callProvider(resolved, systemParts, messages, opts);
      return { text, provider: resolved.provider };
    } catch (err) {
      lastError = err;
      if (resolved.provider === 'openai' && isOpenAiQuotaError(err)) {
        openaiQuota = true;
      }
      console.error(`[Lía] Falló ${resolved.provider}, probando siguiente...`, err);
    }
  }

  if (openaiQuota) {
    return { text: '', provider: 'local', quotaExceeded: true };
  }

  console.error('[Lía] Todos los proveedores fallaron:', lastError);
  return null;
}

export { getAiStatus } from './ai-config';
