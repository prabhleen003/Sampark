import { useEffect, useState } from 'react';
import api from '../../api/axios';

const C = {
  navy:    '#0A0F2C',
  slate:   '#1E293B',
  panel:   '#111834',
  teal:    '#00E5A0',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  border:  'rgba(148,163,184,0.12)',
  danger:  '#FF3B5C',
  amber:   '#FB923C',
  orange:  '#F97316',
  darkRed: '#DC2626',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

const STATUS_TABS = ['open', 'reviewed', 'resolved'];

const RISK_CONFIG = {
  high:   { color: C.danger,  bg: 'rgba(255,59,92,0.12)',  border: 'rgba(255,59,92,0.3)',  label: 'High Risk',   bar: C.danger },
  medium: { color: C.amber,   bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.3)', label: 'Medium Risk', bar: C.amber },
  low:    { color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',  label: 'Low Risk',    bar: '#22C55E' },
};

const ACTION_CONFIG = {
  dismiss:              { label: 'Dismiss',             color: C.textSecondary, bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.25)', confirm: false },
  warn_caller:          { label: 'Warn Caller',         color: C.amber,         bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.25)',  confirm: false },
  block_caller_vehicle: { label: 'Block from Vehicle',  color: C.orange,        bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  confirm: false, hasDuration: true },
  block_caller_global:  { label: 'Block Globally',      color: C.danger,        bg: 'rgba(255,59,92,0.1)',   border: 'rgba(255,59,92,0.25)',   confirm: true,  hasDuration: true },
  suspend_vehicle:      { label: 'Suspend Vehicle',     color: C.darkRed,       bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.25)',   confirm: true },
};

const DURATION_OPTIONS = [
  { label: '7 days',   value: 7 },
  { label: '30 days',  value: 30 },
  { label: '90 days',  value: 90 },
  { label: 'Permanent', value: '' },
];

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function relTime(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function RiskBadge({ level }) {
  if (!level) return null;
  const cfg = RISK_CONFIG[level] || RISK_CONFIG.low;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 10px', borderRadius: '999px',
      backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontSize: '0.75rem', fontWeight: 700,
      fontFamily: font.body,
    }}>
      {cfg.label}
    </span>
  );
}

