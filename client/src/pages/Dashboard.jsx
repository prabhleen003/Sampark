import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import api from '../api/axios';
import PrivacyScore, { ScoreBadge } from '../components/PrivacyScore';

const C = {
  navy: '#0A0F2C',
  navyLight: '#0D1438',
  navyDeep: '#07091E',
  slate: '#1E293B',
  panel: '#111834',
  teal: '#00E5A0',
  tealDark: '#00CC8E',
  accent: '#67B7FF',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: 'rgba(148,163,184,0.12)',
  borderTeal: 'rgba(0,229,160,0.25)',
  danger: '#FF3B5C',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const ABUSE_REASONS = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'threatening', label: 'Threatening' },
  { value: 'other', label: 'Other' },
];

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

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isActivePayment(payment) {
  return payment?.status === 'paid' && new Date(payment.valid_until) > new Date();
}

function daysRemaining(vehicle) {
  if (!vehicle.qr_valid_until) return null;
  return Math.floor((new Date(vehicle.qr_valid_until) - Date.now()) / 86400000);
}

// ── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ vehicle, onClose, onPrint, onOrder }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copyLabel, setCopyLabel] = useState('Copy Link');

  useEffect(() => {
    api.get(`/vehicles/${vehicle._id}/qr`)
      .then(r => setQrData(r.data))
      .catch(() => setQrData(null))
      .finally(() => setLoading(false));
  }, [vehicle._id]);

  function download() {
    if (!qrData?.qr_image_url) return;
    const a = document.createElement('a');
    a.href = qrData.qr_image_url;
    a.download = `Sampaark_QR_${vehicle.plate_number}.png`;
    a.click();
  }

  function copyLink() {
    const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
    const link = `${appUrl}/v/${vehicle._id}?sig=${qrData.qr_token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy Link'), 2000);
    });
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '2rem', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: C.textPrimary, fontFamily: font.heading }}>Your QR Code</h3>
        <p style={{ margin: '0 0 1.25rem', fontFamily: font.mono, fontSize: '1rem', fontWeight: 700, color: C.teal, letterSpacing: '0.05em' }}>{vehicle.plate_number}</p>

        {loading && (
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: C.textSecondary, fontSize: '0.9rem' }}>Loading…</p>
          </div>
        )}
        {!loading && !qrData && <p style={{ color: C.danger, fontSize: '0.88rem', fontFamily: font.body }}>Failed to load QR code.</p>}
        {!loading && qrData?.qr_image_url && (
          <>
            <img src={qrData.qr_image_url} alt={`QR for ${vehicle.plate_number}`} style={{ width: '220px', height: '220px', borderRadius: '8px', border: `1px solid ${C.border}` }} />
            <p style={{ fontSize: '0.78rem', color: C.textSecondary, margin: '10px 0 16px' }}>Scan to contact vehicle owner securely</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={download} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: C.navy, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', fontFamily: font.body }}>
                Download PNG
              </button>
              <button onClick={copyLink} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', fontFamily: font.body }}>
                {copyLabel}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={() => { onClose(); onPrint(); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: font.body }}>
                🖨️ Print at Home
              </button>
              <button onClick={() => { onClose(); onOrder(); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: C.accent, color: C.navy, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: font.body }}>
                📦 Order Card ₹99
              </button>
            </div>
          </>
        )}
        <button onClick={onClose} style={{ marginTop: '14px', width: '100%', padding: '9px', border: 'none', backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.85rem', cursor: 'pointer', fontFamily: font.body }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────
function ReceiptModal({ payment, vehicle, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '2rem', maxWidth: '360px', width: '100%' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: C.textPrimary, fontFamily: font.heading }}>Payment Receipt</h3>
        <p style={{ margin: '0 0 1.5rem', fontFamily: font.mono, fontSize: '0.9rem', color: C.teal }}>{vehicle.plate_number}</p>

        {[
          ['Transaction ID', payment.mihpayid || '—'],
          ['Amount Paid', `₹${(payment.amount / 100).toFixed(0)}`],
          ['Date', formatDate(payment.valid_from)],
          ['Valid Until', formatDate(payment.valid_until)],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: '0.85rem', color: C.textSecondary }}>{label}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: C.textPrimary, fontFamily: label === 'Transaction ID' ? font.mono : 'inherit', wordBreak: 'break-all', maxWidth: '55%', textAlign: 'right' }}>{value}</span>
          </div>
        ))}

        <button onClick={onClose} style={{ marginTop: '1.25rem', width: '100%', padding: '10px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: C.textSecondary, fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  );
}

const URGENCY_BADGE = {
  emergency: { label: 'Emergency', bg: 'rgba(255,59,92,0.12)', color: '#FF3B5C', border: 'rgba(255,59,92,0.3)' },
  urgent: { label: 'Urgent', bg: '#FFF7ED', color: '#9A3412', border: '#FDBA74' },
  normal: { label: 'Normal', bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' },
};

function urgencyRank(log) {
  if (log.fallback_urgency === 'emergency') return 0;
  if (log.fallback_urgency === 'urgent') return 1;
  return 2;
}

function sortLogs(logs) {
  return [...logs].sort((a, b) => {
    const ua = urgencyRank(a);
    const ub = urgencyRank(b);
    if (ua !== ub) return ua - ub;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

// ── Activity Modal ─────────────────────────────────────────────────────────────
function ActivityModal({ vehicle, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(null);
  const [reason, setReason] = useState('harassment');
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get(`/vehicles/${vehicle._id}/call-logs`)
      .then(r => setLogs(sortLogs(r.data.logs || [])))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [vehicle._id]);

  function submitReport(logId) {
    api.post(`/call-logs/${logId}/report`, { reason })
      .then(r => {
        if (r.data.success) { setToast('Report submitted.'); setTimeout(() => setToast(''), 3000); }
      })
      .catch(() => setToast('Failed to submit report.'))
      .finally(() => { setReporting(null); setReason('harassment'); });
  }

  const isMissedCall = (log) =>
    log.type === 'call' && ['no-answer', 'busy', 'failed'].includes(log.status);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.panel, borderTopLeftRadius: '20px', borderTopRightRadius: '20px', border: `1px solid ${C.border}`, padding: '1.5rem', width: '100%', maxWidth: '520px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: C.border, margin: '0 auto 1.25rem' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textPrimary, fontFamily: font.heading }}>Recent Activity</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: C.textSecondary, fontFamily: font.mono }}>{vehicle.plate_number}</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: C.textSecondary, fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {toast && (
          <div style={{ backgroundColor: 'rgba(0,229,160,0.1)', border: `1px solid ${C.borderTeal}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
            <p style={{ color: C.teal, fontSize: '0.85rem', margin: 0 }}>{toast}</p>
          </div>
        )}

        {loading && <p style={{ color: C.textSecondary, fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>Loading…</p>}

        {!loading && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📭</p>
            <p style={{ color: C.textSecondary, fontSize: '0.88rem', margin: 0 }}>No activity yet.</p>
            <p style={{ color: C.textSecondary, fontSize: '0.8rem', margin: '4px 0 0' }}>Calls and messages will appear here.</p>
          </div>
        )}

        {!loading && logs.map(log => (
          <div key={log._id}>
            {reporting === log._id ? (
              <div style={{ border: '1px solid rgba(255,59,92,0.3)', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', backgroundColor: 'rgba(255,59,92,0.1)' }}>
                <p style={{ color: C.danger, fontWeight: 600, fontSize: '0.85rem', margin: '0 0 8px' }}>Report this interaction?</p>
                <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,59,92,0.3)', marginBottom: '8px', fontSize: '0.85rem', color: C.textPrimary, backgroundColor: C.navy }}>
                  {ABUSE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setReporting(null)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={() => submitReport(log._id)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#EF4444', color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }}>Submit Report</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                {/* Main log row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, backgroundColor: isMissedCall(log) ? 'rgba(255,59,92,0.1)' : log.type === 'call' ? 'rgba(103,183,255,0.1)' : 'rgba(0,229,160,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                    {isMissedCall(log) ? '📵' : log.type === 'call' ? '📞' : '💬'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: isMissedCall(log) ? C.danger : C.textPrimary }}>
                        {isMissedCall(log) ? 'Missed Call' : log.type === 'call' ? 'Call' : 'Message'}
                        {log.type === 'call' && !isMissedCall(log) && log.status && <span style={{ marginLeft: '6px', fontWeight: 400, fontSize: '0.78rem', color: C.textSecondary }}>— {log.status}</span>}
                      </p>
                      <span style={{ fontSize: '0.75rem', color: C.textSecondary, flexShrink: 0, marginLeft: '8px' }}>{relativeTime(log.created_at)}</span>
                    </div>
                    {log.type === 'call' && !isMissedCall(log) && log.duration_seconds != null && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: C.textSecondary }}>Duration: {log.duration_seconds}s</p>}
                    {log.type === 'message' && (log.custom_text || log.template_id) && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.custom_text || `Template #${log.template_id}`}</p>}
                  </div>
                  <button onClick={() => { setReporting(log._id); setReason('harassment'); }} title="Report as abusive" style={{ border: 'none', background: 'none', color: C.textSecondary, fontSize: '0.95rem', cursor: 'pointer', padding: '4px', flexShrink: 0, lineHeight: 1 }}>🚩</button>
                </div>

                {/* Fallback message (indented) */}
                {isMissedCall(log) && (
                  <div style={{ marginLeft: '48px', marginTop: '8px' }}>
                    {log.fallback_message ? (
                      <div style={{ backgroundColor: log.fallback_urgency === 'emergency' ? 'rgba(255,59,92,0.08)' : log.fallback_urgency === 'urgent' ? 'rgba(251,146,60,0.08)' : 'rgba(148,163,184,0.06)', border: `1px solid ${log.fallback_urgency === 'emergency' ? 'rgba(255,59,92,0.25)' : log.fallback_urgency === 'urgent' ? 'rgba(251,146,60,0.25)' : C.border}`, borderRadius: '8px', padding: '8px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: C.textSecondary, fontWeight: 600 }}>Left a message:</span>
                          {log.fallback_urgency && URGENCY_BADGE[log.fallback_urgency] && (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', backgroundColor: URGENCY_BADGE[log.fallback_urgency].bg, color: URGENCY_BADGE[log.fallback_urgency].color, border: `1px solid ${URGENCY_BADGE[log.fallback_urgency].border}` }}>
                              {URGENCY_BADGE[log.fallback_urgency].label}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: C.textPrimary, lineHeight: 1.5 }}>{log.fallback_message}</p>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.78rem', color: C.textSecondary, fontStyle: 'italic' }}>No message left</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment History Modal ─────────────────────────────────────────────────────
function PaymentHistoryModal({ vehicle, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/payments/history/${vehicle._id}`)
      .then(r => setPayments(r.data.payments || []))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, [vehicle._id]);

  function statusBadge(status) {
    if (status === 'paid') return { label: 'Paid', bg: '#F0FDF4', color: '#166534', border: '#86EFAC' };
    if (status === 'failed') return { label: 'Failed', bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' };
    return { label: 'Pending', bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' };
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.panel, borderTopLeftRadius: '20px', borderTopRightRadius: '20px', border: `1px solid ${C.border}`, padding: '1.5rem', width: '100%', maxWidth: '520px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: C.border, margin: '0 auto 1.25rem' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textPrimary, fontFamily: font.heading }}>Payment History</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: C.textSecondary, fontFamily: font.mono }}>{vehicle.plate_number}</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: C.textSecondary, fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {loading && <p style={{ color: C.textSecondary, fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>Loading…</p>}

        {!loading && payments.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📄</p>
            <p style={{ color: C.textSecondary, fontSize: '0.88rem', margin: 0 }}>No payment records yet.</p>
          </div>
        )}

        {!loading && payments.map(p => {
          const sb = statusBadge(p.status);
          return (
            <div key={p._id} style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: C.textPrimary }}>₹{(p.amount / 100).toFixed(0)}</span>
                <span style={{ backgroundColor: sb.bg, color: sb.color, border: `1px solid ${sb.border}`, borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {sb.label}
                </span>
              </div>
              <p style={{ margin: '2px 0', fontSize: '0.8rem', color: C.textSecondary }}>{formatDate(p.created_at)}</p>
              {p.status === 'paid' && p.valid_from && p.valid_until && (
                <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: C.textSecondary }}>
                  Valid: {formatDate(p.valid_from)} → {formatDate(p.valid_until)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Notification Panel ────────────────────────────────────────────────────────
const NOTIF_ICONS = {
  missed_call: '📵',
  message_received: '💬',
  emergency_alert: '🚨',
  verification_update: '✅',
  payment_success: '💳',
  qr_expiring: '⏰',
  order_update: '📦',
};

function NotificationPanel({ notifications, onClose, onMarkRead, onMarkAll }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.panel, borderTopLeftRadius: '20px', borderTopRightRadius: '20px', border: `1px solid ${C.border}`, padding: '1.5rem', width: '100%', maxWidth: '520px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: C.border, margin: '0 auto 1.25rem' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textPrimary, fontFamily: font.heading }}>Notifications</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Link to="/notifications" onClick={onClose} style={{ color: C.teal, fontSize: '0.78rem', textDecoration: 'none', padding: '4px 8px' }}>
              See all
            </Link>
            <button onClick={onMarkAll} style={{ border: 'none', background: 'none', color: C.textSecondary, fontSize: '0.78rem', cursor: 'pointer', padding: '4px 8px' }}>
              Mark all read
            </button>
            <button onClick={onClose} style={{ border: 'none', background: 'none', color: C.textSecondary, fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
            <p style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔔</p>
            <p style={{ color: C.textSecondary, fontSize: '0.88rem', margin: 0 }}>No notifications yet.</p>
          </div>
        )}

        {notifications.map(n => (
          <div
            key={n._id}
            onClick={() => onMarkRead(n._id)}
            style={{
              display: 'flex', gap: '12px', alignItems: 'flex-start',
              padding: '12px 0 12px', borderBottom: `1px solid ${C.border}`,
              borderLeft: n.read ? 'none' : '3px solid #00E5A0',
              paddingLeft: n.read ? 0 : '10px',
              cursor: 'pointer',
            }}
          >
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, backgroundColor: C.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              {NOTIF_ICONS[n.type] || '🔔'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                <p style={{ margin: 0, fontWeight: n.read ? 500 : 700, fontSize: '0.88rem', color: C.textPrimary }}>{n.title}</p>
                <span style={{ fontSize: '0.72rem', color: C.textSecondary, flexShrink: 0 }}>{relativeTime(n.created_at)}</span>
              </div>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: C.textSecondary, lineHeight: 1.5 }}>{n.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Emergency Contacts Modal ──────────────────────────────────────────────────
const EMERG_PHONE_RE = /^[6-9]\d{9}$/;

function EmergencyContactsModal({ vehicle, onClose }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ phone: '', label: '', priority: '1' });
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get(`/vehicles/${vehicle._id}/emergency-contacts`)
      .then(r => setContacts(r.data.contacts || []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [vehicle._id]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function handleAdd() {
    if (!EMERG_PHONE_RE.test(form.phone)) { setFormErr('Valid 10-digit phone required'); return; }
    if (!form.label.trim()) { setFormErr('Label is required'); return; }
    setSaving(true); setFormErr('');
    try {
      const r = await api.post(`/vehicles/${vehicle._id}/emergency-contacts`, {
        phone: form.phone, label: form.label.trim(), priority: parseInt(form.priority),
      });
      setContacts(r.data.contacts);
      setAdding(false);
      setForm({ phone: '', label: '', priority: '1' });
      showToast('Contact added.');
    } catch (e) { setFormErr(e.response?.data?.message || 'Failed to add contact'); }
    finally { setSaving(false); }
  }

  async function handleDelete(contactId) {
    try {
      const r = await api.delete(`/vehicles/${vehicle._id}/emergency-contacts/${contactId}`);
      setContacts(r.data.contacts);
      showToast('Contact removed.');
    } catch { showToast('Failed to remove contact.'); }
  }

  async function handleMove(idx, dir) {
    const sorted = [...contacts].sort((a, b) => a.priority - b.priority);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    try {
      await Promise.all([
        api.put(`/vehicles/${vehicle._id}/emergency-contacts/${a._id}`, { priority: b.priority }),
        api.put(`/vehicles/${vehicle._id}/emergency-contacts/${b._id}`, { priority: a.priority }),
      ]);
      const r = await api.get(`/vehicles/${vehicle._id}/emergency-contacts`);
      setContacts(r.data.contacts || []);
    } catch { showToast('Failed to reorder contacts.'); }
  }

  const sorted = [...contacts].sort((a, b) => a.priority - b.priority);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.panel, borderTopLeftRadius: '20px', borderTopRightRadius: '20px', border: `1px solid ${C.border}`, padding: '1.5rem', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: C.border, margin: '0 auto 1.25rem' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: C.textPrimary, fontFamily: font.heading }}>Emergency Contacts</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: C.textSecondary, fontFamily: font.mono }}>{vehicle.plate_number}</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: C.textSecondary, fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Disclaimer */}
        <div style={{ backgroundColor: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.78rem', color: C.danger, lineHeight: 1.5 }}>
            🚨 These contacts will be called automatically if you don't answer an emergency call from your QR.
          </p>
        </div>

        {toast && (
          <div style={{ backgroundColor: 'rgba(0,229,160,0.1)', border: `1px solid ${C.borderTeal}`, borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
            <p style={{ color: C.teal, fontSize: '0.82rem', margin: 0 }}>{toast}</p>
          </div>
        )}

        {loading && <p style={{ color: C.textSecondary, fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>Loading…</p>}

        {!loading && sorted.length === 0 && !adding && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📵</p>
            <p style={{ color: C.textSecondary, fontSize: '0.88rem', margin: 0 }}>No emergency contacts yet.</p>
          </div>
        )}

        {/* Contact list */}
        {!loading && sorted.map((contact, idx) => (
          <div key={contact._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: C.danger, flexShrink: 0 }}>
              {contact.priority}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: C.textPrimary }}>{contact.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: C.textSecondary, fontFamily: 'monospace' }}>{contact.phone_masked}</p>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              <button onClick={() => handleMove(idx, -1)} disabled={idx === 0} style={{ padding: '4px 7px', border: `1px solid ${C.border}`, borderRadius: '4px', backgroundColor: 'transparent', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: idx === 0 ? C.textSecondary : C.textPrimary, fontSize: '0.78rem', lineHeight: 1 }}>↑</button>
              <button onClick={() => handleMove(idx, 1)} disabled={idx === sorted.length - 1} style={{ padding: '4px 7px', border: `1px solid ${C.border}`, borderRadius: '4px', backgroundColor: 'transparent', cursor: idx === sorted.length - 1 ? 'not-allowed' : 'pointer', color: idx === sorted.length - 1 ? C.textSecondary : C.textPrimary, fontSize: '0.78rem', lineHeight: 1 }}>↓</button>
              <button onClick={() => handleDelete(contact._id)} style={{ padding: '4px 8px', border: 'none', borderRadius: '4px', backgroundColor: 'rgba(255,59,92,0.1)', color: C.danger, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>✕</button>
            </div>
          </div>
        ))}

        {/* Add form */}
        {!loading && adding && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px', marginTop: '12px' }}>
            <p style={{ fontWeight: 600, fontSize: '0.88rem', color: C.textPrimary, margin: '0 0 12px' }}>New Emergency Contact</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Label (e.g. Wife, Brother)" maxLength={50} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '0.88rem', color: C.textPrimary, outline: 'none', backgroundColor: C.navy }} />
              <input type="tel" inputMode="numeric" maxLength={10} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} placeholder="10-digit mobile number" style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '0.88rem', color: C.textPrimary, outline: 'none', backgroundColor: C.navy }} />
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '0.88rem', color: C.textPrimary, outline: 'none', backgroundColor: C.navy, cursor: 'pointer' }}>
                <option value="1">Priority 1 (called first)</option>
                <option value="2">Priority 2</option>
                <option value="3">Priority 3 (called last)</option>
              </select>
            </div>
            {formErr && <p style={{ color: '#DC2626', fontSize: '0.8rem', margin: '8px 0 0' }}>{formErr}</p>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => { setAdding(false); setFormErr(''); setForm({ phone: '', label: '', priority: '1' }); }} style={{ flex: 1, padding: '9px', border: `1px solid ${C.border}`, borderRadius: '8px', backgroundColor: 'transparent', color: C.textSecondary, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '8px', backgroundColor: saving ? '#FCA5A5' : '#EF4444', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Adding…' : 'Add Contact'}</button>
            </div>
          </div>
        )}

        {/* Add button */}
        {!loading && !adding && sorted.length < 3 && (
          <button onClick={() => setAdding(true)} style={{ width: '100%', marginTop: '12px', padding: '10px', border: '1px dashed rgba(255,59,92,0.3)', borderRadius: '8px', backgroundColor: 'rgba(255,59,92,0.05)', color: C.danger, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            + Add Emergency Contact
          </button>
        )}
      </div>
    </div>
  );
}

// ── Vehicle Card ──────────────────────────────────────────────────────────────
function VehicleCard({ vehicle, payment, onViewQR, onViewActivity, onViewReceipt, onPay, paying, onRenew, renewing, onViewHistory, onViewEmergency, privacyScore, onDigilocker, digilockerLoading }) {
  const isVerified           = vehicle.status === 'verified';
  const isFailed             = vehicle.status === 'verification_failed';
  const isAwaitingDigilocker = vehicle.status === 'awaiting_digilocker';
  const active  = isVerified && isActivePayment(payment);
  const expired = isVerified && payment?.status === 'paid' && !isActivePayment(payment);
  const days = daysRemaining(vehicle);
  const expiring = active && days !== null && days <= 30;

  // Badge config
  let badge;
  if (expiring)             badge = { label: 'Expiring Soon',     bg: 'rgba(251,146,60,0.12)', color: '#FB923C', border: 'rgba(251,146,60,0.3)' };
  else if (active)          badge = { label: 'Active',            bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' };
  else if (expired)         badge = { label: 'Expired',           bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' };
  else if (isVerified)      badge = { label: 'Approved',          bg: '#F0FDF4', color: '#166534', border: '#86EFAC' };
  else if (isFailed)        badge = { label: 'Review Required',   bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' };
  else if (isAwaitingDigilocker) badge = { label: 'Awaiting DigiLocker', bg: 'rgba(103,183,255,0.12)', color: '#67B7FF', border: 'rgba(103,183,255,0.3)' };
  else                      badge = { label: 'Processing',        bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' };

  const hasDocsSection = isFailed || isVerified || isAwaitingDigilocker;

  return (
    <div style={{
      backgroundColor: C.panel,
      border: `1px solid ${isFailed ? 'rgba(255,59,92,0.3)' : C.border}`,
      borderLeft: isFailed ? '4px solid #EF4444' : isAwaitingDigilocker ? '4px solid #67B7FF' : `1px solid ${C.border}`,
      borderRadius: '12px', padding: '1.2rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: font.mono, fontSize: '1.1rem', fontWeight: 700, color: C.textPrimary }}>
            {vehicle.plate_number}
          </span>
          {privacyScore !== null && privacyScore !== undefined && (
            <ScoreBadge score={privacyScore} />
          )}
        </div>
        <span style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: '999px', padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600 }}>
          {badge.label}
        </span>
      </div>

      {/* Expiry line for active/expiring */}
      {active && vehicle.qr_valid_until && (
        <p style={{ fontSize: '0.78rem', color: C.textSecondary, margin: '-4px 0 12px' }}>
          Valid until {formatDate(vehicle.qr_valid_until)}
        </p>
      )}

      {/* DigiLocker high-confidence badge */}
      {isVerified && vehicle.digilocker_verified && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(103,183,255,0.1)', border: '1px solid rgba(103,183,255,0.3)', borderRadius: '6px', padding: '3px 10px', marginBottom: '10px', fontSize: '0.75rem', fontWeight: 600, color: '#67B7FF' }}>
          🛡️ DigiLocker Verified
        </div>
      )}

      {/* Verification failed reason */}
      {isFailed && vehicle.rejection_reason && (
        <div style={{ backgroundColor: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
          <p style={{ color: C.danger, fontSize: '0.8rem', fontWeight: 600, margin: '0 0 2px' }}>Verification failed:</p>
          <p style={{ color: C.danger, fontSize: '0.82rem', margin: 0 }}>{vehicle.rejection_reason}</p>
        </div>
      )}

      {/* DigiLocker pending notice */}
      {isAwaitingDigilocker && (
        <div style={{ backgroundColor: 'rgba(103,183,255,0.08)', border: '1px solid rgba(103,183,255,0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
          <p style={{ color: '#67B7FF', fontSize: '0.82rem', margin: 0 }}>Connect your DigiLocker to verify your vehicle documents.</p>
        </div>
      )}

      {/* Document thumbnails */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: hasDocsSection ? '14px' : 0 }}>
        {[['RC', vehicle.rc_doc_url], ['DL', vehicle.dl_doc_url], ['Plate', vehicle.plate_photo_url]].map(([label, url]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: C.textSecondary, marginBottom: '4px' }}>{label}</p>
            {url?.endsWith('.pdf') ? (
              <a href={`http://localhost:5000${url}`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', backgroundColor: C.slate, border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '0.78rem', color: C.accent, fontWeight: 600, textDecoration: 'none' }}>
                PDF
              </a>
            ) : (
              <img src={`http://localhost:5000${url}`} alt={label} style={{ height: '56px', width: '100%', objectFit: 'cover', borderRadius: '8px', border: `1px solid ${C.border}` }} />
            )}
          </div>
        ))}
      </div>

      {/* Active & Healthy (days > 30) */}
      {active && !expiring && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={() => onViewQR(vehicle)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: C.navy, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
              View QR Code
            </button>
            <button onClick={() => onViewActivity(vehicle)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: C.panel, color: '#374151', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Activity
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onViewReceipt(vehicle)} style={{ flex: 1, padding: '7px', border: 'none', backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
              View Receipt
            </button>
            <button onClick={() => onViewHistory(vehicle)} style={{ flex: 1, padding: '7px', border: 'none', backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
              History
            </button>
          </div>
        </>
      )}

      {/* Expiring Soon (0 < days ≤ 30) */}
      {expiring && (
        <>
          <div style={{ backgroundColor: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '0.8rem', color: '#FB923C' }}>
            ⚠️ Expires in {days} day(s) — renew before your QR stops working
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={() => onViewQR(vehicle)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: C.navy, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
              View QR Code
            </button>
            <button onClick={() => onViewActivity(vehicle)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: C.panel, color: '#374151', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Activity
            </button>
          </div>
          <button
            onClick={() => onRenew(vehicle)}
            disabled={renewing === vehicle._id}
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: renewing === vehicle._id ? 'rgba(251,146,60,0.3)' : '#EA580C', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: renewing === vehicle._id ? 'not-allowed' : 'pointer', marginBottom: '6px' }}
          >
            {renewing === vehicle._id ? 'Opening payment…' : 'Renew ₹499'}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => onViewReceipt(vehicle)} style={{ flex: 1, padding: '7px', border: 'none', backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
              View Receipt
            </button>
            <button onClick={() => onViewHistory(vehicle)} style={{ flex: 1, padding: '7px', border: 'none', backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
              History
            </button>
          </div>
        </>
      )}

      {/* Approved but unpaid */}
      {isVerified && !active && !expired && (
        <button
          onClick={() => onPay(vehicle)}
          disabled={paying === vehicle._id}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: paying === vehicle._id ? 'rgba(0,229,160,0.3)' : C.teal, color: C.navy, fontWeight: 700, fontSize: '0.9rem', cursor: paying === vehicle._id ? 'not-allowed' : 'pointer' }}
        >
          {paying === vehicle._id ? 'Opening payment…' : 'Pay ₹499 & Get QR'}
        </button>
      )}

      {/* Expired */}
      {expired && (
        <>
          <div style={{ backgroundColor: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '0.8rem', color: C.danger }}>
            Your QR is no longer working. Renew to reactivate.
          </div>
          <button
            onClick={() => onRenew(vehicle)}
            disabled={renewing === vehicle._id}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: renewing === vehicle._id ? 'rgba(255,59,92,0.3)' : '#EF4444', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: renewing === vehicle._id ? 'not-allowed' : 'pointer', marginBottom: '6px' }}
          >
            {renewing === vehicle._id ? 'Opening payment…' : 'Renew ₹499'}
          </button>
          <button onClick={() => onViewHistory(vehicle)} style={{ width: '100%', padding: '7px', border: 'none', backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
            History
          </button>
        </>
      )}

      {/* Verification failed — re-upload */}
      {isFailed && (
        <Link to={`/vehicles/resubmit/${vehicle._id}`} style={{ display: 'block', textAlign: 'center', backgroundColor: C.teal, color: C.navy, borderRadius: '8px', padding: '10px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>
          Re-upload Documents →
        </Link>
      )}

      {/* Awaiting DigiLocker — show auth button */}
      {isAwaitingDigilocker && (
        <button
          onClick={() => onDigilocker && onDigilocker(vehicle)}
          disabled={digilockerLoading === vehicle._id}
          style={{ width: '100%', padding: '10px', border: 'none', backgroundColor: digilockerLoading === vehicle._id ? 'rgba(103,183,255,0.3)' : '#67B7FF', color: C.navy, borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700, cursor: digilockerLoading === vehicle._id ? 'not-allowed' : 'pointer' }}
        >
          {digilockerLoading === vehicle._id ? 'Redirecting…' : '🛡️ Verify with DigiLocker'}
        </button>
      )}

      {/* Emergency contacts — available for all verified vehicles */}
      {isVerified && (
        <div style={{ borderTop: `1px solid ${C.border}`, marginTop: '10px', paddingTop: '8px', textAlign: 'center' }}>
          <button onClick={() => onViewEmergency(vehicle)} style={{ border: 'none', background: 'none', color: C.danger, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}>
            🚨 Emergency Contacts
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [paymentMap, setPaymentMap] = useState({}); // vehicleId → payment
  const [qrVehicle, setQrVehicle] = useState(null);
  const [actVehicle, setActVehicle] = useState(null);
  const [receiptData, setReceiptData] = useState(null); // { vehicle, payment }
  const [paying, setPaying] = useState(null); // vehicleId being paid
  const [renewing, setRenewing] = useState(null); // vehicleId being renewed
  const [digilockerLoading, setDigilockerLoading] = useState(null); // vehicleId
  const [payErr, setPayErr] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [historyVehicle, setHistoryVehicle] = useState(null);
  const [emergencyVehicle, setEmergencyVehicle] = useState(null);
  const [orders, setOrders] = useState([]);
  const [notifOpen, setNotifOpen]         = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [privacyScore, setPrivacyScore]   = useState(null);
  const [privacyBreakdown, setPrivacyBreakdown] = useState([]);
  const [prevPrivacyScore, setPrevPrivacyScore] = useState(null);
  const [scoreToast, setScoreToast]       = useState('');
  const navigate = useNavigate();
  const cardsRef = useRef(null);

  function loadPrivacyScore(showToast = false) {
    api.get('/users/me/privacy-score')
      .then(r => {
        const newScore = r.data.score;
        setPrivacyBreakdown(r.data.breakdown || []);
        setPrivacyScore(prev => {
          if (showToast && prev !== null && newScore > prev) {
            setScoreToast(`Privacy score improved! +${newScore - prev} points`);
            setTimeout(() => setScoreToast(''), 4000);
          }
          setPrevPrivacyScore(prev);
          return newScore;
        });
      })
      .catch(() => {});
  }

  function loadNotifications() {
    api.get('/notifications?limit=30')
      .then(r => {
        setNotifications(r.data.notifications || []);
        setUnreadCount(r.data.unread_count || 0);
      })
      .catch(() => {});
  }

  // Poll unread count every 60 s to keep the badge current
  useEffect(() => {
    const id = setInterval(() => {
      api.get('/notifications/unread-count')
        .then(r => setUnreadCount(r.data.unread_count || 0))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const loadPayments = useCallback(async (vehicleList) => {
    const verified = vehicleList.filter(v => v.status === 'verified');
    if (!verified.length) return;
    const results = await Promise.allSettled(
      verified.map(v => api.get(`/payments/status/${v._id}`))
    );
    const map = {};
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        map[verified[i]._id] = r.value.data.payment;
      }
    });
    setPaymentMap(map);
  }, []);

  useEffect(() => {
    Promise.all([api.get('/users/me'), api.get('/vehicles'), api.get('/orders')])
      .then(([userRes, vehiclesRes, ordersRes]) => {
        const u = userRes.data.user;
        if (!u.profile_complete) { navigate('/profile-setup'); return; }
        const list = vehiclesRes.data.vehicles;
        setUser(u);
        setVehicles(list);
        setOrders(ordersRes.data.orders || []);
        loadPayments(list);
        loadNotifications();
        loadPrivacyScore();
      })
      .catch(() => { localStorage.removeItem('token'); navigate('/login'); });
  }, [navigate, loadPayments]);

  // Handle DigiLocker callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dl = params.get('digilocker');
    if (dl === 'success') {
      setPaySuccess('DigiLocker verification successful! Your vehicle has been verified.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (dl === 'failed') {
      setPayErr('DigiLocker verification failed. Your documents are under manual review.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (dl === 'error') {
      setPayErr('DigiLocker authentication was cancelled or failed.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (vehicles.length > 0 && cardsRef.current) {
      gsap.from(cardsRef.current.children, { y: 20, duration: 0.4, stagger: 0.1, ease: 'power2.out' });
    }
  }, [vehicles]);

  async function handlePay(vehicle) {
    setPayErr('');
    setPaying(vehicle._id);
    try {
      const { data } = await api.post('/payments/create-order', { vehicle_id: vehicle._id });
      if (!data.success) throw new Error(data.message);

      window.bolt.launch({
        key:         data.key,
        txnid:       data.txnid,
        amount:      data.amount,
        productinfo: data.productinfo,
        firstname:   data.firstname,
        email:       data.email,
        phone:       data.phone,
        hash:        data.hash,
        surl:        window.location.href,
        furl:        window.location.href,
      }, {
        responseHandler: async (BOLT) => {
          const txn = BOLT.response;
          if (txn.txnStatus === 'SUCCESS') {
            try {
              await api.post('/payments/verify', {
                txnid:       txn.txnid,
                mihpayid:    txn.mihpayid,
                status:      txn.status,
                hash:        txn.hash,
                amount:      txn.amount,
                productinfo: txn.productinfo,
                firstname:   txn.firstname,
                email:       txn.email,
              });
              const { data: vData } = await api.get('/vehicles');
              setVehicles(vData.vehicles);
              await loadPayments(vData.vehicles);
              loadNotifications();
              loadPrivacyScore(true);
            } catch {
              setPayErr('Payment received but verification failed. Please contact support.');
            }
          } else {
            setPayErr('Payment was not completed. You can try again anytime.');
          }
          setPaying(null);
        },
        catchException: () => {
          setPayErr('Payment cancelled. You can try again anytime.');
          setPaying(null);
        },
      });
    } catch (err) {
      setPayErr(err.response?.data?.message || err.message || 'Failed to initiate payment');
      setPaying(null);
    }
  }

  function handleMarkRead(notifId) {
    api.put(`/notifications/${notifId}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n._id === notifId ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  function handleMarkAll() {
    api.put('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function handleViewReceipt(vehicle) {
    const payment = paymentMap[vehicle._id];
    if (payment) setReceiptData({ vehicle, payment });
  }

  async function handleRenew(vehicle) {
    setPayErr('');
    setPaySuccess('');
    setRenewing(vehicle._id);
    try {
      const { data } = await api.post('/payments/renew', { vehicle_id: vehicle._id });
      if (!data.success) throw new Error(data.message);

      window.bolt.launch({
        key:         data.key,
        txnid:       data.txnid,
        amount:      data.amount,
        productinfo: data.productinfo,
        firstname:   data.firstname,
        email:       data.email,
        phone:       data.phone,
        hash:        data.hash,
        surl:        window.location.href,
        furl:        window.location.href,
      }, {
        responseHandler: async (BOLT) => {
          const txn = BOLT.response;
          if (txn.txnStatus === 'SUCCESS') {
            try {
              await api.post('/payments/verify', {
                txnid:       txn.txnid,
                mihpayid:    txn.mihpayid,
                status:      txn.status,
                hash:        txn.hash,
                amount:      txn.amount,
                productinfo: txn.productinfo,
                firstname:   txn.firstname,
                email:       txn.email,
              });
              const { data: vData } = await api.get('/vehicles');
              setVehicles(vData.vehicles);
              await loadPayments(vData.vehicles);
              setRenewing(null);
              setPaySuccess('Renewed! Download your new QR — the old sticker no longer works.');
              loadNotifications();
              loadPrivacyScore(true);
            } catch {
              setPayErr('Payment received but verification failed. Please contact support.');
              setRenewing(null);
            }
          } else {
            setPayErr('Payment was not completed. You can try again anytime.');
            setRenewing(null);
          }
        },
        catchException: () => {
          setRenewing(null);
        },
      });
    } catch (err) {
      setPayErr(err.response?.data?.message || err.message || 'Failed to initiate renewal');
      setRenewing(null);
    }
  }

  async function handleDigilocker(vehicle) {
    setDigilockerLoading(vehicle._id);
    try {
      const { data } = await api.get(`/auth/digilocker/initiate?vehicleId=${vehicle._id}`);
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch (err) {
      setPayErr(err.response?.data?.message || 'Failed to initiate DigiLocker');
      setDigilockerLoading(null);
    }
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.textSecondary, fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  const canAddMore = vehicles.filter(v => !['verification_failed', 'deactivated'].includes(v.status)).length < 2;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.navy, padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.textPrimary, margin: 0, fontFamily: font.heading }}>Hey, {user.name} 👋</h1>
            <p style={{ fontSize: '0.85rem', color: C.textSecondary, marginTop: '2px' }}>+91 {user.phone_hash}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Settings icon */}
            <Link
              to="/settings"
              style={{ border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 10px', backgroundColor: 'transparent', color: C.textSecondary, fontSize: '1rem', cursor: 'pointer', lineHeight: 1, textDecoration: 'none', display: 'flex', alignItems: 'center' }}
              title="Settings"
            >
              ⚙️
            </Link>
            {/* Bell icon */}
            <button
              onClick={() => setNotifOpen(true)}
              style={{ position: 'relative', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '8px 10px', backgroundColor: 'transparent', color: C.textSecondary, fontSize: '1rem', cursor: 'pointer', lineHeight: 1 }}
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-6px', right: '-6px', minWidth: '18px', height: '18px', borderRadius: '999px', backgroundColor: '#FF3B5C', color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ border: `1px solid ${C.borderTeal}`, borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, color: C.teal, backgroundColor: 'rgba(0,229,160,0.08)', textDecoration: 'none' }}>
                Admin
              </Link>
            )}
            <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
              style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 500, color: '#374151', backgroundColor: C.panel, cursor: 'pointer' }}>
              Log out
            </button>
          </div>
        </div>

        {/* Payment success toast */}
        {paySuccess && (
          <div style={{ backgroundColor: 'rgba(0,229,160,0.1)', border: `1px solid ${C.borderTeal}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem' }}>
            <p style={{ color: C.teal, fontSize: '0.85rem', margin: 0 }}>{paySuccess}</p>
          </div>
        )}

        {/* Payment error toast */}
        {payErr && (
          <div style={{ backgroundColor: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem' }}>
            <p style={{ color: C.danger, fontSize: '0.85rem', margin: 0 }}>{payErr}</p>
          </div>
        )}

        {/* Score improvement toast */}
        {scoreToast && (
          <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#111834', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '10px', padding: '10px 20px', fontSize: '0.85rem', color: '#00E5A0', fontWeight: 600, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            ↑ {scoreToast}
          </div>
        )}

        {/* Privacy Score widget */}
        {privacyScore !== null && (
          <PrivacyScore
            score={privacyScore}
            breakdown={privacyBreakdown}
            prevScore={prevPrivacyScore}
          />
        )}

        {/* Vehicles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: C.textPrimary, margin: 0, fontFamily: font.heading }}>Your Vehicles</h2>
          {canAddMore && (
            <Link to="/vehicles/register" style={{ backgroundColor: C.teal, color: C.navy, borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              + Add Vehicle
            </Link>
          )}
        </div>

        {vehicles.length === 0 ? (
          <div style={{ backgroundColor: C.panel, border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: C.textSecondary, fontSize: '0.9rem', margin: 0 }}>No vehicles registered yet.</p>
            <Link to="/vehicles/register" style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.9rem', color: C.teal, fontWeight: 600 }}>
              Register your first vehicle →
            </Link>
          </div>
        ) : (
          <div ref={cardsRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {vehicles.map((v) => (
              <VehicleCard
                key={v._id}
                vehicle={v}
                payment={paymentMap[v._id] ?? null}
                onViewQR={setQrVehicle}
                onViewActivity={setActVehicle}
                onViewReceipt={handleViewReceipt}
                onPay={handlePay}
                paying={paying}
                onRenew={handleRenew}
                renewing={renewing}
                onViewHistory={setHistoryVehicle}
                onViewEmergency={setEmergencyVehicle}
                privacyScore={privacyScore}
                onDigilocker={handleDigilocker}
                digilockerLoading={digilockerLoading}
              />
            ))}
          </div>
        )}

        {/* Orders section */}
        {orders.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: C.textPrimary, margin: '0 0 0.75rem', fontFamily: font.heading }}>Your Orders</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {orders.map(order => {
                const stages = ['paid', 'processing', 'shipped', 'delivered'];
                const currentIdx = stages.indexOf(order.status);
                const plate = order.vehicle_id?.plate_number || '—';
                return (
                  <div key={order._id} style={{ backgroundColor: C.panel, border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontFamily: font.mono, fontWeight: 700, fontSize: '0.95rem', color: C.textPrimary }}>{plate}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '999px', backgroundColor: order.type === 'express' ? 'rgba(103,183,255,0.1)' : 'rgba(148,163,184,0.08)', color: order.type === 'express' ? C.accent : C.textSecondary, border: `1px solid ${order.type === 'express' ? 'rgba(103,183,255,0.25)' : C.border}` }}>
                        {order.type === 'express' ? 'Express' : 'Standard'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: C.textSecondary, margin: '0 0 10px' }}>
                      {order.delivery_address.city} — {order.delivery_address.pincode} · {formatDate(order.created_at)}
                    </p>
                    {/* 4-stage progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {stages.map((stage, i) => {
                        const done = i <= currentIdx;
                        return (
                          <div key={stage} style={{ display: 'flex', alignItems: 'center', flex: i < stages.length - 1 ? 1 : 0 }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: done ? C.teal : C.slate, flexShrink: 0 }} title={stage} />
                            {i < stages.length - 1 && (
                              <div style={{ flex: 1, height: '2px', backgroundColor: i < currentIdx ? C.teal : C.slate }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                      {stages.map((stage, i) => (
                        <span key={stage} style={{ fontSize: '0.68rem', color: i <= currentIdx ? C.teal : C.textSecondary, textTransform: 'capitalize', flex: i < stages.length - 1 ? 1 : 0, textAlign: i === 0 ? 'left' : i === stages.length - 1 ? 'right' : 'center' }}>
                          {stage}
                        </span>
                      ))}
                    </div>
                    {order.tracking_id && (
                      <p style={{ fontSize: '0.78rem', color: C.teal, fontWeight: 600, margin: '8px 0 0' }}>
                        Tracking: {order.tracking_id}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {qrVehicle && <QRModal vehicle={qrVehicle} onClose={() => setQrVehicle(null)} onPrint={() => navigate(`/print/${qrVehicle._id}`)} onOrder={() => navigate(`/order-card/${qrVehicle._id}`)} />}
      {actVehicle && <ActivityModal vehicle={actVehicle} onClose={() => setActVehicle(null)} />}
      {receiptData && <ReceiptModal vehicle={receiptData.vehicle} payment={receiptData.payment} onClose={() => setReceiptData(null)} />}
      {historyVehicle && <PaymentHistoryModal vehicle={historyVehicle} onClose={() => setHistoryVehicle(null)} />}
      {emergencyVehicle && <EmergencyContactsModal vehicle={emergencyVehicle} onClose={() => setEmergencyVehicle(null)} />}
      {notifOpen && <NotificationPanel notifications={notifications} onClose={() => setNotifOpen(false)} onMarkRead={handleMarkRead} onMarkAll={handleMarkAll} />}
    </div>
  );
}
