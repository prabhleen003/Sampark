import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import QRCard from '../components/QRCard';

const C = {
  bg:            '#0A0F2C',
  card:          '#0D1438',
  border:        'rgba(148,163,184,0.12)',
  teal:          '#00E5A0',
  blue:          '#4F46E5',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  danger:        '#FF3B5C',
  mono:          "'JetBrains Mono', monospace",
};

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman & Nicobar Islands', 'Chandigarh', 'Dadra & Nagar Haveli and Daman & Diu',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px', borderRadius: '10px',
  border: `1px solid rgba(148,163,184,0.2)`,
  backgroundColor: 'rgba(255,255,255,0.05)',
  color: C.textPrimary, fontSize: '0.9rem',
  outline: 'none', fontFamily: 'Inter, sans-serif',
};

const labelStyle = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: C.textSecondary, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
};

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function OrderCard() {
  const { vehicleId } = useParams();
  const navigate      = useNavigate();

  const [cardData, setCardData]     = useState(null);
  const [loadingCard, setLoadingCard] = useState(true);
  const [cardError, setCardError]   = useState('');
  const [step, setStep]             = useState('form'); // 'form' | 'done'
  const [doneOrder, setDoneOrder]   = useState(null);
  const [paying, setPaying]         = useState(false);
  const [formError, setFormError]   = useState('');

  const [deliveryType, setDeliveryType] = useState('standard');
  const [address, setAddress] = useState({
    name: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '',
  });

  useEffect(() => {
    api.get(`/vehicles/${vehicleId}/qr-card`)
      .then(r => setCardData(r.data))
      .catch(err => setCardError(err.response?.data?.message || 'No active QR for this vehicle.'))
      .finally(() => setLoadingCard(false));
  }, [vehicleId]);

  function setField(field, value) {
    setAddress(prev => ({ ...prev, [field]: value }));
  }

  async function handleOrder() {
    setFormError('');
    // Basic client-side validation
    const { name, line1, city, state, pincode, phone } = address;
    if (!name.trim() || !line1.trim() || !city.trim() || !state) {
      setFormError('Please fill in all required fields.'); return;
    }
    if (!/^\d{6}$/.test(pincode)) {
      setFormError('Pincode must be exactly 6 digits.'); return;
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setFormError('Enter a valid 10-digit Indian mobile number.'); return;
    }

    setPaying(true);
    try {
      const { data } = await api.post('/orders/create', {
        vehicle_id: vehicleId,
        type: deliveryType,
        delivery_address: address,
      });
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
              const { data: vData } = await api.post('/orders/verify', {
                txnid:       txn.txnid,
                mihpayid:    txn.mihpayid,
                status:      txn.status,
                hash:        txn.hash,
                amount:      txn.amount,
                productinfo: txn.productinfo,
                firstname:   txn.firstname,
                email:       txn.email,
              });
              setDoneOrder({ id: vData.order_id, city: address.city, pincode: address.pincode, type: deliveryType });
              setStep('done');
            } catch {
              setFormError('Payment received but verification failed. Please contact support.');
            }
          } else {
            setFormError('Payment was not completed. You can try again anytime.');
          }
          setPaying(false);
        },
        catchException: () => {
          setPaying(false);
        },
      });
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to create order');
      setPaying(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingCard) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.textSecondary, fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  if (cardError) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px', padding: '0 1rem' }}>
          <p style={{ color: C.danger, fontSize: '0.9rem', marginBottom: '16px' }}>{cardError}</p>
          <button onClick={() => navigate('/dashboard')} style={{ color: C.teal, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (step === 'done') {
    const estDays = doneOrder.type === 'express' ? '3–5' : '7–10';
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div style={{ maxWidth: '360px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
          <h2 style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1.3rem', margin: '0 0 8px' }}>Your Sampark card is on its way!</h2>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            Delivering to {doneOrder.city} — {doneOrder.pincode}.<br />
            Estimated delivery: <strong style={{ color: C.textPrimary }}>{estDays} business days</strong>.<br />
            We'll update the status as your card ships.
          </p>
          <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '1.5rem', textAlign: 'left' }}>
            <p style={{ color: C.textSecondary, fontSize: '0.75rem', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Order ID</p>
            <p style={{ color: C.textPrimary, fontSize: '0.82rem', fontFamily: C.mono, margin: 0, wordBreak: 'break-all' }}>{doneOrder.id}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', backgroundColor: C.teal, color: '#0A0F2C', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const price = deliveryType === 'express' ? 199 : 99;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* Back */}
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: C.textSecondary, fontSize: '0.9rem', cursor: 'pointer', padding: 0, marginBottom: '1.5rem' }}>
          ← Back to Dashboard
        </button>

        <h1 style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1.4rem', margin: '0 0 4px' }}>Order Physical Card</h1>
        <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
          We'll print and ship your Sampark QR card to your door.
        </p>

        {/* QR Card preview */}
        <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p style={{ color: C.textSecondary, fontSize: '0.78rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Card Preview</p>
          <div style={{ transform: 'scale(0.55)', transformOrigin: 'top center', marginBottom: 'calc(53.98mm * -0.45)' }}>
            <QRCard
              qrImage={cardData.qr_image}
              plateNumber={cardData.plate_number}
              validUntil={cardData.valid_until}
              cardCode={cardData.card_code}
            />
          </div>
        </div>

        {/* Delivery type */}
        <p style={{ ...labelStyle, marginBottom: '10px' }}>Delivery Option</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
          {[
            { value: 'standard', label: 'Standard', price: '₹99', days: '7–10 days' },
            { value: 'express',  label: 'Express',  price: '₹199', days: '3–5 days' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setDeliveryType(opt.value)}
              style={{
                flex: 1, padding: '14px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                border: `1px solid ${deliveryType === opt.value ? C.teal : 'rgba(148,163,184,0.2)'}`,
                backgroundColor: deliveryType === opt.value ? 'rgba(0,229,160,0.08)' : 'rgba(255,255,255,0.03)',
              }}
            >
              <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9rem', color: deliveryType === opt.value ? C.teal : C.textPrimary }}>{opt.label} {opt.price}</p>
              <p style={{ margin: 0, fontSize: '0.78rem', color: C.textSecondary }}>{opt.days}</p>
            </button>
          ))}
        </div>

        {/* Address form */}
        <div style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ color: C.textPrimary, fontWeight: 600, fontSize: '0.9rem', margin: '0 0 1rem' }}>Delivery Address</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Full Name *</label>
              <input value={address.name} onChange={e => setField('name', e.target.value)} placeholder="As on your ID" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Address Line 1 *</label>
              <input value={address.line1} onChange={e => setField('line1', e.target.value)} placeholder="House/Flat No., Street" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Address Line 2</label>
              <input value={address.line2} onChange={e => setField('line2', e.target.value)} placeholder="Landmark, Area (optional)" style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>City *</label>
                <input value={address.city} onChange={e => setField('city', e.target.value)} placeholder="Mumbai" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pincode *</label>
                <input value={address.pincode} onChange={e => setField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="400001" inputMode="numeric" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>State *</label>
              <select value={address.state} onChange={e => setField('state', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select state…</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Phone *</label>
              <input value={address.phone} onChange={e => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" inputMode="numeric" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Error */}
        {formError && (
          <div style={{ backgroundColor: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem' }}>
            <p style={{ color: C.danger, fontSize: '0.85rem', margin: 0 }}>{formError}</p>
          </div>
        )}

        {/* Pay button */}
        <button
          onClick={handleOrder}
          disabled={paying}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', backgroundColor: paying ? 'rgba(79,70,229,0.5)' : C.blue, color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: paying ? 'not-allowed' : 'pointer' }}
        >
          {paying ? 'Opening payment…' : `Pay ₹${price} & Order`}
        </button>

        <p style={{ color: C.textSecondary, fontSize: '0.78rem', textAlign: 'center', marginTop: '10px' }}>
          Secured by PayU. Your card will be printed and shipped within 1–2 business days.
        </p>
      </div>
    </div>
  );
}