function CallerProfileCard({ profile }) {
  if (!profile) return <p style={{ color: C.textSecondary, fontFamily: font.body, fontSize: '0.85rem' }}>No caller data available.</p>;

  const risk = RISK_CONFIG[profile.risk_level] || RISK_CONFIG.low;
  const showWarning = profile.unique_vehicles_contacted >= 20 || profile.reports_against >= 2;

  return (
    <div style={{ backgroundColor: C.navy, borderRadius: '10px', padding: '1rem', border: `1px solid ${risk.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontFamily: font.heading, fontSize: '0.9rem', fontWeight: 700, color: C.textPrimary }}>Caller Profile</span>
        <RiskBadge level={profile.risk_level} />
      </div>

      {showWarning && (
        <div style={{ backgroundColor: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: '8px', padding: '8px 12px', marginBottom: '0.75rem' }}>
          <p style={{ margin: 0, color: C.danger, fontSize: '0.78rem', fontWeight: 600, fontFamily: font.body }}>
            This caller shows patterns of potential abuse.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {[
          { label: 'Total Interactions', value: profile.total_interactions },
          { label: 'Unique Vehicles',    value: profile.unique_vehicles_contacted },
          { label: 'Reports Against',    value: profile.reports_against },
          { label: 'Currently Blocked',  value: profile.is_currently_blocked ? 'Yes' : 'No' },
        ].map(({ label, value }) => (
          <div key={label} style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '8px 10px' }}>
            <p style={{ margin: 0, color: C.textSecondary, fontSize: '0.72rem', fontFamily: font.body }}>{label}</p>
            <p style={{ margin: '2px 0 0', color: C.textPrimary, fontSize: '0.9rem', fontWeight: 700, fontFamily: font.mono }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <p style={{ margin: 0, color: C.textSecondary, fontSize: '0.72rem', fontFamily: font.body }}>
          First seen: <span style={{ color: C.textPrimary }}>{formatDate(profile.first_seen)}</span>
        </p>
        <p style={{ margin: 0, color: C.textSecondary, fontSize: '0.72rem', fontFamily: font.body }}>
          Last seen: <span style={{ color: C.textPrimary }}>{formatDate(profile.last_seen)}</span>
        </p>
      </div>
    </div>
  );
}

function TimelineEntry({ log }) {
  const typeIcon = { message: '💬', call: '📞', emergency: '🚨' };
  return (
    <div style={{ display: 'flex', gap: '10px', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: '1rem' }}>{typeIcon[log.type] || '•'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: C.textPrimary, fontSize: '0.85rem', fontWeight: 600, fontFamily: font.body, textTransform: 'capitalize' }}>{log.type}</span>
          {log.status && (
            <span style={{ color: C.textSecondary, fontSize: '0.75rem', fontFamily: font.mono }}>{log.status}</span>
          )}
          {log.duration_seconds && (
            <span style={{ color: C.teal, fontSize: '0.75rem', fontFamily: font.mono }}>{log.duration_seconds}s</span>
          )}
        </div>
        {log.custom_text && (
          <p style={{ margin: '2px 0 0', color: C.textSecondary, fontSize: '0.78rem', fontFamily: font.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            "{log.custom_text}"
          </p>
        )}
      </div>
      <span style={{ color: C.textSecondary, fontSize: '0.72rem', fontFamily: font.body, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {relTime(log.created_at)}
      </span>
    </div>
  );
}

// ── Confirmation Modal ─────────────────────────────────────────────────────────
function ConfirmModal({ action, notes, onConfirm, onCancel }) {
  const cfg = ACTION_CONFIG[action];
  const isGlobal  = action === 'block_caller_global';
  const isSuspend = action === 'suspend_vehicle';
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 500, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.panel, border: `1px solid ${cfg.border}`, borderRadius: '14px', padding: '1.5rem', maxWidth: '420px', width: '100%' }}>
        <h3 style={{ margin: '0 0 10px', color: cfg.color, fontFamily: font.heading, fontSize: '1rem', fontWeight: 700 }}>
          {isGlobal ? 'Block caller globally?' : 'Suspend vehicle?'}
        </h3>
        <p style={{ margin: '0 0 1.25rem', color: C.textSecondary, fontFamily: font.body, fontSize: '0.875rem', lineHeight: 1.6 }}>
          {isGlobal
            ? 'This will prevent this caller from contacting ANY vehicle on Sampark. Are you sure?'
            : 'This will deactivate the vehicle\'s QR. The owner will be notified. Use this only if the vehicle registration itself appears suspicious.'}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontFamily: font.body, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${cfg.border}`, backgroundColor: cfg.bg, color: cfg.color, fontFamily: font.body, fontWeight: 700, cursor: 'pointer' }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Detail Panel ───────────────────────────────────────────────────────
function ReportDetail({ reportId, onClose, onResolved }) {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [action, setAction]       = useState('');
  const [notes, setNotes]         = useState('');
  const [duration, setDuration]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]             = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    api.get(`/admin/abuse-reports/${reportId}`)
      .then(r => setData(r.data))
      .catch(() => setErr('Failed to load report'))
      .finally(() => setLoading(false));
  }, [reportId]);

  async function handleSubmit() {
    if (!action) { setErr('Select an action.'); return; }
    if (!notes.trim()) { setErr('Admin notes are required.'); return; }

    const cfg = ACTION_CONFIG[action];
    if (cfg.confirm) { setShowConfirm(true); return; }
    await doSubmit();
  }

  async function doSubmit() {
    setShowConfirm(false);
    setSubmitting(true);
    setErr('');
    try {
      await api.put(`/admin/abuse-reports/${reportId}`, {
        action,
        notes: notes.trim(),
        block_duration: duration || undefined,
      });
      onResolved(reportId);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.message || 'Action failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={panelStyle}>
          <p style={{ color: C.textSecondary, fontFamily: font.body }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={overlayStyle}>
        <div style={panelStyle}>
          <p style={{ color: C.danger, fontFamily: font.body }}>Failed to load report.</p>
          <button onClick={onClose} style={closeBtnStyle}>Close</button>
        </div>
      </div>
    );
  }

  const { report, caller_profile, timeline, other_caller_reports, other_vehicle_reports } = data;
  const callLog = report.call_log_id;
  const selectedCfg = action ? ACTION_CONFIG[action] : null;

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div onClick={e => e.stopPropagation()} style={{ ...panelStyle, maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontFamily: font.heading, fontSize: '1.1rem', fontWeight: 700, color: C.textPrimary }}>
            Abuse Report — {report.vehicle_id?.plate_number || 'Unknown Vehicle'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
        </div>

        {/* Section 1 — Report Details */}
        <section style={sectionStyle}>
          <h3 style={sectionHeading}>Report Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
              <span style={{ color: C.textSecondary, fontSize: '0.8rem', fontFamily: font.body, minWidth: '100px' }}>Reason</span>
              <span style={{ color: C.textPrimary, fontSize: '0.875rem', fontFamily: font.body, fontWeight: 600, textTransform: 'capitalize' }}>{report.reason}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
              <span style={{ color: C.textSecondary, fontSize: '0.8rem', fontFamily: font.body, minWidth: '100px' }}>Reported by</span>
              <span style={{ color: C.textPrimary, fontSize: '0.875rem', fontFamily: font.body }}>{report.reported_by_user_id?.name || 'Unknown'} · {relTime(report.created_at)}</span>
            </div>
            {callLog && (
              <>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                  <span style={{ color: C.textSecondary, fontSize: '0.8rem', fontFamily: font.body, minWidth: '100px' }}>Contact type</span>
                  <span style={{ color: C.textPrimary, fontSize: '0.875rem', fontFamily: font.body, textTransform: 'capitalize' }}>{callLog.type}</span>
                </div>
                {callLog.duration_seconds && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                    <span style={{ color: C.textSecondary, fontSize: '0.8rem', fontFamily: font.body, minWidth: '100px' }}>Duration</span>
                    <span style={{ color: C.teal, fontSize: '0.875rem', fontFamily: font.mono }}>{callLog.duration_seconds}s</span>
                  </div>
                )}
                {callLog.custom_text && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                    <span style={{ color: C.textSecondary, fontSize: '0.8rem', fontFamily: font.body, minWidth: '100px' }}>Message</span>
                    <span style={{ color: C.textPrimary, fontSize: '0.875rem', fontFamily: font.body, fontStyle: 'italic' }}>"{callLog.custom_text}"</span>
                  </div>
                )}
              </>
            )}
            {other_vehicle_reports > 0 && (
              <p style={{ margin: '4px 0 0', color: C.amber, fontSize: '0.78rem', fontFamily: font.body }}>
                {other_vehicle_reports} other report{other_vehicle_reports > 1 ? 's' : ''} on this vehicle
              </p>
            )}
          </div>
        </section>

        {/* Section 2 — Caller Profile */}
        <section style={sectionStyle}>
          <h3 style={sectionHeading}>Caller Profile</h3>
          <CallerProfileCard profile={caller_profile} />
          {other_caller_reports > 0 && (
            <p style={{ margin: '8px 0 0', color: C.amber, fontSize: '0.8rem', fontFamily: font.body }}>
              {other_caller_reports} other report{other_caller_reports > 1 ? 's' : ''} from this caller
            </p>
          )}
        </section>

        {/* Section 3 — Interaction Timeline */}
        {timeline && timeline.length > 0 && (
          <section style={sectionStyle}>
            <h3 style={sectionHeading}>Interaction Timeline (this vehicle)</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {timeline.map(log => <TimelineEntry key={log._id} log={log} />)}
            </div>
          </section>
        )}

        {/* Section 4 — Actions */}
        {report.status !== 'resolved' && (
          <section style={sectionStyle}>
            <h3 style={sectionHeading}>Take Action</h3>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1rem' }}>
              {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setAction(key); setErr(''); }}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                    border: `1px solid ${action === key ? cfg.border : C.border}`,
                    backgroundColor: action === key ? cfg.bg : 'rgba(255,255,255,0.03)',
                    color: action === key ? cfg.color : C.textSecondary,
                    fontFamily: font.body, fontSize: '0.82rem', fontWeight: action === key ? 700 : 500,
                    transition: 'all 0.15s',
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            {/* Duration picker (for block actions) */}
            {action && ACTION_CONFIG[action].hasDuration && (
              <div style={{ marginBottom: '0.75rem' }}>
                <p style={{ margin: '0 0 6px', color: C.textSecondary, fontSize: '0.8rem', fontFamily: font.body }}>Block duration</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.label}
                      onClick={() => setDuration(opt.value)}
                      style={{
                        padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                        border: `1px solid ${duration === opt.value ? (selectedCfg?.border || C.border) : C.border}`,
                        backgroundColor: duration === opt.value ? (selectedCfg?.bg || 'transparent') : 'rgba(255,255,255,0.03)',
                        color: duration === opt.value ? (selectedCfg?.color || C.textPrimary) : C.textSecondary,
                        fontFamily: font.body, fontSize: '0.82rem', fontWeight: 500,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <textarea
              rows={3}
              value={notes}
              onChange={e => { setNotes(e.target.value); setErr(''); }}
              placeholder="Admin notes (required)…"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                borderRadius: '8px', border: `1px solid ${C.border}`,
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: C.textPrimary, fontSize: '0.875rem', fontFamily: font.body,
                resize: 'none', outline: 'none', marginBottom: '10px',
              }}
            />

            {err && <p style={{ margin: '0 0 8px', color: C.danger, fontSize: '0.8rem', fontFamily: font.body }}>{err}</p>}

            <button
              onClick={handleSubmit}
              disabled={submitting || !action}
              style={{
                width: '100%', padding: '11px',
                borderRadius: '8px', cursor: submitting || !action ? 'not-allowed' : 'pointer',
                border: `1px solid ${selectedCfg?.border || C.border}`,
                backgroundColor: selectedCfg?.bg || 'rgba(255,255,255,0.05)',
                color: selectedCfg?.color || C.textSecondary,
                fontFamily: font.body, fontWeight: 700, fontSize: '0.9rem',
                opacity: !action ? 0.5 : 1,
              }}
            >
              {submitting ? 'Processing…' : action ? `Confirm: ${ACTION_CONFIG[action].label}` : 'Select an action above'}
            </button>
          </section>
        )}

        {/* Already resolved */}
        {report.status === 'resolved' && (
          <section style={{ ...sectionStyle, backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '10px', padding: '0.75rem 1rem' }}>
            <p style={{ margin: 0, color: '#22C55E', fontFamily: font.body, fontSize: '0.875rem', fontWeight: 700 }}>
              Resolved: {report.resolution?.replace(/_/g, ' ')}
            </p>
            {report.admin_notes && (
              <p style={{ margin: '4px 0 0', color: C.textSecondary, fontFamily: font.body, fontSize: '0.82rem' }}>
                {report.admin_notes}
              </p>
            )}
          </section>
        )}

      </div>

      {showConfirm && (
        <ConfirmModal
          action={action}
          notes={notes}
          onConfirm={doSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Report Card ────────────────────────────────────────────────────────────────
function ReportCard({ report, onOpen }) {
  const risk = report.caller_profile?.risk_level;
  const riskCfg = RISK_CONFIG[risk] || RISK_CONFIG.low;

  return (
    <div
      onClick={() => onOpen(report._id)}
      style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        backgroundColor: C.panel, borderRadius: '10px',
        border: `1px solid ${C.border}`,
        cursor: 'pointer', overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = riskCfg.border}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      {/* Severity bar */}
      <div style={{ width: '4px', backgroundColor: riskCfg.bar, flexShrink: 0 }} />

      <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Vehicle + reason */}
        <div style={{ flex: 1, minWidth: '160px' }}>
          <p style={{ margin: 0, fontFamily: font.mono, fontSize: '0.95rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '0.05em' }}>
            {report.vehicle_id?.plate_number || '—'}
          </p>
          <p style={{ margin: '2px 0 0', fontFamily: font.body, fontSize: '0.8rem', color: C.textSecondary, textTransform: 'capitalize' }}>
            {report.reason} · {relTime(report.created_at)}
          </p>
        </div>

        {/* Reporter type */}
        <span style={{ fontFamily: font.body, fontSize: '0.75rem', color: C.textSecondary }}>
          Reported by Owner
        </span>

        {/* Risk badge */}
        {risk && <RiskBadge level={risk} />}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', paddingRight: '14px' }}>
        <span style={{ color: C.textSecondary, fontSize: '0.85rem' }}>›</span>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AbuseReports() {
  const [activeTab, setActiveTab] = useState('open');
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [total, setTotal]         = useState(0);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/abuse-reports?status=${activeTab}&limit=50`)
      .then(r => { setReports(r.data.reports || []); setTotal(r.data.total || 0); })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  function handleResolved(reportId) {
    setReports(prev => prev.filter(r => r._id !== reportId));
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontFamily: font.heading, fontSize: '1.4rem', fontWeight: 700, color: C.textPrimary }}>
          Abuse Reports
        </h2>
        <p style={{ margin: '4px 0 0', color: C.textSecondary, fontFamily: font.body, fontSize: '0.875rem' }}>
          Review, investigate, and take action on reported contacts.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem' }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
              border: `1px solid ${activeTab === tab ? 'rgba(0,229,160,0.3)' : C.border}`,
              backgroundColor: activeTab === tab ? 'rgba(0,229,160,0.08)' : 'transparent',
              color: activeTab === tab ? C.teal : C.textSecondary,
              fontFamily: font.body, fontSize: '0.875rem', fontWeight: activeTab === tab ? 700 : 500,
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Report list */}
      {loading ? (
        <p style={{ color: C.textSecondary, fontFamily: font.body }}>Loading reports…</p>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.textSecondary, fontFamily: font.body }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✓</p>
          <p style={{ margin: 0 }}>No {activeTab} reports.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {reports.map(r => (
            <ReportCard key={r._id} report={r} onOpen={setSelectedId} />
          ))}
        </div>
      )}

      {selectedId && (
        <ReportDetail
          reportId={selectedId}
          onClose={() => setSelectedId(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 200,
  backgroundColor: 'rgba(0,0,0,0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '1rem',
};

const panelStyle = {
  backgroundColor: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: '16px',
  padding: '1.5rem',
  width: '100%',
  maxWidth: '540px',
};

const sectionStyle = {
  marginBottom: '1.25rem',
  paddingBottom: '1.25rem',
  borderBottom: `1px solid ${C.border}`,
};

const sectionHeading = {
  margin: '0 0 0.75rem',
  fontFamily: font.heading,
  fontSize: '0.875rem',
  fontWeight: 700,
  color: C.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

const closeBtnStyle = {
  marginTop: '1rem', padding: '8px 18px', borderRadius: '8px',
  border: `1px solid ${C.border}`, backgroundColor: 'transparent',
  color: C.textSecondary, fontFamily: font.body, cursor: 'pointer',
};

