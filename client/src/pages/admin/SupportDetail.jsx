import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';

const C = {
  navy:          '#0A0F2C',
  panel:         '#111834',
  card:          '#0D1438',
  teal:          '#00E5A0',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  border:        'rgba(148,163,184,0.12)',
  danger:        '#FF3B5C',
  amber:         '#F59E0B',
};

const font = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" };

const CANNED = [
  { label: 'Acknowledgement',  text: 'Thank you for reaching out. Let me look into this for you.' },
  { label: 'Need More Info',   text: 'Could you provide more details about the issue? Any screenshots or specific error messages would help us resolve this faster.' },
  { label: 'Issue Resolved',   text: 'This issue has been resolved. Please let us know if you need further assistance.' },
  { label: 'Payment Issue',    text: "We have checked your payment status. If the amount was deducted but the service was not activated, it will be processed within 24 hours. If not, please share your transaction ID." },
  { label: 'QR Issue',         text: 'Please try downloading your QR again from the dashboard. If the issue persists, share a screenshot of the error you are seeing.' },
  { label: 'Processed',        text: 'Your request has been processed. Changes should reflect within 24 hours.' },
];

const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES   = ['open', 'in_progress', 'awaiting_user', 'resolved', 'closed'];

function formatTime(d) {
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function AdminSupportDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const bottomRef = useRef(null);

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply]     = useState('');
  const [awaitUser, setAwaitUser] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr]         = useState('');

  async function loadTicket() {
    try {
      const r = await api.get(`/admin/support/${ticketId}`);
      setData(r.data);
    } catch { navigate('/admin/support'); }
    setLoading(false);
  }

  useEffect(() => { loadTicket(); }, [ticketId]);
  useEffect(() => { if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }, [loading]);

  async function handleSend() {
    if (!reply.trim()) return;
    setSending(true); setErr('');
    try {
      const r = await api.post(`/admin/support/${ticketId}/message`, { text: reply.trim(), set_awaiting: awaitUser });
      setData(d => ({ ...d, ticket: r.data.ticket }));
      setReply(''); setAwaitUser(false);
    } catch (e) { setErr(e.response?.data?.message || 'Failed to send'); }
    setSending(false);
  }

  async function handleStatus(status) {
    setErr('');
    try {
      const r = await api.put(`/admin/support/${ticketId}/status`, { status });
      setData(d => ({ ...d, ticket: r.data.ticket }));
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
  }

  async function handlePriority(priority) {
    try {
      const r = await api.put(`/admin/support/${ticketId}/priority`, { priority });
      setData(d => ({ ...d, ticket: r.data.ticket }));
    } catch (e) { setErr(e.response?.data?.message || 'Failed'); }
  }

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: C.textSecondary, fontFamily: font.body }}>Loading…</div>
  );

  const { ticket, user_context } = data;
  if (!ticket) return null;

  const isClosed = ticket.status === 'closed';

  return (
    <div style={{ fontFamily: font.body, color: C.textPrimary }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => navigate('/admin/support')} style={{ background: 'none', border: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: '1.1rem', paddingTop: '3px', flexShrink: 0 }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <span style={{ fontFamily: font.mono, fontSize: '0.8rem', color: C.textSecondary }}>{ticket.ticket_number}</span>
            <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(148,163,184,0.08)', color: C.textSecondary, borderRadius: '4px', padding: '2px 7px', textTransform: 'capitalize' }}>{ticket.category}</span>
          </div>
          <p style={{ margin: 0, fontFamily: font.heading, fontWeight: 700, fontSize: '1.05rem' }}>{ticket.subject}</p>
        </div>
        {/* Priority + Status dropdowns */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <select value={ticket.priority} onChange={e => handlePriority(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: C.panel, color: C.textPrimary, fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <select value={ticket.status} onChange={e => handleStatus(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: C.panel, color: C.textPrimary, fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      {/* User context */}
      {user_context && (
        <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div><p style={{ color: C.textSecondary, fontSize: '0.72rem', margin: '0 0 2px' }}>User</p><p style={{ color: C.textPrimary, fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>{user_context.name || '—'}</p></div>
          <div><p style={{ color: C.textSecondary, fontSize: '0.72rem', margin: '0 0 2px' }}>Member for</p><p style={{ color: C.textPrimary, fontSize: '0.88rem', margin: 0 }}>{user_context.account_age_days}d</p></div>
          <div><p style={{ color: C.textSecondary, fontSize: '0.72rem', margin: '0 0 2px' }}>Vehicles</p><p style={{ color: C.textPrimary, fontSize: '0.88rem', margin: 0 }}>{user_context.vehicle_count}</p></div>
          <div><p style={{ color: C.textSecondary, fontSize: '0.72rem', margin: '0 0 2px' }}>Prev tickets</p><p style={{ color: C.textPrimary, fontSize: '0.88rem', margin: 0 }}>{user_context.previous_tickets}</p></div>
          {ticket.vehicle_id && (
            <div><p style={{ color: C.textSecondary, fontSize: '0.72rem', margin: '0 0 2px' }}>Vehicle</p><p style={{ color: C.textPrimary, fontSize: '0.88rem', fontFamily: font.mono, margin: 0 }}>{ticket.vehicle_id.plate_number}</p></div>
          )}
        </div>
      )}

      {/* Message thread */}
      <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px', marginBottom: '16px', maxHeight: '420px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {ticket.messages.map((m, i) => {
            if (m.sender === 'system') return (
              <div key={i} style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.73rem', fontStyle: 'italic', color: C.textSecondary }}>{m.text}</span>
              </div>
            );
            // From admin perspective: admin messages on right, user messages on left
            const isAdmin = m.sender === 'admin';
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isAdmin ? 'flex-end' : 'flex-start' }}>
                <p style={{ fontSize: '0.71rem', color: C.textSecondary, margin: '0 0 3px', textAlign: isAdmin ? 'right' : 'left' }}>
                  {m.sender_name} · {formatTime(m.created_at)}
                </p>
                <div style={{
                  maxWidth: '80%', padding: '10px 13px', borderRadius: '10px',
                  borderBottomRightRadius: isAdmin ? '3px' : '10px',
                  borderBottomLeftRadius: isAdmin ? '10px' : '3px',
                  backgroundColor: isAdmin ? 'rgba(0,229,160,0.1)' : C.card,
                  border: `1px solid ${isAdmin ? 'rgba(0,229,160,0.2)' : C.border}`,
                  color: C.textPrimary, fontSize: '0.87rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {err && <p style={{ color: C.danger, fontSize: '0.82rem', margin: '0 0 10px' }}>{err}</p>}

      {/* Reply box */}
      {!isClosed && (
        <div style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px' }}>
          {/* Canned responses */}
          <div style={{ marginBottom: '10px' }}>
            <select onChange={e => { if (e.target.value) { setReply(e.target.value); e.target.value = ''; } }}
              style={{ padding: '7px 10px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.textSecondary, fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}>
              <option value="">Canned responses…</option>
              {CANNED.map(c => <option key={c.label} value={c.text}>{c.label}</option>)}
            </select>
          </div>

          <textarea value={reply} onChange={e => setReply(e.target.value.slice(0, 2000))} placeholder="Type your reply…" rows={3}
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.textPrimary, fontSize: '0.9rem', outline: 'none', resize: 'vertical', fontFamily: font.body, marginBottom: '10px' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.textSecondary, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={awaitUser} onChange={e => setAwaitUser(e.target.checked)} />
                Set to Awaiting User
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleStatus('resolved')} style={{ padding: '8px 14px', borderRadius: '7px', border: '1px solid rgba(0,229,160,0.3)', backgroundColor: 'rgba(0,229,160,0.08)', color: C.teal, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: font.body }}>
                Resolve
              </button>
              <button onClick={() => handleStatus('closed')} style={{ padding: '8px 14px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.82rem', cursor: 'pointer', fontFamily: font.body }}>
                Close
              </button>
              <button onClick={handleSend} disabled={sending || !reply.trim()}
                style={{ padding: '8px 18px', borderRadius: '7px', border: 'none', backgroundColor: (sending || !reply.trim()) ? 'rgba(0,229,160,0.3)' : C.teal, color: '#0A0F2C', fontWeight: 700, fontSize: '0.88rem', cursor: (sending || !reply.trim()) ? 'not-allowed' : 'pointer', fontFamily: font.body }}>
                {sending ? '…' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
