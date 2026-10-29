import { useState, useRef, useEffect } from 'react';

const API_URL = (import.meta.env.VITE_ASSISTANT_API_URL || 'http://localhost:3006').replace(/\/$/, '');

const TIERS = [
  { id: 'L1', label: 'L1 · symptom match' },
  { id: 'L2', label: 'L2 · live telemetry' },
  { id: 'L3', label: 'L3 · escalate to Bosch' },
];

const ADVANCE_PROMPTS = {
  L2: 'The issue is still not resolved. Please check the vehicle’s live telemetry and reassess.',
  L3: 'The issue remains unresolved even after the live telemetry analysis. Please prepare to escalate this case to Bosch.',
};

function TierPills({ tier }) {
  const activeIdx = TIERS.findIndex(t => t.id === tier);
  return (
    <div className="flex gap-2">
      {TIERS.map((t, i) => (
        <div
          key={t.id}
          className={
            'px-3 py-1.5 rounded-full text-xs font-medium border ' +
            (i < activeIdx
              ? 'bg-slate-100 border-slate-200 text-slate-400'
              : i === activeIdx
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-slate-200 text-slate-400')
          }
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}

function Bubble({ role, content }) {
  const isUser = role === 'user';
  return (
    <div className={'flex ' + (isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ' +
          (isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm')
        }
      >
        {content}
      </div>
    </div>
  );
}

export default function App() {
  const [vin, setVin] = useState('MA3YPLCSKSJ103467');
  const [tier, setTier] = useState('L1');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastTelemetry, setLastTelemetry] = useState(null);
  const [escalation, setEscalation] = useState(null);
  const [escalating, setEscalating] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function sendTurn(text, tierOverride) {
    const activeTier = tierOverride || tier;
    const userMsg = { role: 'user', content: text };
    const historyForRequest = messages;
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin, tier: activeTier, history: historyForRequest, message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assistant call failed');
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      if (data.telemetry) setLastTelemetry(data.telemetry);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text || !vin.trim() || loading) return;
    sendTurn(text);
  }

  function handleAdvance(nextTier) {
    setTier(nextTier);
    sendTurn(ADVANCE_PROMPTS[nextTier], nextTier);
  }

  async function handleEscalate() {
    setEscalating(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin, transcript: messages, telemetry_snapshot: lastTelemetry }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Escalation failed');
      setEscalation(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setEscalating(false);
    }
  }

  const hasAssistantReply = messages.some(m => m.role === 'assistant');
  const canAdvanceToL2 = tier === 'L1' && hasAssistantReply && !loading;
  const canAdvanceToL3 = tier === 'L2' && hasAssistantReply && !loading;
  const canEscalate = tier === 'L3' && hasAssistantReply && !loading && !escalation;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm font-semibold">Cockpit dealer assistant</div>
          <div className="text-xs text-slate-400">RBIN / Maruti Suzuki digital cockpit &middot; L1&ndash;L3 triage</div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400">VIN</label>
          <input
            value={vin}
            onChange={e => setVin(e.target.value)}
            disabled={messages.length > 0}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white w-56 disabled:opacity-60"
          />
        </div>
      </header>

      <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between flex-wrap gap-3">
        <TierPills tier={tier} />
        {lastTelemetry && (
          <div className="text-xs text-slate-500">
            live health score: <span className="font-mono font-semibold text-slate-700">{lastTelemetry.kpis?.cockpit_health_score ?? '—'}</span>
            {' '}&middot; severity: <span className="font-mono font-semibold text-slate-700">{lastTelemetry.kpis?.highest_severity ?? '—'}</span>
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3 max-w-3xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-400 mt-12">
            Describe the issue the customer reported to start an L1 triage.
          </div>
        )}
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-slate-400 shadow-sm">
              Assistant is thinking&hellip;
            </div>
          </div>
        )}
        {error && (
          <div className="text-center text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {escalation && (
          <div className="text-center text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            {escalation.status === 'sent'
              ? `Case escalated — email sent to ${escalation.to}`
              : `Case escalated (mock mode — no real email sent). Subject: "${escalation.subject}"`}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="max-w-3xl w-full mx-auto flex flex-col gap-3">
          {(canAdvanceToL2 || canAdvanceToL3 || canEscalate) && (
            <div className="flex gap-2 flex-wrap">
              {canAdvanceToL2 && (
                <button
                  onClick={() => handleAdvance('L2')}
                  disabled={loading}
                  className="text-xs font-medium px-3 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                >
                  Still not resolved &rarr; pull live telemetry (L2)
                </button>
              )}
              {canAdvanceToL3 && (
                <button
                  onClick={() => handleAdvance('L3')}
                  disabled={loading}
                  className="text-xs font-medium px-3 py-2 rounded-lg border border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100 disabled:opacity-50"
                >
                  Still not resolved &rarr; escalate to Bosch (L3)
                </button>
              )}
              {canEscalate && (
                <button
                  onClick={handleEscalate}
                  disabled={escalating}
                  className="text-xs font-medium px-3 py-2 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  {escalating ? 'Sending escalation email…' : 'Send escalation email to Bosch'}
                </button>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={tier === 'L1' ? 'Describe the issue the customer reported…' : 'Type a follow-up…'}
              disabled={loading || Boolean(escalation)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim() || !vin.trim() || Boolean(escalation)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
