import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

const C = {
  bg:            '#0A0F2C',
  card:          '#0D1438',
  panel:         '#111834',
  border:        'rgba(148,163,184,0.12)',
  teal:          '#00E5A0',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  danger:        '#FF3B5C',
  amber:         '#F59E0B',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

const STATUS_TABS = [
  { key: undefined, label: 'All Open', filter: 'open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'awaiting_user', label: 'Awaiting You' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const PRIORITY_BADGE = {
  critical: { bg: 'rgba(255,59,92,0.12)', color: '#FF3B5C', border: 'rgba(255,59,92,0.3)', label: 'Critical' },
  high:     { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.3)', label: 'High' },
};

const STATUS_DOT = {
  open:          { color: '#00E5A0' },
  in_progress:   { color: '#67B7FF' },
  awaiting_user: { color: '#F59E0B' },
  resolved:      { color: '#94A3B8' },
  closed:        { color: '#4B5563' },
};

function relativeTime(d) {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${days}d ago`;
}

export default function MyTickets() {
  const navigate = useNavigate();
  const [tab, setTab]       = useState('open');
  const [tickets, setTickets] = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  async function load(status, p) {
    setLoading(true);
    try {
      const { data } = await api.get('/support', { params: { status, page: p, limit } });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(tab === 'all' ? undefined : tab, page); }, [tab, page]);

  useEffect(() => {
    document.title = 'My Support Tickets — Sampaark';
    return () => { document.title = 'Sampaark'; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: font.body, color: C.textPrimary }}>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate('/help')} style={{ background: 'none', border: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: '1.1rem' }}>←</button>
        <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: '1.1rem' }}>My Support Tickets</span>
        <Link to="/help" style={{ marginLeft: 'auto', color: C.teal, fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>
          + New Ticket
        </Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '1.25rem' }}>
          {STATUS_TABS.map(t => (
            <button key={t.key || 'open'} onClick={() => { setTab(t.key || 'open'); setPage(1); }}
              style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: font.body, fontSize: '0.85rem', fontWeight: 600,
                backgroundColor: tab === (t.key || 'open') ? C.teal : 'rgba(148,163,184,0.08)',
                color: tab === (t.key || 'open') ? '#0A0F2C' : C.textSecondary,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: C.textSecondary, fontSize: '0.9rem' }}>Loading…</p>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: C.textSecondary, marginBottom: '12px' }}>No {tab === 'open' ? 'open' : tab} tickets.</p>
            <Link to="/help" style={{ color: C.teal, fontSize: '0.9rem', fontWeight: 600 }}>Create a ticket →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tickets.map(t => {
              const dot = STATUS_DOT[t.status] || STATUS_DOT.open;
              const pBadge = PRIORITY_BADGE[t.priority];
              return (
                <div key={t._id} onClick={() => navigate(`/support/tickets/${t._id}`)}
                  style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 16px', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dot.color, flexShrink: 0, display: 'inline-block' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: C.textPrimary }}>{t.subject}</span>
                      {t.has_unread && (
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: C.teal, flexShrink: 0, display: 'inline-block' }} title="Unread admin reply" />
                      )}
                    </div>
                    <span style={{ color: C.textSecondary, fontSize: '0.75rem', flexShrink: 0 }}>{relativeTime(t.updated_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: font.body, color: C.textSecondary, fontFamily: font.mono }}>{t.ticket_number}</span>
                    <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(148,163,184,0.1)', color: C.textSecondary, borderRadius: '4px', padding: '2px 7px', textTransform: 'capitalize' }}>{t.category}</span>
                    {pBadge && (
                      <span style={{ fontSize: '0.72rem', backgroundColor: pBadge.bg, color: pBadge.color, border: `1px solid ${pBadge.border}`, borderRadius: '4px', padding: '2px 7px' }}>{pBadge.label}</span>
                    )}
                  </div>
                  {t.last_message && (
                    <p style={{ color: C.textSecondary, fontSize: '0.8rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: t.last_message.sender === 'admin' ? C.teal : C.textSecondary }}>
                        {t.last_message.sender === 'admin' ? 'Support: ' : t.last_message.sender === 'system' ? '' : 'You: '}
                      </span>
                      {t.last_message.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              style={{ padding: '7px 16px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>← Prev</button>
            <span style={{ color: C.textSecondary, fontSize: '0.85rem' }}>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              style={{ padding: '7px 16px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
