import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

const C = {
  bg:            '#0A0F2C',
  card:          '#0D1438',
  border:        'rgba(148,163,184,0.14)',
  teal:          '#00E5A0',
  blue:          '#3B82F6',
  danger:        '#FF3B5C',
  amber:         '#F59E0B',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  mono:          'JetBrains Mono, monospace',
};

const PHONE_RE = /^[6-9]\d{9}$/;

// ── Haptic helper ──────────────────────────────────────────────────────────────
function buzz(pattern = 50) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ── Skeleton pulse ─────────────────────────────────────────────────────────────
function Skeleton({ width = '100%', height = '40px', radius = '10px', style: s = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeletonPulse 1.4s ease-in-out infinite',
      ...s,
    }} />
  );
}

// ── Bottom sheet ───────────────────────────────────────────────────────────────
function BottomSheet({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px', margin: '0 auto', backgroundColor: C.card, borderTopLeftRadius: '20px', borderTopRightRadius: '20px', border: `1px solid ${C.border}`, padding: '1.5rem 1.25rem', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', backgroundColor: C.border, margin: '0 auto 1.25rem' }} />
        {children}
      </div>
    </div>
  );
}

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

const FALLBACK_TEMPLATES = [
  "Please move your vehicle — it's blocking mine",
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
  const [step, setStep]     = useState('phone');
  const [phone, setPhone]   = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [callErr, setCallErr]   = useState('');
  const [fallbackToken, setFallbackToken] = useState(null);
  const [urgency, setUrgency]   = useState('urgent');
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [customMsg, setCustomMsg]   = useState('');
  const [sending, setSending]   = useState(false);
  const [sendErr, setSendErr]   = useState('');
  const pollRef = useRef(null);
  const pollCount = useRef(0);

  useEffect(() => () => clearInterval(pollRef.current), []);

  function startPolling(logId) {
    pollCount.current = 0;
    pollRef.current = setInterval(async () => {
      pollCount.current++;
      if (pollCount.current > 40) { clearInterval(pollRef.current); setStep('phone'); return; }
      try {
        const r = await fetch(`${API_BASE}/v/${vehicleId}/call-status/${logId}`);
        const data = await r.json();
        if (['completed', 'no-answer', 'busy', 'failed'].includes(data.status)) {
          clearInterval(pollRef.current);
          if (data.status === 'completed') { setStep('connected'); }
          else { setFallbackToken(data.fallback_token || null); setStep('fallback'); }
        }
      } catch {}
    }, 3000);
  }

  async function handleCall() {
    if (!PHONE_RE.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian number'); return; }
    setPhoneErr(''); setCallErr('');
    try {
      const r = await fetch(`${API_BASE}/v/${vehicleId}/call`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sig, caller_phone: phone }),
      });
      const data = await r.json();
      if (r.status === 403) { setStep('blocked'); return; }
      if (!data.success) { setCallErr(data.message || 'Failed to initiate call'); return; }
      setStep('ringing');
      startPolling(data.call_log_id);
    } catch { setCallErr('Network error. Please try again.'); }
  }

  async function handleFallbackSend() {
    const msg = selectedTpl !== null ? FALLBACK_TEMPLATES[selectedTpl] : customMsg.trim();
    if (!msg) return;
    setSending(true); setSendErr('');
    try {
      const r = await fetch(`${API_BASE}/v/${vehicleId}/fallback-message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fallback_token: fallbackToken, message: msg, urgency }),
      });
      const data = await r.json();
      if (data.success) {
        setStep('sent');
        return;
      }
      if (r.status === 410 || data.action === 'scan_again') {
        setStep('expired');
        setSendErr(data.message || 'Message window has expired. Please scan the QR again.');
        setTimeout(() => {
          onClose();
          window.location.assign(`/v/${vehicleId}?sig=${encodeURIComponent(sig)}`);
        }, 1600);
        return;
      }
      setSendErr(data.message || 'Failed to send message');
    } catch { setSendErr('Network error.'); }
    finally { setSending(false); }
  }

  return (
    <BottomSheet onClose={step !== 'ringing' ? onClose : undefined}>
      {step === 'phone' && (
        <>
          <h3 style={{ color: C.blue, fontWeight: 700, fontSize: '1.05rem', margin: '0 0 4px' }}>📞 Call Vehicle Owner</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: 1.5 }}>Your number connects you — the owner won't see it until they pick up.</p>
          <input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneErr(''); }} placeholder="10-digit mobile number" autoFocus
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '10px', border: `1px solid ${phoneErr ? C.danger : C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontSize: '1rem', outline: 'none', marginBottom: '6px' }} />
          {phoneErr && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{phoneErr}</p>}
          {callErr  && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{callErr}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={onClose} style={outlineBtn}>Cancel</button>
            <button onClick={handleCall} disabled={phone.length !== 10} style={btnStyle(C.blue, '#fff', phone.length !== 10)}>Call Now</button>
          </div>
        </>
      )}
      {step === 'ringing' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📳</div>
          <p style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Connecting…</p>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: 0 }}>Ringing the vehicle owner. Please wait.</p>
        </div>
      )}
      {step === 'connected' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
          <p style={{ color: C.teal, fontWeight: 700, fontSize: '1.1rem', margin: '0 0 6px' }}>Connected!</p>
          <button onClick={onClose} style={{ ...btnStyle(C.teal, '#0A0F2C'), marginTop: '1rem' }}>Done</button>
        </div>
      )}
      {step === 'blocked' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚫</div>
          <p style={{ color: C.textSecondary, fontWeight: 700, fontSize: '1rem', margin: '0 0 8px' }}>Unable to contact this vehicle at this time.</p>
          <button onClick={onClose} style={{ ...btnStyle('rgba(148,163,184,0.2)', C.textSecondary), marginTop: '1rem' }}>Close</button>
        </div>
      )}
      {step === 'fallback' && (
        <>
          <h3 style={{ color: C.amber, fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>📵 No Answer</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: 1.5 }}>The owner didn't pick up. Leave a quick message — they'll be notified.</p>
          {FALLBACK_TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => { setSelectedTpl(i); setCustomMsg(''); }}
              style={{ width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: '10px', marginBottom: '8px', border: `1px solid ${selectedTpl === i ? C.teal : C.border}`, backgroundColor: selectedTpl === i ? 'rgba(0,229,160,0.08)' : 'rgba(255,255,255,0.03)', color: selectedTpl === i ? C.teal : C.textPrimary, cursor: 'pointer', fontSize: '0.88rem' }}>
              {t}
            </button>
          ))}
          <textarea placeholder="Or type a custom message…" value={customMsg} onChange={e => { setCustomMsg(e.target.value.slice(0, 300)); setSelectedTpl(null); }}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.04)', color: C.textPrimary, fontSize: '0.9rem', outline: 'none', resize: 'none', height: '80px', marginBottom: '10px' }} />
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            {Object.entries(URGENCY_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => setUrgency(key)}
                style={{ flex: 1, padding: '8px', borderRadius: '8px', border: `1px solid ${urgency === key ? cfg.border : C.border}`, backgroundColor: urgency === key ? cfg.bg : 'transparent', color: urgency === key ? cfg.color : C.textSecondary, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                {cfg.label}
              </button>
            ))}
          </div>
          {sendErr && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{sendErr}</p>}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={outlineBtn}>Skip</button>
            <button onClick={handleFallbackSend} disabled={sending || (selectedTpl === null && !customMsg.trim())} style={btnStyle(C.teal, '#0A0F2C', sending || (selectedTpl === null && !customMsg.trim()))}>
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </>
      )}
      {step === 'sent' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
          <p style={{ color: C.teal, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Message sent!</p>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>The owner has been notified.</p>
          <button onClick={onClose} style={btnStyle(C.teal, '#0A0F2C')}>Done</button>
        </div>
      )}
      {step === 'expired' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⏱️</div>
          <p style={{ color: C.amber, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Message window expired</p>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: 0 }}>
            {sendErr || 'Message window has expired. Please scan the QR again.'}
          </p>
        </div>
      )}
    </BottomSheet>
  );
}

