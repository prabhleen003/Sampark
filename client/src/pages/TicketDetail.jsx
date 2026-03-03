import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';

const C = {
  bg:            '#0A0F2C',
  card:          '#0D1438',
  panel:         '#111834',
  border:        'rgba(148,163,184,0.12)',
  teal:          '#00E5A0',
  blue:          '#67B7FF',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  danger:        '#FF3B5C',
  amber:         '#F59E0B',
};

const font = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" };

function formatTime(d) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const cfg = {
    open:          { bg: 'rgba(0,229,160,0.1)',   color: '#00E5A0', label: 'Open' },
    in_progress:   { bg: 'rgba(103,183,255,0.1)', color: '#67B7FF', label: 'In Progress' },
    awaiting_user: { bg: 'rgba(245,158,11,0.1)',  color: '#F59E0B', label: 'Awaiting You' },
    resolved:      { bg: 'rgba(148,163,184,0.1)', color: '#94A3B8', label: 'Resolved' },
    closed:        { bg: 'rgba(75,85,99,0.15)',   color: '#6B7280', label: 'Closed' },
  }[status] || { bg: 'rgba(148,163,184,0.1)', color: '#94A3B8', label: status };
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: cfg.bg, color: cfg.color, borderRadius: '5px', padding: '3px 9px' }}>{cfg.label}</span>
  );
}

