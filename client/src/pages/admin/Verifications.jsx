import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import api from '../../api/axios';

const BASE = 'http://localhost:5000';

const C = {
  navy:    '#0A0F2C',
  slate:   '#1E293B',
  teal:    '#00E5A0',
  text:    '#F1F5F9',
  muted:   '#94A3B8',
  border:  'rgba(148,163,184,0.12)',
  danger:  '#FF3B5C',
  success: '#22C55E',
};
const font = {
  heading: "'Space Grotesk', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  const ref = useRef(null);
  useEffect(() => {
    gsap.from(ref.current, { y: 40, duration: 0.35, ease: 'power3.out' });
    const t = setTimeout(() => {
      gsap.to(ref.current, { y: 40, duration: 0.3, ease: 'power2.in', onComplete: onDone });
    }, 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={ref} style={{
      position: 'fixed', bottom: '28px', right: '28px', zIndex: 1000,
      backgroundColor: type === 'success' ? '#14532D' : '#7F1D1D',
      border: `1px solid ${type === 'success' ? '#22C55E' : '#EF4444'}`,
      borderRadius: '10px', padding: '14px 20px',
      fontFamily: font.body, fontSize: '0.9rem', color: C.text,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: '10px',
    }}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      {msg}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ url, onClose }) {
  const isPdf = url.endsWith('.pdf');
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 500,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '100%', position: 'relative' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '-40px', right: 0,
          background: 'none', border: 'none', color: C.text, fontSize: '1.5rem', cursor: 'pointer',
        }}>✕</button>
        {isPdf
          ? <iframe src={`${BASE}${url}`} style={{ width: '100%', height: '80vh', border: 'none', borderRadius: '10px' }} title="doc" />
          : <img src={`${BASE}${url}`} alt="doc" style={{ width: '100%', borderRadius: '10px', objectFit: 'contain', maxHeight: '80vh' }} />
        }
      </div>
    </div>
  );
}

