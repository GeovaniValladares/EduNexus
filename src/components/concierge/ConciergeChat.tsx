import { useState, useRef, useEffect } from 'react';
import { BRAND } from '../../lib/branding';
import { Send } from 'lucide-react';
import type { ConciergeContext } from '../../lib/concierge-context';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface ConciergeChatProps {
  context: Pick<
    ConciergeContext,
    'nombre' | 'carrera' | 'cum' | 'materias' | 'cvGuardado'
  >;
  aiConfigured?: boolean;
  aiLabel?: string;
}

const QUICK_PROMPTS = [
  '¿Cómo mejorar mi CUM?',
  'Ayúdame con mis materias inscritas',
  'Oportunidades en Bridge para mi carrera',
  'Ayúdame con mi CV',
];

export default function ConciergeChat({
  context,
  aiConfigured = false,
  aiLabel = 'IA',
}: ConciergeChatProps) {
  const primerNombre = context.nombre.trim().split(/\s+/)[0] || context.nombre;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Hola ${primerNombre}. Soy ${BRAND.assistant.name}, tu asistente de la ULS. Estudio tu carrera (**${context.carrera}**), tus materias inscritas y tu CUM estimado (**${context.cum}**). Puedo ayudarte con estudio, pasantías en Bridge y tu curriculum vitae. ¿En qué te ayudo?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const messagesToSend = [...messages, userMessage].map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      const response = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messagesToSend }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener respuesta');
      }

      setMode(data.quotaExceeded ? 'local' : (data.mode ?? null));
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error de conexión. Intenta de nuevo en unos segundos.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex flex-wrap gap-2">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => sendMessage(p)}
            disabled={loading}
            className="text-xs bg-white border border-green-200 text-green-800 px-2 py-1 rounded-full hover:bg-green-100 disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] lg:max-w-md px-4 py-2 rounded-lg whitespace-pre-wrap ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-900 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{renderText(msg.text)}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-500'
                }`}
              >
                {msg.timestamp.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg rounded-bl-none">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {mode === 'local' && !error && !aiConfigured && (
          <p className="text-xs text-amber-700 text-center bg-amber-50 p-2 rounded">
            Modo básico. Configura un proveedor de IA en .env.local para respuestas avanzadas.
          </p>
        )}
        {mode && mode !== 'local' && !error && (
          <p className="text-xs text-slate-400 text-center">Respuesta con {aiLabel}</p>
        )}
      </div>

      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            aria-label="Enviar mensaje"
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
