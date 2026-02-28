import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api/v1';

const C = {
  bg: '#0A0F2C',
  card: '#0D1438',
  border: 'rgba(148,163,184,0.14)',
  teal: '#00E5A0',
  tealDark: '#00CC8E',
  blue: '#3B82F6',
  danger: '#FF3B5C',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  mono: 'JetBrains Mono, monospace',
};

const PHONE_RE = /^[6-9]\d{9}$/;

// ── Shared helpers ─────────────────────────────────────────────────────────────
function btnStyle(bg, color, disabled = false) {
  return {
    width: '100%', padding: '14px', borderRadius: '10px', border: 'none',
    backgroundColor: disabled ? 'rgba(148,163,184,0.2)' : bg,
    color: disabled ? '#94A3B8' : color,
    fontWeight: 700, fontSize: '0.95rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const outlineBtn = {
  flex: '0 0 80px', padding: '14px', borderRadius: '10px',
  border: `1px solid rgba(148,163,184,0.14)`, backgroundColor: 'transparent',
  color: '#94A3B8', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
};

function BottomSheet({ onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px', margin: '0 auto',
          backgroundColor: C.card,
          borderTopLeftRadius: '20px', borderTopRightRadius: '20px',
          border: `1px solid ${C.border}`,
          padding: '1.5rem 1.25rem',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: C.border, margin: '0 auto 1.25rem' }} />
        {children}
      </div>
    </div>
  );
}