export default function TicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const replyRef  = useRef(null);

  const [ticket, setTicket]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply]     = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr]         = useState('');
  const [rating, setRating]   = useState(null);
  const [ratingLocked, setRatingLocked] = useState(false);
  const [closingWith, setClosingWith]   = useState(false);

  async function loadTicket() {
    try {
      const { data } = await api.get(`/support/${ticketId}`);
      setTicket(data.ticket);
    } catch { navigate('/support/tickets'); }
    setLoading(false);
  }

  useEffect(() => { loadTicket(); }, [ticketId]);

  useEffect(() => {
    if (ticket) document.title = `${ticket.ticket_number} — Support`;
    return () => { document.title = 'Sampaark'; };
  }, [ticket]);

  useEffect(() => {
    if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [loading, ticket?.messages?.length]);

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true); setErr('');
    try {
      const { data } = await api.post(`/support/${ticketId}/message`, { text: reply.trim() });
      setTicket(data.ticket); setReply('');
    } catch (e) { setErr(e.response?.data?.message || 'Failed to send'); }
    setSending(false);
  }

  async function handleClose() {
    try {
      const { data } = await api.put(`/support/${ticketId}/close`, { satisfaction_rating: rating || undefined });
      setTicket(data.ticket); setRatingLocked(true);
    } catch (e) { setErr(e.response?.data?.message || 'Failed to close'); }
  }

  async function handleReopen() {
    try {
      const { data } = await api.post(`/support/${ticketId}/reopen`);
      setTicket(data.ticket);
    } catch (e) { setErr(e.response?.data?.message || 'Failed to reopen'); }
  }

  async function handleStarClose(s) {
    if (ratingLocked) return;
    setRating(s); setClosingWith(true);
    try {
      const { data } = await api.put(`/support/${ticketId}/close`, { satisfaction_rating: s });
      setTicket(data.ticket); setRatingLocked(true);
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
    setClosingWith(false);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.textSecondary, fontFamily: font.body }}>Loading…</p>
    </div>
  );

  if (!ticket) return null;

  const isClosed   = ticket.status === 'closed';
  const isResolved = ticket.status === 'resolved';
  const daysSinceClosed = ticket.closed_at ? (Date.now() - new Date(ticket.closed_at)) / 86400000 : Infinity;
  const canReopen  = isClosed && daysSinceClosed <= 7;
  const showRating = isResolved && !ticket.satisfaction_rating && !ratingLocked;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: font.body, color: C.textPrimary, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 20px', backgroundColor: C.card, flexShrink: 0 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <button onClick={() => navigate('/support/tickets')} style={{ background: 'none', border: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: '1.1rem', paddingTop: '2px', flexShrink: 0 }}>←</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <span style={{ fontFamily: font.mono, fontSize: '0.8rem', color: C.textSecondary }}>{ticket.ticket_number}</span>
              <StatusBadge status={ticket.status} />
              <span style={{ fontSize: '0.72rem', color: C.textSecondary, textTransform: 'capitalize', backgroundColor: 'rgba(148,163,184,0.08)', borderRadius: '4px', padding: '2px 7px' }}>{ticket.category}</span>
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.subject}</p>
          </div>
          {isResolved && !isClosed && (
            <button onClick={handleClose} style={{ padding: '7px 14px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.82rem', cursor: 'pointer', flexShrink: 0 }}>
              Close
            </button>
          )}
          {canReopen && (
            <button onClick={handleReopen} style={{ padding: '7px 14px', borderRadius: '7px', border: `1px solid rgba(0,229,160,0.3)`, backgroundColor: 'rgba(0,229,160,0.06)', color: C.teal, fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}>
              Reopen
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1.25rem' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ticket.messages.map((m, i) => {
            if (m.sender === 'system') return (
              <div key={i} style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: C.textSecondary }}>{m.text}</span>
              </div>
            );
            const isUser = m.sender === 'user';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                <p style={{ fontSize: '0.72rem', color: C.textSecondary, margin: '0 0 3px', textAlign: isUser ? 'right' : 'left' }}>
                  {m.sender_name} · {formatTime(m.created_at)}
                </p>
                <div style={{
                  maxWidth: '80%', padding: '11px 14px', borderRadius: '12px',
                  borderBottomRightRadius: isUser ? '3px' : '12px',
                  borderBottomLeftRadius: isUser ? '12px' : '3px',
                  backgroundColor: isUser ? 'rgba(0,229,160,0.12)' : C.panel,
                  border: `1px solid ${isUser ? 'rgba(0,229,160,0.2)' : C.border}`,
                  color: C.textPrimary, fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Reply / Satisfaction / Closed */}
      <div style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.card, padding: '1rem 1.25rem', flexShrink: 0 }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>

          {/* Satisfaction prompt */}
          {showRating && (
            <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', textAlign: 'center' }}>
              <p style={{ color: C.textPrimary, fontSize: '0.88rem', fontWeight: 600, margin: '0 0 8px' }}>How was your support experience?</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => handleStarClose(s)} disabled={ratingLocked || closingWith}
                    style={{ fontSize: '1.5rem', background: 'none', border: 'none', cursor: ratingLocked ? 'default' : 'pointer', opacity: closingWith ? 0.5 : 1, filter: rating && s > rating ? 'opacity(0.3)' : 'none' }}>
                    ⭐
                  </button>
                ))}
              </div>
              {closingWith && <p style={{ color: C.textSecondary, fontSize: '0.78rem', margin: '6px 0 0' }}>Submitting…</p>}
            </div>
          )}

          {err && <p style={{ color: C.danger, fontSize: '0.82rem', margin: '0 0 8px' }}>{err}</p>}

          {isClosed ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 8px' }}>This ticket is closed.</p>
              {canReopen && (
                <button onClick={handleReopen} style={{ padding: '8px 20px', borderRadius: '8px', border: `1px solid rgba(0,229,160,0.3)`, backgroundColor: 'rgba(0,229,160,0.06)', color: C.teal, fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  Reopen Ticket
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
              <textarea
                ref={replyRef} value={reply} onChange={e => setReply(e.target.value.slice(0, 2000))}
                placeholder="Type your message…" rows={2}
                onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'; }}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.panel, color: C.textPrimary, fontSize: '0.9rem', outline: 'none', resize: 'none', fontFamily: font.body, minHeight: '42px' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                {reply.length > 1800 && <span style={{ fontSize: '0.7rem', color: reply.length > 1950 ? C.danger : C.textSecondary }}>{2000 - reply.length}</span>}
                <button onClick={handleSend} disabled={sending || !reply.trim()}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: (sending || !reply.trim()) ? 'rgba(0,229,160,0.3)' : C.teal, color: '#0A0F2C', fontWeight: 700, fontSize: '0.88rem', cursor: (sending || !reply.trim()) ? 'not-allowed' : 'pointer' }}>
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