// ─── DocThumb ─────────────────────────────────────────────────────────────────
function DocThumb({ label, url, onView }) {
  const isPdf = url?.endsWith('.pdf');
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontFamily: font.body, fontSize: '0.72rem', color: C.muted, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <div
        onClick={() => url && onView(url)}
        title="Click to enlarge"
        style={{
          height: '68px', width: '100%', borderRadius: '8px',
          border: `1px solid ${C.border}`,
          cursor: url ? 'pointer' : 'default',
          overflow: 'hidden',
          backgroundColor: isPdf ? '#1E293B' : undefined,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {!url
          ? <span style={{ fontSize: '0.75rem', color: C.muted }}>—</span>
          : isPdf
            ? <span style={{ fontFamily: font.mono, fontSize: '0.78rem', color: C.teal, fontWeight: 600 }}>PDF</span>
            : <img src={`${BASE}${url}`} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        }
      </div>
    </div>
  );
}

// ─── VehicleRow ───────────────────────────────────────────────────────────────
function VehicleRow({ vehicle, onAction, onView }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const rowRef = useRef(null);

  async function submit(action) {
    if (action === 'reject' && !reason.trim()) return;
    setBusy(true);
    await onAction(vehicle._id, action, reason.trim());
    gsap.to(rowRef.current, { opacity: 0, y: -12, height: 0, duration: 0.4, ease: 'power2.in' });
  }

  const owner = vehicle.user_id;
  const phone = owner?.phone_hash || '';
  const maskedPhone = phone.length >= 4 ? '••••••' + phone.slice(-4) : '——';

  return (
    <div ref={rowRef} style={{
      backgroundColor: C.slate,
      border: `1px solid ${C.border}`,
      borderRadius: '14px',
      padding: '20px 24px',
      marginBottom: '16px',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <span style={{ fontFamily: font.mono, fontSize: '1rem', fontWeight: 700, color: C.text }}>{vehicle.plate_number}</span>
          <p style={{ fontFamily: font.body, fontSize: '0.82rem', color: C.muted, margin: '4px 0 0' }}>
            {owner?.name || 'Unknown'} · +91 {maskedPhone}
          </p>
          {vehicle.rejection_reason && (
            <p style={{ fontFamily: font.body, fontSize: '0.8rem', color: C.danger, margin: '4px 0 0' }}>
              Reason: {vehicle.rejection_reason}
            </p>
          )}
        </div>
        <span style={{
          backgroundColor: vehicle.status === 'verified' ? '#14532D' : vehicle.status === 'rejected' ? '#7F1D1D' : '#78350F',
          color: vehicle.status === 'verified' ? C.success : vehicle.status === 'rejected' ? '#FCA5A5' : '#FCD34D',
          border: `1px solid ${vehicle.status === 'verified' ? C.success : vehicle.status === 'rejected' ? C.danger : '#FCD34D'}`,
          borderRadius: '999px', padding: '3px 14px',
          fontFamily: font.body, fontSize: '0.75rem', fontWeight: 600,
          textTransform: 'capitalize',
        }}>
          {vehicle.status}
        </span>
      </div>

      {/* Documents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        <DocThumb label="RC"    url={vehicle.rc_doc_url}      onView={onView} />
        <DocThumb label="DL"    url={vehicle.dl_doc_url}      onView={onView} />
        <DocThumb label="Plate" url={vehicle.plate_photo_url} onView={onView} />
      </div>

      {/* Actions — only for pending */}
      {vehicle.status === 'pending' && (
        <div>
          {!rejecting ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => submit('approve')}
                disabled={busy}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', backgroundColor: '#14532D', color: C.success, fontFamily: font.body, fontWeight: 600, fontSize: '0.9rem' }}>
                ✓ Approve
              </button>
              <button
                onClick={() => setRejecting(true)}
                disabled={busy}
                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', backgroundColor: '#7F1D1D', color: '#FCA5A5', fontFamily: font.body, fontWeight: 600, fontSize: '0.9rem' }}>
                ✕ Reject
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <textarea
                autoFocus
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Enter rejection reason…"
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  backgroundColor: C.navy, border: `1px solid ${C.danger}`,
                  borderRadius: '8px', padding: '10px', resize: 'none',
                  color: C.text, fontFamily: font.body, fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setRejecting(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px', border: `1px solid ${C.border}`, cursor: 'pointer', backgroundColor: 'transparent', color: C.muted, fontFamily: font.body, fontSize: '0.88rem' }}>
                  Cancel
                </button>
                <button onClick={() => submit('reject')} disabled={!reason.trim() || busy}
                  style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', cursor: !reason.trim() || busy ? 'not-allowed' : 'pointer', backgroundColor: C.danger, color: '#fff', fontFamily: font.body, fontWeight: 600, fontSize: '0.88rem' }}>
                  Confirm Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────
function StatsRow({ stats }) {
  const cards = [
    { label: 'Total Users',     value: stats.totalUsers,    color: '#60A5FA' },
    { label: 'Total Vehicles',  value: stats.totalVehicles, color: '#A78BFA' },
    { label: 'Pending Reviews', value: stats.pending,       color: '#FCD34D' },
    { label: 'Verified',        value: stats.verified,      color: C.teal    },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
      {cards.map(({ label, value, color }) => (
        <div key={label} style={{
          backgroundColor: C.slate, border: `1px solid ${C.border}`,
          borderTop: `3px solid ${color}`,
          borderRadius: '12px', padding: '20px 18px',
        }}>
          <p style={{ fontFamily: font.heading, fontSize: '2rem', fontWeight: 700, color: C.text, margin: 0 }}>{value ?? '—'}</p>
          <p style={{ fontFamily: font.body, fontSize: '0.82rem', color: C.muted, margin: '4px 0 0' }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Verifications() {
  const [vehicles, setVehicles]   = useState([]);
  const [stats, setStats]         = useState(null);
  const [tab, setTab]             = useState('pending');
  const [loading, setLoading]     = useState(true);
  const [lightbox, setLightbox]   = useState(null);
  const [toast, setToast]         = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type, key: Date.now() });
  }

  async function loadVehicles(status) {
    setLoading(true);
    const r = await api.get(`/admin/verifications?status=${status}`);
    setVehicles(r.data.vehicles);
    setLoading(false);
  }

  async function loadStats() {
    const r = await api.get('/admin/stats');
    setStats(r.data.stats);
  }

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadVehicles(tab); }, [tab]);

  async function handleAction(vehicleId, action, reason) {
    try {
      await api.put(`/admin/verifications/${vehicleId}`, { action, reason });
      showToast(action === 'approve' ? 'Vehicle approved ✓' : 'Vehicle rejected', action === 'approve' ? 'success' : 'error');
      loadStats();
      // Row animates itself out — remove from state after brief delay
      setTimeout(() => setVehicles(v => v.filter(x => x._id !== vehicleId)), 450);
    } catch {
      showToast('Action failed', 'error');
    }
  }

  const TABS = ['pending', 'verified', 'rejected'];

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontFamily: font.heading, fontSize: '1.6rem', fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
          Verification Queue
        </h2>
        <p style={{ fontFamily: font.body, fontSize: '0.9rem', color: C.muted, margin: 0 }}>
          Review and approve vehicle registrations.
        </p>
      </div>

      {/* Stats */}
      {stats && <StatsRow stats={stats} />}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', backgroundColor: C.navy, borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            fontFamily: font.body, fontSize: '0.88rem', fontWeight: 600,
            backgroundColor: tab === t ? C.slate : 'transparent',
            color: tab === t ? C.text : C.muted,
            textTransform: 'capitalize',
            transition: 'background 0.2s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p style={{ fontFamily: font.body, color: C.muted, fontSize: '0.9rem' }}>Loading…</p>
      ) : vehicles.length === 0 ? (
        <div style={{ backgroundColor: C.slate, border: `2px dashed ${C.border}`, borderRadius: '14px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontFamily: font.body, color: C.muted, margin: 0 }}>No {tab} vehicles.</p>
        </div>
      ) : (
        vehicles.map(v => (
          <VehicleRow key={v._id} vehicle={v} onAction={handleAction} onView={setLightbox} />
        ))
      )}

      {/* Lightbox */}
      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}

      {/* Toast */}
      {toast && (
        <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
