import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import api from '../api/axios';

const C = {
  teal: '#00E5A0',
  danger: '#FF3B5C',
};

const ABUSE_REASONS = [
  { value: 'harassment',  label: 'Harassment' },
  { value: 'spam',        label: 'Spam' },
  { value: 'threatening', label: 'Threatening' },
  { value: 'other',       label: 'Other' },
];

function relativeTime(dateStr) {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isActivePayment(payment) {
  return payment?.status === 'paid' && new Date(payment.valid_until) > new Date();
}

// ── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ vehicle, onClose }) {
  const [qrData, setQrData]     = useState(null);
  const [loading, setLoading]   = useState(true);
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
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Your QR Code</h3>
        <p style={{ margin: '0 0 1.25rem', fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#374151', letterSpacing: '0.05em' }}>{vehicle.plate_number}</p>

        {loading && (
          <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Loading…</p>
          </div>
        )}
        {!loading && !qrData && <p style={{ color: C.danger, fontSize: '0.88rem' }}>Failed to load QR code.</p>}
        {!loading && qrData?.qr_image_url && (
          <>
            <img src={qrData.qr_image_url} alt={`QR for ${vehicle.plate_number}`} style={{ width: '220px', height: '220px', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: '10px 0 16px' }}>Scan to contact vehicle owner securely</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={download} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: '#0A0F2C', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                Download PNG
              </button>
              <button onClick={copyLink} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                {copyLabel}
              </button>
            </div>
          </>
        )}
        <button onClick={onClose} style={{ marginTop: '14px', width: '100%', padding: '9px', border: 'none', backgroundColor: 'transparent', color: '#9CA3AF', fontSize: '0.85rem', cursor: 'pointer' }}>
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
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', maxWidth: '360px', width: '100%' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Payment Receipt</h3>
        <p style={{ margin: '0 0 1.5rem', fontFamily: 'monospace', fontSize: '0.9rem', color: '#374151' }}>{vehicle.plate_number}</p>

        {[
          ['Transaction ID', payment.razorpay_payment_id || '—'],
          ['Amount Paid',    `₹${(payment.amount / 100).toFixed(0)}`],
          ['Date',           formatDate(payment.valid_from)],
          ['Valid Until',    formatDate(payment.valid_until)],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '0.85rem', color: '#6B7280' }}>{label}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', fontFamily: label === 'Transaction ID' ? 'monospace' : 'inherit', wordBreak: 'break-all', maxWidth: '55%', textAlign: 'right' }}>{value}</span>
          </div>
        ))}

        <button onClick={onClose} style={{ marginTop: '1.25rem', width: '100%', padding: '10px', border: 'none', backgroundColor: '#F3F4F6', borderRadius: '8px', color: '#374151', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Activity Modal ─────────────────────────────────────────────────────────────
function ActivityModal({ vehicle, onClose }) {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [reporting, setReporting] = useState(null);
  const [reason, setReason]     = useState('harassment');
  const [toast, setToast]       = useState('');

  useEffect(() => {
    api.get(`/vehicles/${vehicle._id}/call-logs`)
      .then(r => setLogs(r.data.logs || []))
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

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', padding: '1.5rem', width: '100%', maxWidth: '520px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: '#E5E7EB', margin: '0 auto 1.25rem' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Recent Activity</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#6B7280', fontFamily: 'monospace' }}>{vehicle.plate_number}</p>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', color: '#9CA3AF', fontSize: '1.3rem', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {toast && (
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px' }}>
            <p style={{ color: '#166534', fontSize: '0.85rem', margin: 0 }}>{toast}</p>
          </div>
        )}

        {loading && <p style={{ color: '#9CA3AF', fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>Loading…</p>}

        {!loading && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📭</p>
            <p style={{ color: '#9CA3AF', fontSize: '0.88rem', margin: 0 }}>No activity yet.</p>
            <p style={{ color: '#D1D5DB', fontSize: '0.8rem', margin: '4px 0 0' }}>Calls and messages will appear here.</p>
          </div>
        )}

        {!loading && logs.map(log => (
          <div key={log._id}>
            {reporting === log._id ? (
              <div style={{ border: '1px solid #FCA5A5', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px', backgroundColor: '#FEF2F2' }}>
                <p style={{ color: '#991B1B', fontWeight: 600, fontSize: '0.85rem', margin: '0 0 8px' }}>Report this interaction?</p>
                <select value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #FCA5A5', marginBottom: '8px', fontSize: '0.85rem', color: '#374151' }}>
                  {ABUSE_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setReporting(null)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #D1D5DB', backgroundColor: '#fff', color: '#374151', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                  <button onClick={() => submitReport(log._id)} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: '#EF4444', color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }}>Submit Report</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, backgroundColor: log.type === 'call' ? '#EEF2FF' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                  {log.type === 'call' ? '📞' : '💬'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#111827', textTransform: 'capitalize' }}>
                      {log.type}
                      {log.type === 'call' && log.status && <span style={{ marginLeft: '6px', fontWeight: 400, fontSize: '0.78rem', color: '#9CA3AF' }}>— {log.status}</span>}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF', flexShrink: 0, marginLeft: '8px' }}>{relativeTime(log.created_at)}</span>
                  </div>
                  {log.type === 'call' && log.duration_seconds != null && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280' }}>Duration: {log.duration_seconds}s</p>}
                  {log.type === 'message' && (log.custom_text || log.template_id) && <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.custom_text || `Template #${log.template_id}`}</p>}
                </div>
                <button onClick={() => { setReporting(log._id); setReason('harassment'); }} title="Report as abusive" style={{ border: 'none', background: 'none', color: '#D1D5DB', fontSize: '0.95rem', cursor: 'pointer', padding: '4px', flexShrink: 0, lineHeight: 1 }}>🚩</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vehicle Card ──────────────────────────────────────────────────────────────
function VehicleCard({ vehicle, payment, onViewQR, onViewActivity, onViewReceipt, onPay, paying }) {
  const isRejected = vehicle.status === 'rejected';
  const isVerified = vehicle.status === 'verified';
  const active     = isVerified && isActivePayment(payment);
  const expired    = isVerified && payment?.status === 'paid' && !isActivePayment(payment);

  // Badge config
  let badge;
  if (active)          badge = { label: 'Active',    bg: '#ECFDF5', color: '#065F46', border: '#6EE7B7' };
  else if (expired)    badge = { label: 'Expired',   bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' };
  else if (isVerified) badge = { label: 'Approved',  bg: '#F0FDF4', color: '#166534', border: '#86EFAC' };
  else if (isRejected) badge = { label: 'Rejected',  bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' };
  else                 badge = { label: 'Pending',   bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' };

  const hasDocsSection = isRejected || isVerified;

  return (
    <div style={{
      backgroundColor: '#fff',
      border: `1px solid ${isRejected ? '#FCA5A5' : '#E5E7EB'}`,
      borderLeft: isRejected ? '4px solid #EF4444' : '1px solid #E5E7EB',
      borderRadius: '12px', padding: '1.2rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>
          {vehicle.plate_number}
        </span>
        <span style={{ backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: '999px', padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600 }}>
          {badge.label}
        </span>
      </div>

      {/* Expiry for active */}
      {active && payment?.valid_until && (
        <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '-4px 0 12px' }}>
          Valid until {formatDate(payment.valid_until)}
        </p>
      )}

      {/* Rejection reason */}
      {isRejected && vehicle.rejection_reason && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
          <p style={{ color: '#991B1B', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 2px' }}>Rejection reason:</p>
          <p style={{ color: '#DC2626', fontSize: '0.82rem', margin: 0 }}>{vehicle.rejection_reason}</p>
        </div>
      )}

      {/* Document thumbnails */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: hasDocsSection ? '14px' : 0 }}>
        {[['RC', vehicle.rc_doc_url], ['DL', vehicle.dl_doc_url], ['Plate', vehicle.plate_photo_url]].map(([label, url]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>{label}</p>
            {url?.endsWith('.pdf') ? (
              <a href={`http://localhost:5000${url}`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px', fontSize: '0.78rem', color: '#4338CA', fontWeight: 600, textDecoration: 'none' }}>
                PDF
              </a>
            ) : (
              <img src={`http://localhost:5000${url}`} alt={label} style={{ height: '56px', width: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
            )}
          </div>
        ))}
      </div>

      {/* CTAs */}
      {active && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <button onClick={() => onViewQR(vehicle)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: '#0A0F2C', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
              View QR Code
            </button>
            <button onClick={() => onViewActivity(vehicle)} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Activity
            </button>
          </div>
          <button onClick={() => onViewReceipt(vehicle)} style={{ width: '100%', padding: '7px', border: 'none', backgroundColor: 'transparent', color: '#9CA3AF', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
            View Receipt
          </button>
        </>
      )}

      {/* Approved but unpaid */}
      {isVerified && !active && !expired && (
        <button
          onClick={() => onPay(vehicle)}
          disabled={paying === vehicle._id}
          style={{
            width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
            backgroundColor: paying === vehicle._id ? '#A5B4FC' : '#4F46E5',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            cursor: paying === vehicle._id ? 'not-allowed' : 'pointer',
          }}
        >
          {paying === vehicle._id ? 'Opening payment…' : 'Pay ₹499 & Get QR'}
        </button>
      )}

      {/* Expired */}
      {expired && (
        <button
          onClick={() => onPay(vehicle)}
          disabled={paying === vehicle._id}
          style={{
            width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
            backgroundColor: paying === vehicle._id ? '#FCA5A5' : '#EF4444',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            cursor: paying === vehicle._id ? 'not-allowed' : 'pointer',
          }}
        >
          {paying === vehicle._id ? 'Opening payment…' : 'Renew ₹499'}
        </button>
      )}

      {/* Rejected */}
      {isRejected && (
        <Link to={`/vehicles/resubmit/${vehicle._id}`} style={{ display: 'block', textAlign: 'center', backgroundColor: '#4F46E5', color: '#fff', borderRadius: '8px', padding: '10px', fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none' }}>
          Re-upload Documents →
        </Link>
      )}
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [user, setUser]           = useState(null);
  const [vehicles, setVehicles]   = useState([]);
  const [paymentMap, setPaymentMap] = useState({}); // vehicleId → payment
  const [qrVehicle, setQrVehicle] = useState(null);
  const [actVehicle, setActVehicle] = useState(null);
  const [receiptData, setReceiptData] = useState(null); // { vehicle, payment }
  const [paying, setPaying]       = useState(null); // vehicleId being paid
  const [payErr, setPayErr]       = useState('');
  const navigate  = useNavigate();
  const cardsRef  = useRef(null);

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
    Promise.all([api.get('/users/me'), api.get('/vehicles')])
      .then(([userRes, vehiclesRes]) => {
        const u = userRes.data.user;
        if (!u.profile_complete) { navigate('/profile-setup'); return; }
        const list = vehiclesRes.data.vehicles;
        setUser(u);
        setVehicles(list);
        loadPayments(list);
      })
      .catch(() => { localStorage.removeItem('token'); navigate('/login'); });
  }, [navigate, loadPayments]);

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

      const options = {
        key:         data.key_id,
        amount:      data.amount,
        currency:    data.currency,
        order_id:    data.order_id,
        name:        'Sampaark',
        description: 'Sampark QR Card — 1 Year',
        handler: async (resp) => {
          try {
            await api.post('/payments/verify', {
              razorpay_order_id:   resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature:  resp.razorpay_signature,
              vehicle_id: vehicle._id,
            });
            // Reload payment statuses after successful payment
            const { data: vData } = await api.get('/vehicles');
            setVehicles(vData.vehicles);
            await loadPayments(vData.vehicles);
          } catch {
            setPayErr('Payment received but verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: () => { setPayErr('Payment cancelled. You can try again anytime.'); setPaying(null); },
        },
        prefill: { contact: `+91${user.phone_hash}` },
        theme:   { color: '#00E5A0' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setPayErr(err.response?.data?.message || err.message || 'Failed to initiate payment');
      setPaying(null);
    } finally {
      // Only clear paying state after popup is shown (not on cancel — ondismiss handles that)
    }
  }

  function handleViewReceipt(vehicle) {
    const payment = paymentMap[vehicle._id];
    if (payment) setReceiptData({ vehicle, payment });
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  const canAddMore = vehicles.filter(v => v.status !== 'rejected').length < 2;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>Hey, {user.name} 👋</h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '2px' }}>+91 {user.phone_hash}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ border: '1px solid #4F46E5', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, color: '#4F46E5', backgroundColor: '#EEF2FF', textDecoration: 'none' }}>
                Admin
              </Link>
            )}
            <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
              style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 500, color: '#374151', backgroundColor: '#fff', cursor: 'pointer' }}>
              Log out
            </button>
          </div>
        </div>

        {/* Payment error toast */}
        {payErr && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem' }}>
            <p style={{ color: '#DC2626', fontSize: '0.85rem', margin: 0 }}>{payErr}</p>
          </div>
        )}

        {/* Vehicles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', margin: 0 }}>Your Vehicles</h2>
          {canAddMore && (
            <Link to="/vehicles/register" style={{ backgroundColor: '#4F46E5', color: '#fff', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              + Add Vehicle
            </Link>
          )}
        </div>

        {vehicles.length === 0 ? (
          <div style={{ backgroundColor: '#fff', border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>No vehicles registered yet.</p>
            <Link to="/vehicles/register" style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.9rem', color: '#4F46E5', fontWeight: 600 }}>
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
              />
            ))}
          </div>
        )}
      </div>

      {qrVehicle   && <QRModal       vehicle={qrVehicle}  onClose={() => setQrVehicle(null)}  />}
      {actVehicle  && <ActivityModal vehicle={actVehicle} onClose={() => setActVehicle(null)} />}
      {receiptData && <ReceiptModal  vehicle={receiptData.vehicle} payment={receiptData.payment} onClose={() => setReceiptData(null)} />}
    </div>
  );
}
