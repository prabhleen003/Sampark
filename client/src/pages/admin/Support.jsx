import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const C = {
  navy:          '#0A0F2C',
  panel:         '#111834',
  teal:          '#00E5A0',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  border:        'rgba(148,163,184,0.12)',
  danger:        '#FF3B5C',
  amber:         '#F59E0B',
  blue:          '#67B7FF',
};

const font = { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", mono: "'JetBrains Mono', monospace" };

const TABS = [
  { key: undefined,        label: 'Needs Response' },
  { key: 'in_progress',   label: 'In Progress' },
  { key: 'awaiting_user', label: 'Awaiting User' },
  { key: 'resolved',      label: 'Resolved' },
  { key: 'closed',        label: 'Closed' },
];

const PRIORITY_BADGE = {
  critical: { bg: 'rgba(255,59,92,0.12)', color: '#FF3B5C', label: 'Critical' },
  high:     { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'High' },
};

function urgencyColor(ms) {
  if (ms === null) return C.textSecondary;
  const h = ms / 3600000;
  if (h < 6) return '#00E5A0';
  if (h < 24) return '#F59E0B';
  return '#FF3B5C';
}

function urgencyLabel(ms) {
  if (ms === null) return '—';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function relativeTime(d) {
  const diff = Date.now() - new Date(d);
  const h = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${days}d ago`;
}

export default function AdminSupport() {
  const navigate = useNavigate();
  const [tab, setTab]       = useState(undefined);
  const [tickets, setTickets] = useState([]);
  const [needsCount, setNeedsCount] = useState(0);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 20;

  async function load(status, p) {
    setLoading(true);
    try {
      const params = { page: p, limit };
      if (status) params.status = status;
      const { data } = await api.get('/admin/support', { params });
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
      if (!status) setNeedsCount(data.tickets?.filter(t => t.needs_response).length || 0);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(tab, page); }, [tab, page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ fontFamily: font.body }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h2 style={{ fontFamily: font.heading, color: C.textPrimary, fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>Support Tickets</h2>
      </div>
      <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 20px' }}>Manage user support tickets. Tickets needing response are shown first.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={String(t.key)} onClick={() => { setTab(t.key); setPage(1); }}
            style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontFamily: font.body, fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
              backgroundColor: tab === t.key ? C.teal : 'rgba(148,163,184,0.08)',
              color: tab === t.key ? C.navy : C.textSecondary,
            }}>
            {t.label}
            {t.key === undefined && needsCount > 0 && (
              <span style={{ backgroundColor: C.danger, color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>{needsCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: C.textSecondary }}>Loading…</p>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: C.textSecondary }}>No tickets.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tickets.map(t => {
            const pBadge = PRIORITY_BADGE[t.priority];
            const uc = urgencyColor(t.time_since_user_message);
            return (
              <div key={t._id} onClick={() => navigate(`/admin/support/${t._id}`)}
                style={{ backgroundColor: C.panel, border: `1px solid ${t.needs_response ? 'rgba(255,59,92,0.25)' : C.border}`, borderLeft: t.needs_response ? '3px solid rgba(255,59,92,0.6)' : `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    {t.needs_response && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: C.danger, flexShrink: 0, display: 'inline-block' }} />}
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: C.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</span>
                    {pBadge && <span style={{ fontSize: '0.7rem', backgroundColor: pBadge.bg, color: pBadge.color, borderRadius: '4px', padding: '2px 6px' }}>{pBadge.label}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: font.mono, fontSize: '0.72rem', color: C.textSecondary }}>{t.ticket_number}</span>
                    <span style={{ fontSize: '0.72rem', color: C.textSecondary }}>{t.user_id?.name || '—'}</span>
                    <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(148,163,184,0.08)', color: C.textSecondary, borderRadius: '4px', padding: '2px 6px', textTransform: 'capitalize' }}>{t.category}</span>
                    <span style={{ fontSize: '0.72rem', color: C.textSecondary }}>{t.message_count} msg{t.message_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {t.needs_response && t.time_since_user_message !== null && (
                    <p style={{ color: uc, fontSize: '0.78rem', fontWeight: 700, margin: '0 0 2px' }}>
                      {urgencyLabel(t.time_since_user_message)} waiting
                    </p>
                  )}
                  <p style={{ color: C.textSecondary, fontSize: '0.72rem', margin: 0 }}>{relativeTime(t.updated_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '7px 16px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: font.body }}>
            ← Prev
          </button>
          <span style={{ color: C.textSecondary, fontSize: '0.85rem' }}>Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '7px 16px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: font.body }}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
