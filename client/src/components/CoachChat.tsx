import { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { postCoachChat } from '../lib/api';
import type { ChatMessage, Recommendation } from '../types';

interface Props {
  recommendation: Recommendation | null;
}

const SUGGESTIONS = [
  'Why this session?',
  "I'm feeling sore today",
  'Tournament this Saturday',
  "How's my training trend?",
  'Should I deload this week?',
];

export default function CoachChat({ recommendation }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await postCoachChat(next, recommendation);
      if (res.error === 'no_key') {
        setNoKey(true);
      } else if (res.text) {
        setMessages(m => [...m, { role: 'assistant', content: res.text! }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Something went wrong. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">AI Coach</h2>
        <p className="text-sm text-gray-400">Ask about your plan, adjustments, or anything training-related.</p>
      </div>

      {noKey && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4">
          <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-300">
            <div className="font-medium mb-0.5">AI coach not configured</div>
            <div className="text-amber-400/80">Add <code className="bg-amber-500/20 px-1 rounded">ANTHROPIC_API_KEY=your_key</code> to <code className="bg-amber-500/20 px-1 rounded">server/.env</code> and restart the server.</div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🏋️</div>
            <div className="text-gray-400 text-sm">Your coach is ready. Ask anything about your training.</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-sky-600 text-white rounded-br-sm'
                : 'bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full px-3 py-1.5 text-gray-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-3 mt-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask your coach..."
          className="input flex-1"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="btn-primary px-4 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
