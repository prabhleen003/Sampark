import { useEffect, useState } from 'react';
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
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

const REASON_LABELS = {
  fake_qr:             'QR fake or tampered',
  vehicle_mismatch:    'Vehicle / plate mismatch',
  suspicious_activity: 'Suspicious activity',
  other:               'Other',
};

const STATUS_TABS = ['open', 'reviewed', 'dismissed'];

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function PublicReports() {
  const [tab, setTab]         = useState('open');
  const [reports, setReports] = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [notes, setNotes]     = useState('');
  const [acting, setActing]   = useState(null);
  const [err, setErr]         = useState('');
  const limit = 20;

  async function load(status, p) {
    setLoading(true); setErr('');
    try {
      const { data } = await api.get('/admin/public-reports', { params: { status, page: p, limit } });
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch {
      setErr('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(tab, page); }, [tab, page]);

  function switchTab(t) { setTab(t); setPage(1); setExpanded(null); }

  async function handleAction(id, action) {
    setActing(id); setErr('');
    try {
      await api.put(`/admin/public-reports/${id}`, { action, notes: notes.trim() || undefined });
      setExpanded(null);
      setNotes('');
      load(tab, page);
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed');
    } finally {
      setActing(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ fontFamily: font.body }}>
      <h2 style={{ fontFamily: font.heading, color: C.textPrimary, fontSize: '1.3rem', fontWeight: 700, margin: '0 0 6px' }}>
        Public Reports
      </h2>
      <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 20px' }}>
        Reports from the public about suspicious QR codes or vehicle mismatches.
      </p>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {STATUS_TABS.map(t => (
          <button key={t} onClick={() => switchTab(t)} style={{
            padding: '7px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontFamily: font.body, fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize',
            backgroundColor: tab === t ? C.teal : 'rgba(148,163,184,0.08)',
            color: tab === t ? C.navy : C.textSecondary,
          }}>
            {t}
          </button>
        ))}
      </div>

      {err && <p style={{ color: C.danger, fontSize: '0.85rem', marginBottom: '12px' }}>{err}</p>}

      {loading ? (
        <p style={{ color: C.textSecondary, fontSize: '0.9rem' }}>Loading…</p>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: C.textSecondary, fontSize: '0.9rem' }}>
          No {tab} reports.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {reports.map(r => {
            const isOpen    = expanded === r._id;
            const isPriority = r.vehicle_open_report_count >= 3;

            return (
              <div key={r._id} style={{
                backgroundColor: C.panel,
                border: `1px solid ${isPriority ? 'rgba(245,158,11,0.35)' : C.border}`,
                borderLeft: isPriority ? `4px solid ${C.amber}` : `1px solid ${C.border}`,
                borderRadius: '10px', padding: '14px 16px',
              }}>
                {/* Header row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : r._id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {isPriority && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: C.amber, backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '2px 7px' }}>
                        PRIORITY
                      </span>
                    )}
                    <span style={{ fontFamily: font.mono, fontSize: '0.95rem', fontWeight: 700, color: C.textPrimary }}>
                      {r.vehicle_id?.plate_number || '—'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: C.textSecondary }}>
                      {REASON_LABELS[r.reason] || r.reason}
                    </span>
                    {isPriority && (
                      <span style={{ fontSize: '0.75rem', color: C.amber }}>
                        {r.vehicle_open_report_count} open reports on this vehicle
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <span style={{ color: C.textSecondary, fontSize: '0.75rem' }}>{relativeTime(r.created_at)}</span>
                    <span style={{ color: C.textSecondary, fontSize: '0.85rem' }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${C.border}` }}>
                    {r.description && (
                      <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 10px', lineHeight: 1.6 }}>
                        {r.description}
                      </p>
                    )}
                    <p style={{ color: C.textSecondary, fontSize: '0.75rem', margin: '0 0 14px' }}>
                      Reporter hash: <span style={{ fontFamily: font.mono }}>{r.reporter_phone_hash ? r.reporter_phone_hash.slice(0, 12) + '…' : 'anonymous'}</span>
                    </p>
                    {r.admin_notes && (
                      <p style={{ color: C.textSecondary, fontSize: '0.8rem', margin: '0 0 12px', fontStyle: 'italic' }}>
                        Notes: {r.admin_notes}
                      </p>
                    )}

                    {/* Actions — only for open reports */}
                    {r.status === 'open' && (
                      <>
                        <textarea
                          placeholder="Admin notes (optional)"
                          value={notes}
                          onChange={e => setNotes(e.target.value.slice(0, 500))}
                          style={{
                            width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '8px',
                            border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.04)',
                            color: C.textPrimary, fontSize: '0.85rem', outline: 'none',
                            resize: 'none', height: '64px', marginBottom: '10px',
                            fontFamily: font.body,
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleAction(r._id, 'dismiss')}
                            disabled={acting === r._id}
                            style={{
                              flex: 1, padding: '9px', borderRadius: '8px', cursor: 'pointer',
                              border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.04)',
                              color: C.textSecondary, fontWeight: 600, fontSize: '0.85rem',
                              fontFamily: font.body, opacity: acting === r._id ? 0.5 : 1,
                            }}
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleAction(r._id, 'investigate')}
                            disabled={acting === r._id}
                            style={{
                              flex: 1, padding: '9px', borderRadius: '8px', cursor: 'pointer',
                              border: `1px solid rgba(245,158,11,0.4)`, backgroundColor: 'rgba(245,158,11,0.08)',
                              color: C.amber, fontWeight: 700, fontSize: '0.85rem',
                              fontFamily: font.body, opacity: acting === r._id ? 0.5 : 1,
                            }}
                          >
                            {acting === r._id ? 'Working…' : 'Investigate (flag vehicle)'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '7px 16px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, cursor: page === 1 ? 'not-allowed' : 'pointer', fontFamily: font.body }}
          >
            ← Prev
          </button>
          <span style={{ color: C.textSecondary, fontSize: '0.85rem' }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '7px 16px', borderRadius: '7px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, cursor: page === totalPages ? 'not-allowed' : 'pointer', fontFamily: font.body }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
