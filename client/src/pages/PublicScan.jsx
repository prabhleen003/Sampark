import { useEffect, useRef, useState } from 'react';
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

const FALLBACK_TEMPLATES = [
  'Please move your vehicle — it\'s blocking mine',
  'Your car lights are on',
  'Urgent — please call back',
  'Your car is being towed',
];

const URGENCY_CONFIG = {
  normal:    { label: 'Normal',    bg: 'rgba(0,229,160,0.12)',  color: '#00E5A0', border: 'rgba(0,229,160,0.3)' },
  urgent:    { label: 'Urgent',    bg: 'rgba(251,146,60,0.12)', color: '#FB923C', border: 'rgba(251,146,60,0.3)' },
  emergency: { label: 'Emergency', bg: 'rgba(255,59,92,0.12)',  color: '#FF3B5C', border: 'rgba(255,59,92,0.3)' },
};

// ── Call Panel ────────────────────────────────────────────────────────────────
function CallPanel({ vehicleId, sig, onClose }) {
  // step: 'phone' | 'ringing' | 'connected' | 'fallback' | 'sent' | 'expired'
  const [step, setStep]           = useState('phone');
  const [phone, setPhone]         = useState('');
  const [phoneErr, setPhoneErr]   = useState('');
  const [callErr, setCallErr]     = useState('');
  const [callLogId, setCallLogId] = useState(null);
  const [fallbackToken, setFallbackToken] = useState(null);
  const [urgency, setUrgency]     = useState('urgent');
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [customMsg, setCustomMsg] = useState('');
  const [sending, setSending]     = useState(false);
  const [sendErr, setSendErr]     = useState('');
  const pollRef = useRef(null);
  const pollCount = useRef(0);

  // Stop polling on unmount
  useEffect(() => () => clearInterval(pollRef.current), []);

  function startPolling(logId) {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      // Stop after 60 seconds (12 polls × 5s)
      if (pollCount.current > 12) {
        clearInterval(pollRef.current);
        setStep('phone');
        setCallErr('Call timed out. Please try again.');
        return;
      }
      try {
        const r = await fetch(`${API_BASE}/v/${vehicleId}/call-status/${logId}`);
        const data = await r.json();
        if (!data.success) return;
        const s = data.status;
        if (s === 'completed') {
          clearInterval(pollRef.current);
          setStep('connected');
        } else if (['no-answer', 'busy', 'failed'].includes(s)) {
          clearInterval(pollRef.current);
          if (data.fallback_token) {
            setFallbackToken(data.fallback_token);
            setStep('fallback');
          } else {
            setStep('phone');
            setCallErr('Call didn\'t go through. Please try again.');
          }
        }
        // 'ringing' / 'initiated' → keep polling
      } catch {
        // network blip — keep polling
      }
    }, 5000);
  }

  function handleCall() {
    if (!PHONE_RE.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian number'); return; }
    setPhoneErr('');
    setCallErr('');
    setStep('ringing');

    fetch(`${API_BASE}/v/${vehicleId}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sig, caller_phone: phone }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.call_log_id) {
          setCallLogId(data.call_log_id);
          startPolling(data.call_log_id);
        } else {
          setCallErr(data.message || 'Call failed');
          setStep('phone');
        }
      })
      .catch(() => { setCallErr('Network error. Please try again.'); setStep('phone'); });
  }

  async function handleSendFallback() {
    const message = selectedTpl !== null ? FALLBACK_TEMPLATES[selectedTpl] : customMsg.trim();
    if (!message) { setSendErr('Please select or type a message.'); return; }
    setSendErr('');
    setSending(true);
    try {
      const r = await fetch(`${API_BASE}/v/${vehicleId}/fallback-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fallback_token: fallbackToken, message, urgency }),
      });
      const data = await r.json();
      if (data.success) {
        setStep('sent');
      } else if (r.status === 410) {
        setStep('expired');
      } else {
        setSendErr(data.message || 'Failed to send. Please try again.');
      }
    } catch {
      setSendErr('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <BottomSheet onClose={step === 'ringing' ? undefined : onClose}>

      {/* Phone entry */}
      {step === 'phone' && (
        <>
          <h3 style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Your phone number</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Your number is used only to connect the call. It will not be shared with the vehicle owner.
          </p>
          <input
            type="tel" inputMode="numeric" maxLength={10}
            value={phone}
            onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneErr(''); setCallErr(''); }}
            placeholder="10-digit mobile number"
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '10px', border: `1px solid ${phoneErr ? C.danger : C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontSize: '1rem', outline: 'none', marginBottom: '6px' }}
          />
          {phoneErr && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{phoneErr}</p>}
          {callErr  && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{callErr}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={onClose} style={outlineBtn}>Cancel</button>
            <button onClick={handleCall} disabled={phone.length !== 10} style={btnStyle(C.blue, '#fff', phone.length !== 10)}>
              Connect Call
            </button>
          </div>
        </>
      )}

      {/* Ringing — polling */}
      {step === 'ringing' && (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>📲</div>
          <p style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Calling vehicle owner…</p>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: 0 }}>Please wait — checking if they pick up</p>
        </div>
      )}

      {/* Connected */}
      {step === 'connected' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
          <p style={{ color: C.teal, fontWeight: 700, fontSize: '1.1rem', margin: '0 0 6px' }}>Call connected!</p>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
            You can close this page.
          </p>
          <button onClick={onClose} style={btnStyle(C.blue, '#fff')}>Done</button>
        </div>
      )}

      {/* Fallback message form */}
      {step === 'fallback' && (
        <>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📵</div>
            <p style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>Owner didn't answer</p>
            <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: 0 }}>Leave them a message instead?</p>
          </div>

          {/* Urgency chips */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
            {Object.entries(URGENCY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setUrgency(key)}
                style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: `1px solid ${urgency === key ? cfg.border : C.border}`, backgroundColor: urgency === key ? cfg.bg : 'transparent', color: urgency === key ? cfg.color : C.textSecondary, fontWeight: urgency === key ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Template quick picks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
            {FALLBACK_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                onClick={() => { setSelectedTpl(selectedTpl === i ? null : i); setCustomMsg(''); }}
                style={{ padding: '10px 12px', borderRadius: '10px', textAlign: 'left', border: `1px solid ${selectedTpl === i ? C.teal : C.border}`, backgroundColor: selectedTpl === i ? 'rgba(0,229,160,0.1)' : 'rgba(255,255,255,0.04)', color: selectedTpl === i ? C.teal : C.textPrimary, fontWeight: 500, fontSize: '0.88rem', cursor: 'pointer' }}
              >
                {tpl}
              </button>
            ))}
          </div>

          {/* Custom text */}
          <textarea
            rows={3} maxLength={300}
            value={customMsg}
            onChange={e => { setCustomMsg(e.target.value); if (e.target.value) setSelectedTpl(null); }}
            placeholder="Or type a custom message…"
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontSize: '0.9rem', resize: 'none', outline: 'none', marginBottom: '4px' }}
          />
          <p style={{ color: C.textSecondary, fontSize: '0.75rem', textAlign: 'right', margin: '0 0 10px' }}>{customMsg.length}/300</p>

          {sendErr && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{sendErr}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={outlineBtn}>Cancel</button>
            <button
              onClick={handleSendFallback}
              disabled={sending || (selectedTpl === null && !customMsg.trim())}
              style={btnStyle(C.teal, '#0A0F2C', sending || (selectedTpl === null && !customMsg.trim()))}
            >
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </>
      )}

      {/* Sent confirmation */}
      {step === 'sent' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✓</div>
          <p style={{ color: C.teal, fontWeight: 700, fontSize: '1.1rem', margin: '0 0 8px' }}>Message delivered!</p>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 6px', lineHeight: 1.6 }}>
            The vehicle owner will see it when they check their Sampaark dashboard.
          </p>
          {urgency === 'emergency' && (
            <p style={{ color: '#FF3B5C', fontSize: '0.82rem', fontWeight: 600, margin: '0 0 1.5rem' }}>
              Emergency contacts have also been notified.
            </p>
          )}
          {urgency !== 'emergency' && <div style={{ marginBottom: '1.5rem' }} />}
          <button onClick={onClose} style={btnStyle(C.teal, '#0A0F2C')}>Done</button>
        </div>
      )}

      {/* Token expired */}
      {step === 'expired' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏱️</div>
          <p style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 8px' }}>Message window has expired</p>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            Please scan the QR again to try calling or messaging.
          </p>
          <button onClick={onClose} style={btnStyle(C.blue, '#fff')}>Close</button>
        </div>
      )}

    </BottomSheet>
  );
}

// ── Emergency Panel ───────────────────────────────────────────────────────────
const EMERGENCY_TYPES = [
  'Accident',
  'Vehicle being towed',
  'Break-in attempt',
  'Medical emergency near vehicle',
  'Other',
];

const STAGE_LABELS = {
  calling_owner:     'Calling vehicle owner…',
  calling_contact_1: "Owner didn't answer. Calling emergency contact 1…",
  calling_contact_2: "Contact 1 didn't answer. Calling emergency contact 2…",
  calling_contact_3: "Contact 2 didn't answer. Calling emergency contact 3…",
  connected:         'Connected!',
  all_failed:        'Could not reach anyone.',
};

function EmergencyPanel({ vehicleId, sig, onClose }) {
  // step: 'type' | 'phone' | 'chain'
  const [step, setStep]           = useState('type');
  const [emergType, setEmergType] = useState(null);
  const [phone, setPhone]         = useState('');
  const [phoneErr, setPhoneErr]   = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [stage, setStage]         = useState('calling_owner');
  const [connectedTo, setConnectedTo] = useState(null);
  const pollRef  = useRef(null);
  const pollCount = useRef(0);

  useEffect(() => () => clearInterval(pollRef.current), []);

  function startPolling(sid) {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current > 40) { clearInterval(pollRef.current); return; } // 120s max
      try {
        const r = await fetch(`${API_BASE}/v/${vehicleId}/emergency-status/${sid}`);
        const data = await r.json();
        if (!data.success) return;
        setStage(data.stage);
        if (data.connected_to) setConnectedTo(data.connected_to);
        if (data.stage === 'connected' || data.stage === 'all_failed') {
          clearInterval(pollRef.current);
        }
      } catch { /* network blip */ }
    }, 3000);
  }

  async function handleSubmit() {
    if (!PHONE_RE.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian number'); return; }
    setPhoneErr(''); setSubmitErr('');
    try {
      const r = await fetch(`${API_BASE}/v/${vehicleId}/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sig, caller_phone: phone, description: emergType }),
      });
      const data = await r.json();
      if (data.success && data.emergency_session_id) {
        setSessionId(data.emergency_session_id);
        setStep('chain');
        startPolling(data.emergency_session_id);
      } else {
        setSubmitErr(data.message || 'Failed to initiate emergency call');
      }
    } catch { setSubmitErr('Network error. Please try again.'); }
  }

  const canClose = step !== 'chain' || stage === 'connected' || stage === 'all_failed';

  return (
    <BottomSheet onClose={canClose ? onClose : undefined}>

      {/* Step: Choose type */}
      {step === 'type' && (
        <>
          <h3 style={{ color: '#EF4444', fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>🚨 Emergency</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem' }}>What's happening?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
            {EMERGENCY_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setEmergType(emergType === t ? null : t)}
                style={{ padding: '12px 14px', borderRadius: '10px', textAlign: 'left', border: `1px solid ${emergType === t ? '#EF4444' : C.border}`, backgroundColor: emergType === t ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', color: emergType === t ? '#EF4444' : C.textPrimary, fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' }}
              >
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={outlineBtn}>Cancel</button>
            <button onClick={() => setStep('phone')} disabled={!emergType} style={btnStyle('#EF4444', '#fff', !emergType)}>
              Next →
            </button>
          </div>
        </>
      )}

      {/* Step: Phone entry */}
      {step === 'phone' && (
        <>
          <h3 style={{ color: '#EF4444', fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>🚨 {emergType}</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Your number is needed to connect the call to the vehicle owner and emergency contacts.
          </p>
          <input
            type="tel" inputMode="numeric" maxLength={10}
            value={phone}
            onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneErr(''); }}
            placeholder="10-digit mobile number"
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '10px', border: `1px solid ${phoneErr ? '#EF4444' : C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontSize: '1rem', outline: 'none', marginBottom: '6px' }}
          />
          {phoneErr  && <p style={{ color: '#EF4444', fontSize: '0.8rem', margin: '0 0 8px' }}>{phoneErr}</p>}
          {submitErr && <p style={{ color: '#EF4444', fontSize: '0.8rem', margin: '0 0 8px' }}>{submitErr}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={() => setStep('type')} style={outlineBtn}>Back</button>
            <button onClick={handleSubmit} disabled={phone.length !== 10} style={btnStyle('#EF4444', '#fff', phone.length !== 10)}>
              🚨 Call Now
            </button>
          </div>
        </>
      )}

      {/* Step: Chain status */}
      {step === 'chain' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          {stage === 'connected' ? (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
              <p style={{ color: C.teal, fontWeight: 700, fontSize: '1.1rem', margin: '0 0 6px' }}>Connected!</p>
              <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
                {connectedTo === 'owner' ? 'The vehicle owner has answered.' : 'An emergency contact has answered.'}
              </p>
              <button onClick={onClose} style={btnStyle(C.teal, '#0A0F2C')}>Done</button>
            </>
          ) : stage === 'all_failed' ? (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📵</div>
              <p style={{ color: '#EF4444', fontWeight: 700, fontSize: '1rem', margin: '0 0 8px' }}>No one answered</p>
              <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
                All contacts were attempted. Please call emergency services (112) if needed.
              </p>
              <button onClick={onClose} style={btnStyle('#EF4444', '#fff')}>Close</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🚨</div>
              <p style={{ color: '#EF4444', fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Emergency Alert Active</p>
              <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
                {STAGE_LABELS[stage] || 'Initiating emergency call chain…'}
              </p>
            </>
          )}
        </div>
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

  const [state, setState]          = useState('loading'); // 'loading' | 'ok' | 'error'
  const [vehicle, setVehicle]      = useState(null);
  const [templates, setTemplates]  = useState([]);
  const [showMsg, setShowMsg]      = useState(false);
  const [showCall, setShowCall]    = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [errMsg, setErrMsg]        = useState('');

  useEffect(() => {
    if (!sig) { setState('error'); setErrMsg('Invalid QR code — missing signature.'); return; }

    fetch(`${API_BASE}/v/${vehicleId}?sig=${encodeURIComponent(sig)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) throw new Error(data.message || 'Invalid QR');
        setVehicle(data.vehicle);
        if (data.expired) {
          setState('expired');
          return;
        }
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

  if (state === 'expired') {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', maxWidth: '320px', padding: '0 1rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>⏱️</div>
          <h2 style={{ color: C.textPrimary, fontWeight: 700, margin: '0 0 8px' }}>QR Expired</h2>
          {vehicle?.plate_number && (
            <span style={{ fontFamily: C.mono, display: 'block', fontSize: '1.2rem', fontWeight: 700, color: C.textPrimary, marginBottom: '10px' }}>
              {vehicle.plate_number}
            </span>
          )}
          <p style={{ color: C.textSecondary, fontSize: '0.9rem', margin: 0 }}>
            This Sampark QR has expired. The vehicle owner needs to renew their subscription.
          </p>
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
          sublabel="Calls owner + emergency contacts"
          color={C.danger}
          onClick={() => setShowEmergency(true)}
          disabled={false}
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

      {showEmergency && (
        <EmergencyPanel
          vehicleId={vehicleId}
          sig={sig}
          onClose={() => setShowEmergency(false)}
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