// ── Call Panel ────────────────────────────────────────────────────────────────
function CallPanel({ vehicleId, sig, onClose }) {
  const [step, setStep]       = useState('phone'); // 'phone' | 'calling' | 'done'
  const [phone, setPhone]     = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [error, setError]     = useState('');

  function handleCall() {
    if (!PHONE_RE.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian number'); return; }
    setPhoneErr('');
    setError('');
    setStep('calling');

    fetch(`${API_BASE}/v/${vehicleId}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sig, caller_phone: phone }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setStep('done');
        else { setError(data.message || 'Call failed'); setStep('phone'); }
      })
      .catch(() => { setError('Network error. Please try again.'); setStep('phone'); });
  }

  return (
    <BottomSheet onClose={onClose}>
      {step === 'done' ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📞</div>
          <p style={{ color: C.teal, fontWeight: 700, fontSize: '1.1rem', margin: '0 0 6px' }}>Call initiated!</p>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 6px' }}>
            You'll receive a call shortly.
          </p>
          <p style={{ color: C.textSecondary, fontSize: '0.78rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
            The call will come from a virtual number — your real numbers stay private on both ends.
          </p>
          <button onClick={onClose} style={btnStyle(C.blue, '#fff')}>Done</button>
        </div>
      ) : step === 'calling' ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px', animation: 'pulse 1s infinite' }}>📲</div>
          <p style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Connecting your call…</p>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: 0 }}>Please wait a moment</p>
        </div>
      ) : (
        <>
          <h3 style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Your phone number</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Your number is used only to connect the call. It will not be shared with the vehicle owner.
          </p>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneErr(''); setError(''); }}
            placeholder="10-digit mobile number"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '14px', borderRadius: '10px',
              border: `1px solid ${phoneErr ? C.danger : C.border}`,
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: C.textPrimary, fontSize: '1rem',
              outline: 'none', marginBottom: '6px',
            }}
          />
          {phoneErr && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{phoneErr}</p>}
          {error && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={onClose} style={outlineBtn}>Cancel</button>
            <button
              onClick={handleCall}
              disabled={phone.length !== 10}
              style={btnStyle(C.blue, '#fff', phone.length !== 10)}
            >
              Connect Call
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

// ── Messaging Panel ───────────────────────────────────────────────────────────
function MessagePanel({ vehicleId, sig, templates, onClose }) {
  const [step, setStep]         = useState('pick'); // 'pick' | 'phone' | 'done'
  const [selected, setSelected] = useState(null);
  const [custom, setCustom]     = useState('');
  const [phone, setPhone]       = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');

  function handleSend() {
    if (!PHONE_RE.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian number'); return; }
    setPhoneErr('');
    setSending(true);

    fetch(`${API_BASE}/v/${vehicleId}/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sig,
        sender_phone: phone,
        template_id: selected || undefined,
        custom_text: custom.trim() || undefined,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) setStep('done');
        else setError(data.message || 'Failed to send message');
      })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setSending(false));
  }

  const canProceed = selected !== null || custom.trim().length > 0;

  return (
    <BottomSheet onClose={onClose}>
      {step === 'done' ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✓</div>
          <p style={{ color: C.teal, fontWeight: 700, fontSize: '1.1rem', margin: '0 0 6px' }}>Message sent!</p>
          <p style={{ color: C.textSecondary, fontSize: '0.88rem', margin: '0 0 1.5rem' }}>
            The vehicle owner has been notified.
          </p>
          <button onClick={onClose} style={btnStyle(C.teal, '#0A0F2C')}>Done</button>
        </div>
      ) : step === 'phone' ? (
        <>
          <h3 style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Your phone number</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem' }}>
            So the owner can call you back if needed. Not stored publicly.
          </p>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneErr(''); }}
            placeholder="10-digit mobile number"
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '14px', borderRadius: '10px',
              border: `1px solid ${phoneErr ? C.danger : C.border}`,
              backgroundColor: 'rgba(255,255,255,0.05)',
              color: C.textPrimary, fontSize: '1rem',
              outline: 'none', marginBottom: '6px',
            }}
          />
          {phoneErr && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 10px' }}>{phoneErr}</p>}
          {error && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 10px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={() => setStep('pick')} style={outlineBtn}>Back</button>
            <button onClick={handleSend} disabled={sending} style={btnStyle(C.teal, '#0A0F2C', sending)}>
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 1rem' }}>Choose a message</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(selected === t.id ? null : t.id)}
                style={{
                  padding: '12px 14px', borderRadius: '10px', textAlign: 'left',
                  border: `1px solid ${selected === t.id ? C.teal : C.border}`,
                  backgroundColor: selected === t.id ? 'rgba(0,229,160,0.1)' : 'rgba(255,255,255,0.04)',
                  color: selected === t.id ? C.teal : C.textPrimary,
                  fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {t.text}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <p style={{ color: C.textSecondary, fontSize: '0.8rem', margin: '0 0 6px' }}>Or write a custom message</p>
            <textarea
              rows={3}
              maxLength={200}
              value={custom}
              onChange={e => { setCustom(e.target.value); if (e.target.value) setSelected(null); }}
              placeholder="Type your message…"
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px', borderRadius: '10px',
                border: `1px solid ${C.border}`,
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: C.textPrimary, fontSize: '0.9rem',
                resize: 'none', outline: 'none',
              }}
            />
            <p style={{ color: C.textSecondary, fontSize: '0.75rem', textAlign: 'right', margin: '2px 0 0' }}>
              {custom.length}/200
            </p>
          </div>

          <button
            onClick={() => setStep('phone')}
            disabled={!canProceed}
            style={btnStyle(C.teal, '#0A0F2C', !canProceed)}
          >
            Next →
          </button>
        </>
      )}
    </BottomSheet>
  );
}

// ── Action Button ─────────────────────────────────────────────────────────────
function ActionBtn({ icon, label, sublabel, color, onClick, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        width: '100%', padding: '18px 20px',
        display: 'flex', alignItems: 'center', gap: '16px',
        borderRadius: '14px',
        border: `1px solid ${disabled ? C.border : color + '40'}`,
        backgroundColor: disabled ? 'rgba(255,255,255,0.03)' : color + '14',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{icon}</span>
      <div>
        <p style={{ margin: 0, color: disabled ? C.textSecondary : C.textPrimary, fontWeight: 700, fontSize: '1rem' }}>{label}</p>
        {sublabel && <p style={{ margin: '2px 0 0', color: C.textSecondary, fontSize: '0.78rem' }}>{sublabel}</p>}
      </div>
    </button>
  );
}