// ── Message Panel ─────────────────────────────────────────────────────────────
function MessagePanel({ vehicleId, sig, templates, onClose }) {
  const [step, setStep]         = useState('pick');
  const [selected, setSelected] = useState(null);
  const [custom, setCustom]     = useState('');
  const [phone, setPhone]       = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSend() {
    if (!PHONE_RE.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian number'); return; }
    setPhoneErr(''); setSending(true);
    try {
      const r = await fetch(`${API_BASE}/v/${vehicleId}/message`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sig, sender_phone: phone, template_id: selected || undefined, custom_text: custom.trim() || undefined }),
      });
      const data = await r.json();
      if (r.status === 403) { setStep('blocked'); return; }
      if (data.success) setStep('done');
      else setError(data.message || 'Failed to send message');
    } catch { setError('Network error. Please try again.'); }
    finally { setSending(false); }
  }

  const tplList = templates.length > 0 ? templates : FALLBACK_TEMPLATES.map((t, i) => ({ id: i + 1, text: t }));
  const canProceed = selected !== null || custom.trim().length > 0;

  return (
    <BottomSheet onClose={onClose}>
      {step === 'pick' && (
        <>
          <h3 style={{ color: C.teal, fontWeight: 700, fontSize: '1.05rem', margin: '0 0 4px' }}>💬 Send a Message</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem' }}>Choose a message or type your own.</p>
          {tplList.map(t => (
            <button key={t.id} onClick={() => { setSelected(t.id); setCustom(''); }}
              style={{ width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: '10px', marginBottom: '8px', border: `1px solid ${selected === t.id ? C.teal : C.border}`, backgroundColor: selected === t.id ? 'rgba(0,229,160,0.08)' : 'rgba(255,255,255,0.03)', color: selected === t.id ? C.teal : C.textPrimary, cursor: 'pointer', fontSize: '0.88rem' }}>
              {t.text}
            </button>
          ))}
          <textarea placeholder="Or type a custom message (200 chars)…" value={custom} onChange={e => { setCustom(e.target.value.slice(0, 200)); setSelected(null); }}
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.04)', color: C.textPrimary, fontSize: '0.9rem', outline: 'none', resize: 'none', height: '80px', marginBottom: '12px' }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={outlineBtn}>Cancel</button>
            <button onClick={() => setStep('phone')} disabled={!canProceed} style={btnStyle(C.teal, '#0A0F2C', !canProceed)}>Next →</button>
          </div>
        </>
      )}
      {step === 'phone' && (
        <>
          <h3 style={{ color: C.teal, fontWeight: 700, fontSize: '1.05rem', margin: '0 0 4px' }}>💬 Your Number</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: 1.5 }}>Required so the owner can reply. It won't be shown directly.</p>
          <input type="tel" inputMode="numeric" maxLength={10} autoFocus value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneErr(''); }} placeholder="10-digit mobile number"
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '10px', border: `1px solid ${phoneErr ? C.danger : C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontSize: '1rem', outline: 'none', marginBottom: '6px' }} />
          {phoneErr && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{phoneErr}</p>}
          {error    && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={() => setStep('pick')} style={outlineBtn}>Back</button>
            <button onClick={handleSend} disabled={sending || phone.length !== 10} style={btnStyle(C.teal, '#0A0F2C', sending || phone.length !== 10)}>
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </>
      )}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
          <p style={{ color: C.teal, fontWeight: 700, fontSize: '1rem', margin: '0 0 6px' }}>Message sent!</p>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>The owner has been notified.</p>
          <button onClick={onClose} style={btnStyle(C.teal, '#0A0F2C')}>Done</button>
        </div>
      )}
      {step === 'blocked' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🚫</div>
          <p style={{ color: C.textSecondary, fontWeight: 700, fontSize: '1rem', margin: '0 0 8px' }}>Unable to contact this vehicle at this time.</p>
          <button onClick={onClose} style={{ ...btnStyle('rgba(148,163,184,0.2)', C.textSecondary), marginTop: '1rem' }}>Close</button>
        </div>
      )}
    </BottomSheet>
  );
}

// ── Emergency Panel ───────────────────────────────────────────────────────────
const EMERGENCY_TYPES = ['Accident or injury', 'Vehicle on fire', 'Hit and run', 'Medical emergency', 'Other emergency'];
const STAGE_LABELS = {
  calling_owner:     'Calling vehicle owner…',
  calling_contact_1: 'Calling emergency contact 1…',
  calling_contact_2: 'Calling emergency contact 2…',
  calling_contact_3: 'Calling emergency contact 3…',
};

function EmergencyPanel({ vehicleId, sig, hasEmergencyContacts, onClose }) {
  const [step, setStep]         = useState('type');
  const [emergType, setEmergType] = useState(null);
  const [phone, setPhone]       = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [submitErr, setSubmitErr] = useState('');
  const [stage, setStage]       = useState('calling_owner');
  const [connectedTo, setConnectedTo] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  function startPolling(sid) {
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/v/${vehicleId}/emergency-status/${sid}`);
        const data = await r.json();
        if (data.success) {
          setStage(data.stage);
          setConnectedTo(data.connected_to);
          if (['connected', 'all_failed'].includes(data.stage)) clearInterval(pollRef.current);
        }
      } catch {}
    }, 3000);
  }

  async function handleSubmit() {
    if (!PHONE_RE.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian number'); return; }
    setPhoneErr(''); setSubmitErr('');
    try {
      const r = await fetch(`${API_BASE}/v/${vehicleId}/emergency`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sig, caller_phone: phone, description: emergType }),
      });
      const data = await r.json();
      if (data.success && data.emergency_session_id) {
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
      {step === 'type' && (
        <>
          <h3 style={{ color: '#EF4444', fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>🚨 Emergency</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem' }}>What's happening?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
            {EMERGENCY_TYPES.map(t => (
              <button key={t} onClick={() => setEmergType(emergType === t ? null : t)}
                style={{ padding: '12px 14px', borderRadius: '10px', textAlign: 'left', border: `1px solid ${emergType === t ? '#EF4444' : C.border}`, backgroundColor: emergType === t ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)', color: emergType === t ? '#EF4444' : C.textPrimary, fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={outlineBtn}>Cancel</button>
            <button onClick={() => setStep('phone')} disabled={!emergType} style={btnStyle('#EF4444', '#fff', !emergType)}>Next →</button>
          </div>
        </>
      )}
      {step === 'phone' && (
        <>
          <h3 style={{ color: '#EF4444', fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>🚨 {emergType}</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Your number is needed to connect you to the vehicle owner{hasEmergencyContacts ? ' and emergency contacts' : ''}.
          </p>
          <input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneErr(''); }} placeholder="10-digit mobile number" autoFocus
            style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '10px', border: `1px solid ${phoneErr ? '#EF4444' : C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontSize: '1rem', outline: 'none', marginBottom: '6px' }} />
          {phoneErr  && <p style={{ color: '#EF4444', fontSize: '0.8rem', margin: '0 0 8px' }}>{phoneErr}</p>}
          {submitErr && <p style={{ color: '#EF4444', fontSize: '0.8rem', margin: '0 0 8px' }}>{submitErr}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={() => setStep('type')} style={outlineBtn}>Back</button>
            <button onClick={handleSubmit} disabled={phone.length !== 10} style={btnStyle('#EF4444', '#fff', phone.length !== 10)}>🚨 Call Now</button>
          </div>
        </>
      )}
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

// ── Report Panel ──────────────────────────────────────────────────────────────
const REPORT_REASONS = [
  { value: 'fake_qr',             label: 'QR seems fake or tampered' },
  { value: 'vehicle_mismatch',    label: "Vehicle doesn't match this plate number" },
  { value: 'suspicious_activity', label: 'Suspicious activity around this vehicle' },
  { value: 'other',               label: 'Other issue' },
];

function ReportPanel({ vehicleId, onClose }) {
  const [reason, setReason]         = useState(null);
  const [description, setDescription] = useState('');
  const [phone, setPhone]           = useState('');
  const [phoneErr, setPhoneErr]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [done, setDone]             = useState(false);
  const [error, setError]           = useState('');

  async function handleSubmit() {
    if (!PHONE_RE.test(phone)) { setPhoneErr('Enter a valid 10-digit Indian number'); return; }
    setPhoneErr(''); setLoading(true); setError('');
    try {
      const r = await fetch(`${API_BASE}/v/${vehicleId}/report`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, description: description.trim() || undefined, reporter_phone: phone }),
      });
      const data = await r.json();
      if (r.status === 429) { setError(data.message || 'You have already reported this vehicle recently.'); return; }
      if (data.success) setDone(true);
      else setError(data.message || 'Failed to submit report');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <BottomSheet onClose={onClose}>
      {done ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
          <p style={{ color: C.teal, fontWeight: 700, fontSize: '1rem', margin: '0 0 8px' }}>Report submitted</p>
          <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>Thank you for helping keep Sampaark safe.</p>
          <button onClick={onClose} style={btnStyle(C.teal, '#0A0F2C')}>Done</button>
        </div>
      ) : (
        <>
          <h3 style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1rem', margin: '0 0 4px' }}>🚩 Report an Issue</h3>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 1rem' }}>What's wrong with this QR?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {REPORT_REASONS.map(r => (
              <button key={r.value} onClick={() => setReason(r.value)}
                style={{ padding: '11px 14px', borderRadius: '10px', textAlign: 'left', border: `1px solid ${reason === r.value ? C.amber : C.border}`, backgroundColor: reason === r.value ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)', color: reason === r.value ? C.amber : C.textPrimary, fontSize: '0.88rem', cursor: 'pointer' }}>
                {r.label}
              </button>
            ))}
          </div>
          {reason && (
            <textarea placeholder="Additional details (optional, 500 chars max)" value={description} onChange={e => setDescription(e.target.value.slice(0, 500))}
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.04)', color: C.textPrimary, fontSize: '0.88rem', outline: 'none', resize: 'none', height: '80px', marginBottom: '10px' }} />
          )}
          <input type="tel" inputMode="numeric" maxLength={10} value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '')); setPhoneErr(''); }} placeholder="Your phone number (required)"
            style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '10px', border: `1px solid ${phoneErr ? C.danger : C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, fontSize: '0.9rem', outline: 'none', marginBottom: '6px' }} />
          {phoneErr && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{phoneErr}</p>}
          {error    && <p style={{ color: C.danger, fontSize: '0.8rem', margin: '0 0 8px' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button onClick={onClose} style={outlineBtn}>Cancel</button>
            <button onClick={handleSubmit} disabled={!reason || phone.length !== 10 || loading} style={btnStyle(C.amber, '#0A0F2C', !reason || phone.length !== 10 || loading)}>
              {loading ? 'Submitting…' : 'Submit Report'}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

// ── Powered by footer ─────────────────────────────────────────────────────────
function SampaarkFooter() {
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 0 1rem' }}>
      <a href="/" target="_blank" rel="noreferrer" style={{ color: C.teal, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', display: 'block' }}>
        Powered by Sampaark
      </a>
      <p style={{ color: '#4B5563', fontSize: '0.72rem', margin: '4px 0 0' }}>Protect your number. Get your QR.</p>
    </div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionButton({ icon, label, sublabel, color, disabled, onClick }) {
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

  const [state, setState]    = useState('loading');
  const [vehicle, setVehicle]  = useState(null);
  const [templates, setTemplates] = useState([]);
  const [panel, setPanel]      = useState(null);
  const [errMsg, setErrMsg]    = useState('');

  useEffect(() => {
    if (vehicle?.plate_number) document.title = `Sampaark — Contact ${vehicle.plate_number}`;
    else document.title = 'Sampaark — Contact Vehicle Owner';
    return () => { document.title = 'Sampaark'; };
  }, [vehicle]);

  useEffect(() => {
    if (!sig) { setState('error'); setErrMsg('Invalid QR code — missing signature.'); return; }
    const base = `${API_BASE}/v/${vehicleId}`;
    const sp   = encodeURIComponent(sig);

    fetch(`${base}?sig=${sp}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) throw new Error(data.message || 'Invalid QR');
        setVehicle(data.vehicle);
        if (data.deactivated)  { setState('deactivated');  return null; }
        if (data.transferring) { setState('transferring'); return null; }
        if (data.suspended)    { setState('suspended');    return null; }
        if (data.expired)      { setState('expired');      return null; }
        setState('ok');
        return fetch(`${base}/templates?sig=${sp}`).then(r => r.json()).catch(() => null);
      })
      .then(tplData => {
        if (!tplData) return;
        if (tplData?.success)  setTemplates(tplData.templates || []);
      })
      .catch(err => { setState('error'); setErrMsg(err.message || 'Invalid or expired QR code.'); });
  }, [vehicleId, sig]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1.25rem 2rem' }}>
        <style>{`@keyframes skeletonPulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <Skeleton width="55%" height="12px" radius="4px" s={{ margin: '0 auto 20px' }} />
            <Skeleton width="210px" height="56px" radius="14px" s={{ margin: '0 auto 10px' }} />
            <Skeleton width="90px" height="16px" radius="4px" s={{ margin: '0 auto' }} />
          </div>
          <Skeleton width="100%" height="16px" radius="4px" s={{ marginBottom: '8px' }} />
          <Skeleton width="70%" height="16px" radius="4px" s={{ marginBottom: '24px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Skeleton width="100%" height="64px" radius="14px" />
            <Skeleton width="100%" height="64px" radius="14px" />
            <Skeleton width="100%" height="64px" radius="14px" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error / special states ────────────────────────────────────────────────
  const STATE_CONFIG = {
    error:       { icon: '⚠️',  bg: C.bg,       title: 'Invalid QR Code',        body: errMsg || 'This QR code is invalid or has been tampered with.',                              showReport: true,  showLearn: true  },
    expired:     { icon: '⏱️',  bg: C.bg,       title: 'QR Code Expired',        body: "This vehicle's Sampark subscription has expired. The owner needs to renew.",               showReport: true,  showLearn: true  },
    suspended:   { icon: '🛡️', bg: '#0D0D0D',  title: 'Service Unavailable',    body: "This vehicle's Sampark service has been temporarily suspended.",                           showReport: true,  showLearn: false },
    deactivated: { icon: '🚗',  bg: '#0D0D0D',  title: 'Vehicle Not Registered', body: 'This vehicle is no longer registered on Sampaark.',                                        showReport: false, showLearn: true  },
    transferring:{ icon: '🔄',  bg: '#0A0A1A',  title: 'Transfer in Progress',   body: 'This vehicle is being transferred to a new owner. Service will resume once complete.',     showReport: false, showLearn: false },
  };

  if (STATE_CONFIG[state]) {
    const cfg = STATE_CONFIG[state];
    return (
      <div style={{ minHeight: '100vh', backgroundColor: cfg.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '320px', width: '100%' }}>
          <div style={{ fontSize: '3rem', marginBottom: '14px', opacity: 0.65 }}>{cfg.icon}</div>
          <h2 style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1.3rem', margin: '0 0 10px' }}>{cfg.title}</h2>
          {vehicle?.plate_number && (
            <span style={{ fontFamily: C.mono, display: 'block', fontSize: '1.1rem', fontWeight: 700, color: C.textSecondary, marginBottom: '10px' }}>
              {vehicle.plate_number}
            </span>
          )}
          <p style={{ color: C.textSecondary, fontSize: '0.88rem', margin: '0 0 20px', lineHeight: 1.65 }}>{cfg.body}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cfg.showReport && (
              <button onClick={() => setPanel('report')} style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '0.88rem', cursor: 'pointer' }}>
                🚩 Report an Issue
              </button>
            )}
            {cfg.showLearn && (
              <a href="/" target="_blank" rel="noreferrer" style={{ display: 'block', padding: '12px', borderRadius: '10px', border: 'rgba(0,229,160,0.2) 1px solid', color: C.teal, fontSize: '0.88rem', textDecoration: 'none', fontWeight: 600 }}>
                Learn about Sampaark →
              </a>
            )}
          </div>
        </div>
        <SampaarkFooter />
        {panel === 'report' && <ReportPanel vehicleId={vehicleId} onClose={() => setPanel(null)} />}
      </div>
    );
  }

  // ── Main scan UI ──────────────────────────────────────────────────────────
  const isSilent      = vehicle?.comm_mode === 'silent';
  const isMessageOnly = vehicle?.comm_mode === 'message_only';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem 1rem' }}>

      <div style={{ width: '100%', maxWidth: '420px', paddingTop: '2.5rem' }}>

        {/* Sampaark label */}
        <p style={{ color: C.teal, fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px', textAlign: 'center' }}>
          Sampaark — Secure Contact
        </p>

        {/* Plate number */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '12px 28px', borderRadius: '14px', border: '2px solid rgba(0,229,160,0.18)', backgroundColor: 'rgba(0,229,160,0.06)', marginBottom: '10px' }}>
            <span style={{ fontFamily: C.mono, fontSize: '2rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '0.08em' }}>
              {vehicle.plate_number}
            </span>
          </div>
        </div>

        {/* Privacy notice */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.85rem', flexShrink: 0, marginTop: '1px' }}>🔒</span>
          <p style={{ color: C.textSecondary, fontSize: '0.78rem', margin: 0, lineHeight: 1.5 }}>
            Secure masked communication — your identity stays private
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {!isSilent && !isMessageOnly && (
            <ActionButton
              icon="📞" color={C.blue}
              label="Call Vehicle Owner"
              sublabel="Masked call — your number is protected"
              onClick={() => { buzz(50); setPanel('call'); }}
            />
          )}
          {!isSilent && (
            <ActionButton
              icon="💬" color={C.teal}
              label="Send a Message"
              sublabel="Owner gets notified instantly"
              onClick={() => { buzz(50); setPanel('message'); }}
            />
          )}
          <ActionButton
            icon="🚨" color={C.danger}
            label="Emergency Contact"
            sublabel="Emergency route to owner and saved contacts"
            onClick={() => { buzz([50, 30, 50]); setPanel('emergency'); }}
          />
          {isSilent && (
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: C.textSecondary, margin: '2px 0 0' }}>
              This vehicle is in silent mode — only emergency contact is available.
            </p>
          )}
        </div>

        {/* Bottom section */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={() => setPanel('report')} style={{ border: 'none', background: 'none', color: C.textSecondary, fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', padding: '4px 0' }}>
            Report an issue
          </button>
        </div>
      </div>

      <SampaarkFooter />

      {panel === 'call'      && <CallPanel      vehicleId={vehicleId} sig={sig} onClose={() => setPanel(null)} />}
      {panel === 'message'   && <MessagePanel   vehicleId={vehicleId} sig={sig} templates={templates} onClose={() => setPanel(null)} />}
      {panel === 'emergency' && <EmergencyPanel vehicleId={vehicleId} sig={sig} onClose={() => setPanel(null)} />}
      {panel === 'report'    && <ReportPanel    vehicleId={vehicleId} onClose={() => setPanel(null)} />}
    </div>
  );
}
