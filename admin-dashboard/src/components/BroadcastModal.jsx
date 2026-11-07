import React, { useState } from 'react';
import { Send, Megaphone, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function BroadcastModal({ onSendBroadcast, userCount }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    setStatus(null);

    const res = await onSendBroadcast(message);
    setIsSending(false);

    if (res.success) {
      setStatus({ type: 'success', text: `Broadcast successfully delivered to ${res.delivered}/${res.total} users!` });
      setMessage('');
    } else {
      setStatus({ type: 'error', text: res.error || 'Failed to send broadcast' });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-100">Broadcast Announcement</h2>
        <p className="text-xs text-slate-400">
          Send promotional announcements or restock updates to all active Telegram Bot members ({userCount} users)
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Message Content (Supports Telegram Markdown)
            </label>
            <textarea
              rows="6"
              required
              placeholder="🎉 Weekend Special Promo!&#10;Get 20% off all Netflix & Spotify accounts today...&#10;Click /shop to buy instantly!"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-slate-100 focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
            />
          </div>

          {/* Preview Box */}
          {message.trim() && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                Live Preview
              </span>
              <div className="text-slate-200 whitespace-pre-wrap font-sans text-xs">
                {message}
              </div>
            </div>
          )}

          {status && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold ${
                status.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{status.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!message.trim() || isSending}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.99]"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending broadcast...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Broadcast to All Users ({userCount} Members)</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
