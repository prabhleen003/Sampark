import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const C = {
  bg:            '#0A0F2C',
  card:          '#0D1438',
  slate:         '#1E293B',
  border:        'rgba(148,163,184,0.12)',
  teal:          '#00E5A0',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  danger:        '#FF3B5C',
};

const FILTERS = [
  { label: 'All',         types: null },
  { label: 'Calls',       types: ['missed_call', 'emergency_alert', 'emergency_contact_called', 'emergency_unresolved'] },
  { label: 'Messages',    types: ['message_received'] },
  { label: 'Vehicles',    types: ['vehicle_verified', 'vehicle_rejected', 'verification_update', 'qr_generated', 'qr_expiring', 'qr_expiring_soon', 'qr_expired'] },
  { label: 'Payments',    types: ['payment_success'] },
  { label: 'Orders',      types: ['order_update', 'order_shipped', 'order_delivered'] },
];

const NOTIF_ICONS = {
  missed_call:              '📵',
  message_received:         '💬',
  emergency_alert:          '🚨',
  emergency_unresolved:     '⚠️',
  emergency_contact_called: '📞',
  vehicle_verified:         '✅',
  vehicle_rejected:         '❌',
  verification_update:      '📋',
  qr_generated:             '🔲',
  qr_expiring:              '⏳',
  qr_expiring_soon:         '⏰',
  qr_expired:               '🚫',
  payment_success:          '💳',
  order_update:             '📦',
  order_shipped:            '🚚',
  order_delivered:          '🎉',
  abuse_report_filed:       '🚩',
  abuse_report_resolved:    '🔓',
};

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const PAGE_SIZE = 20;

export default function Notifications() {
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState(0); // index into FILTERS
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchNotifications = useCallback(async (filterIndex, pageNum, replace) => {
    if (replace) setLoading(true); else setLoadingMore(true);
    try {
      const types = FILTERS[filterIndex].types;
      const params = new URLSearchParams({ page: pageNum, limit: PAGE_SIZE });
      if (types) params.set('types', types.join(','));

      const { data } = await api.get(`/notifications?${params}`);
      const items = data.notifications || [];

      setNotifications(prev => replace ? items : [...prev, ...items]);
      setTotal(data.total || 0);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchNotifications(activeFilter, 1, true);
  }, [activeFilter, fetchNotifications]);

  async function handleMarkRead(id) {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    try { await api.put(`/notifications/${id}/read`); } catch { /* ignore */ }
  }

  async function handleMarkAll() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.put('/notifications/read-all'); } catch { /* ignore */ }
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(activeFilter, nextPage, false);
  }

  const hasMore = notifications.length < total;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.border}`, padding: '0 1rem' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px', height: '60px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: '1.1rem', padding: '4px', lineHeight: 1 }}
            aria-label="Back"
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: C.textPrimary, flex: 1 }}>
            Notifications
          </h1>
          {notifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAll}
              style={{ background: 'none', border: 'none', color: C.teal, fontSize: '0.78rem', cursor: 'pointer', padding: '4px 8px' }}
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', padding: '0 1rem', gap: '0' }}>
          {FILTERS.map((f, i) => (
            <button
              key={f.label}
              onClick={() => setActiveFilter(i)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '12px 14px', fontSize: '0.82rem', fontWeight: activeFilter === i ? 700 : 500,
                color: activeFilter === i ? C.teal : C.textSecondary,
                borderBottom: activeFilter === i ? `2px solid ${C.teal}` : '2px solid transparent',
                whiteSpace: 'nowrap', transition: 'color 0.15s',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 1rem 2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: C.textSecondary, fontSize: '0.88rem' }}>Loading…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔔</p>
            <p style={{ color: C.textSecondary, fontSize: '0.9rem', margin: 0 }}>
              No {activeFilter === 0 ? '' : FILTERS[activeFilter].label.toLowerCase() + ' '}notifications yet.
            </p>
          </div>
        ) : (
          <>
            {notifications.map(n => (
              <div
                key={n._id}
                onClick={() => handleMarkRead(n._id)}
                style={{
                  display: 'flex', gap: '14px', alignItems: 'flex-start',
                  padding: '14px 0', borderBottom: `1px solid ${C.border}`,
                  borderLeft: n.read ? 'none' : `3px solid ${C.teal}`,
                  paddingLeft: n.read ? '0' : '12px',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
              >
                {/* Icon bubble */}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: C.slate,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.1rem',
                }}>
                  {NOTIF_ICONS[n.type] || '🔔'}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <p style={{
                      margin: 0, fontSize: '0.88rem',
                      fontWeight: n.read ? 500 : 700,
                      color: C.textPrimary,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.title}
                    </p>
                    <span style={{ fontSize: '0.72rem', color: C.textSecondary, flexShrink: 0 }}>
                      {relativeTime(n.created_at)}
                    </span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: C.textSecondary, lineHeight: 1.5 }}>
                    {n.body}
                  </p>
                  {/* Action link */}
                  {n.action_url && (
                    <span
                      onClick={e => { e.stopPropagation(); navigate(n.action_url); }}
                      style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.75rem', color: C.teal, cursor: 'pointer' }}
                    >
                      View →
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  style={{
                    padding: '10px 28px', borderRadius: '8px',
                    border: `1px solid ${C.border}`,
                    backgroundColor: 'transparent', color: C.textSecondary,
                    fontSize: '0.85rem', cursor: loadingMore ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
