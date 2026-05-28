import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const { getAiStatus, getActiveProviderChain } = await import('../src/lib/ai-config.ts');
const { chatWithCloudAi } = await import('../src/lib/ai-chat.ts');

console.log('Estado IA:', getAiStatus());
console.log('Cadena:', getActiveProviderChain().map((p) => p.provider));

const r = await chatWithCloudAi(
  ['Eres un asistente breve en español.'],
  [{ role: 'user', content: 'Di hola en una línea.' }]
);

if (r?.text) {
  console.log('OK:', r.provider, '→', r.text.slice(0, 120));
} else if (r?.quotaExceeded) {
  console.log('OpenAI sin crédito. Añade GROQ_API_KEY en .env.local');
} else {
  console.log('Sin respuesta cloud. Usa GROQ_API_KEY o modo local.');
}