// ── Public Scan Page ──────────────────────────────────────────────────────────
export default function PublicScan() {
  const { vehicleId } = useParams();
  const [searchParams] = useSearchParams();
  const sig = searchParams.get('sig');

  const [state, setState]       = useState('loading'); // 'loading' | 'ok' | 'error'
  const [vehicle, setVehicle]   = useState(null);
  const [templates, setTemplates] = useState([]);
  const [showMsg, setShowMsg]   = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [errMsg, setErrMsg]     = useState('');

  useEffect(() => {
    if (!sig) { setState('error'); setErrMsg('Invalid QR code — missing signature.'); return; }

    fetch(`${API_BASE}/v/${vehicleId}?sig=${encodeURIComponent(sig)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) throw new Error(data.message || 'Invalid QR');
        setVehicle(data.vehicle);
        setState('ok');
        return fetch(`${API_BASE}/v/${vehicleId}/templates?sig=${encodeURIComponent(sig)}`);
      })
      .then(r => r?.json())
      .then(data => { if (data?.success) setTemplates(data.templates); })
      .catch(err => { setState('error'); setErrMsg(err.message || 'Invalid or expired QR code.'); });
  }, [vehicleId, sig]);

  if (state === 'loading') {
    return (
      <div style={pageStyle}>
        <p style={{ color: C.textSecondary, fontSize: '0.9rem' }}>Verifying QR code…</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', maxWidth: '320px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: C.textPrimary, fontWeight: 700, margin: '0 0 8px' }}>Invalid QR Code</h2>
          <p style={{ color: C.textSecondary, fontSize: '0.9rem', margin: 0 }}>{errMsg}</p>
        </div>
      </div>
    );
  }

  const isSilent      = vehicle.comm_mode === 'silent';
  const isMessageOnly = vehicle.comm_mode === 'message_only';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem 2rem' }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: '480px', paddingTop: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>
        <p style={{ color: C.teal, fontWeight: 700, fontSize: '0.82rem', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Sampaark — Secure Contact
        </p>
        <div style={{
          display: 'inline-block',
          padding: '10px 24px',
          borderRadius: '12px',
          border: `2px solid ${C.teal}30`,
          backgroundColor: `${C.teal}0A`,
          marginBottom: '16px',
        }}>
          <span style={{ fontFamily: C.mono, fontSize: '2rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '0.08em' }}>
            {vehicle.plate_number}
          </span>
        </div>
        <p style={{
          color: C.textSecondary, fontSize: '0.82rem', lineHeight: 1.6,
          margin: 0,
          border: `1px solid ${C.border}`,
          borderRadius: '8px', padding: '10px 14px',
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}>
          🔒 This is a secure, masked communication channel. Your personal information will not be shared with the vehicle owner.
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!isSilent && !isMessageOnly && (
          <ActionBtn
            icon="📞"
            label="Call"
            sublabel="Your number stays private"
            color={C.blue}
            onClick={() => setShowCall(true)}
            disabled={false}
          />
        )}

        <ActionBtn
          icon="💬"
          label="Message"
          sublabel="Send a quick note to the owner"
          color={C.teal}
          onClick={() => setShowMsg(true)}
          disabled={isSilent}
        />

        <ActionBtn
          icon="🚨"
          label="Emergency"
          sublabel="Coming soon"
          color={C.danger}
          disabled
        />
      </div>

      {isSilent && (
        <p style={{ color: C.textSecondary, fontSize: '0.8rem', marginTop: '1.5rem', textAlign: 'center' }}>
          This vehicle owner has enabled silent mode. Only emergency contact is available.
        </p>
      )}

      {showCall && (
        <CallPanel
          vehicleId={vehicleId}
          sig={sig}
          onClose={() => setShowCall(false)}
        />
      )}

      {showMsg && (
        <MessagePanel
          vehicleId={vehicleId}
          sig={sig}
          templates={templates}
          onClose={() => setShowMsg(false)}
        />
      )}
    </div>
  );
}

const pageStyle = {
  minHeight: '100vh',
  backgroundColor: C.bg,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
