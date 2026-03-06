import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');
const PHONE_RE = /^[6-9]\d{9}$/;

const C = {
  bg: '#0A0F2C',
  card: '#0D1438',
  border: 'rgba(148,163,184,0.14)',
  teal: '#00E5A0',
  blue: '#3B82F6',
  danger: '#FF3B5C',
  amber: '#F59E0B',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
};

const FALLBACK_SMS_TEMPLATES = [
  { id: 'block', text: 'Your car is blocking my vehicle. Please move it.', emoji: '🚗' },
  { id: 'lights', text: 'Your car lights are on.', emoji: '💡' },
  { id: 'towing', text: 'Your car is being towed. Come immediately.', emoji: '🚨' },
  { id: 'alarm', text: 'Your car alarm is going off.', emoji: '🔔' },
  { id: 'callback', text: 'Need to talk. Please call back.', emoji: '📞' },
  { id: 'parking', text: 'Your parking ticket is about to expire.', emoji: '🅿️' },
];

function btn(bg, fg, disabled) {
  return {
    width: '100%',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 14px',
    background: disabled ? 'rgba(148,163,184,0.2)' : bg,
    color: disabled ? C.textSecondary : fg,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 700,
  };
}

function Sheet({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, margin: '0 auto', background: C.card, border: `1px solid ${C.border}`, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

function CallPanel({ vehicleId, sig, templates, onClose }) {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('phone');
  const [error, setError] = useState('');
  const [fallbackToken, setFallbackToken] = useState(null);
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const templateList = templates.length > 0 ? templates : FALLBACK_SMS_TEMPLATES;
  const fallbackText = templateList.find(t => t.id === selectedTpl)?.text || customMessage.trim();

  async function startCall() {
    if (!PHONE_RE.test(phone)) {
      setError('Enter a valid 10-digit Indian number');
      return;
    }
    setError('');
    const r = await fetch(`${API_BASE}/v/${vehicleId}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sig, caller_phone: phone }),
    });
    const data = await r.json();
    if (r.status === 403) {
      setState('blocked');
      return;
    }
    if (!data.success) {
      setError(data.message || 'Could not start call');
      return;
    }
    setState('ringing');
    pollRef.current = setInterval(async () => {
      const sr = await fetch(`${API_BASE}/v/${vehicleId}/call-status/${data.call_log_id}`);
      const sd = await sr.json();
      if (['completed', 'no-answer', 'busy', 'failed'].includes(sd.status)) {
        clearInterval(pollRef.current);
        if (sd.status === 'completed') setState('connected');
        else {
          setFallbackToken(sd.fallback_token || null);
          setState('fallback');
        }
      }
    }, 3000);
  }

  async function sendFallbackSMS() {
    if (!fallbackText) return;
    if (fallbackText.length > 160) {
      setError('SMS must be 160 characters or less');
      return;
    }
    setError('');
    const r = await fetch(`${API_BASE}/v/${vehicleId}/fallback-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fallback_token: fallbackToken,
        message: fallbackText,
        urgency: 'urgent',
        caller_phone: phone,
      }),
    });
    const d = await r.json();
    if (d.success) {
      setState('sent');
      return;
    }
    setError(d.message || 'Failed to send SMS');
  }

  return (
    <Sheet onClose={state === 'ringing' ? undefined : onClose}>
      {state === 'phone' && (
        <>
          <h3 style={{ color: C.blue, marginTop: 0 }}>Call Vehicle Owner</h3>
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="10-digit mobile number" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }} />
          {error && <p style={{ color: C.danger, fontSize: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={btn('transparent', C.textSecondary, false)}>Cancel</button>
            <button onClick={startCall} style={btn(C.blue, '#fff', phone.length !== 10)}>Call</button>
          </div>
        </>
      )}
      {state === 'ringing' && <p style={{ color: C.textPrimary }}>Connecting call...</p>}
      {state === 'connected' && (
        <>
          <p style={{ color: C.teal }}>Connected.</p>
          <button onClick={onClose} style={btn(C.teal, '#0A0F2C', false)}>Done</button>
        </>
      )}
      {state === 'blocked' && (
        <>
          <p style={{ color: C.textSecondary }}>Unable to contact this vehicle at this time.</p>
          <button onClick={onClose} style={btn('rgba(148,163,184,0.2)', C.textSecondary, false)}>Close</button>
        </>
      )}
      {state === 'fallback' && (
        <>
          <h3 style={{ color: C.amber, marginTop: 0 }}>Owner did not answer. Send them an SMS?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templateList.map(t => (
              <button key={t.id} onClick={() => { setSelectedTpl(selectedTpl === t.id ? null : t.id); setCustomMessage(''); }} style={{ textAlign: 'left', borderRadius: 10, border: `1px solid ${selectedTpl === t.id ? C.teal : C.border}`, background: selectedTpl === t.id ? 'rgba(0,229,160,0.08)' : 'rgba(255,255,255,0.03)', color: C.textPrimary, padding: 10, cursor: 'pointer' }}>
                {t.emoji} {t.text}
              </button>
            ))}
          </div>
          <textarea value={customMessage} onChange={e => { setCustomMessage(e.target.value.slice(0, 160)); setSelectedTpl(null); }} placeholder="Type custom SMS..." style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, background: 'rgba(255,255,255,0.04)', color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, minHeight: 70 }} />
          <p style={{ color: C.textSecondary, marginTop: 4, textAlign: 'right', fontSize: 12 }}>{customMessage.length}/160</p>
          {error && <p style={{ color: C.danger, fontSize: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={btn('transparent', C.textSecondary, false)}>Skip</button>
            <button onClick={sendFallbackSMS} style={btn(C.teal, '#0A0F2C', !fallbackText)}>Send SMS</button>
          </div>
        </>
      )}
      {state === 'sent' && (
        <>
          <p style={{ color: C.teal }}>SMS sent to vehicle owner.</p>
          <button onClick={onClose} style={btn(C.teal, '#0A0F2C', false)}>Done</button>
        </>
      )}
    </Sheet>
  );
}

function SMSPanel({ vehicleId, sig, templates, onClose }) {
  const [phone, setPhone] = useState('');
  const [selectedTpl, setSelectedTpl] = useState(null);
  const [customMessage, setCustomMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const templateList = templates.length > 0 ? templates : FALLBACK_SMS_TEMPLATES;
  const resolvedMessage = templateList.find(t => t.id === selectedTpl)?.text || customMessage.trim();
  const canSend = PHONE_RE.test(phone) && !!resolvedMessage;

  async function sendSMS() {
    if (!PHONE_RE.test(phone)) {
      setError('Enter a valid 10-digit Indian number');
      return;
    }
    setError('');
    setStatus('sending');
    const payload = { caller_phone: phone, sig };
    if (selectedTpl) payload.template_id = selectedTpl;
    else payload.message = customMessage.trim();

    try {
      const r = await fetch(`${API_BASE}/v/${vehicleId}/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        setStatus('success');
        return;
      }
      if (r.status === 429) {
        setStatus('rate');
        return;
      }
      if (r.status === 403) {
        setStatus('silent');
        return;
      }
      setStatus('failed');
      setError(d.error || d.message || 'Failed to send SMS. Please try again or use the Call button.');
    } catch {
      setStatus('failed');
      setError('Failed to send SMS. Please try again or use the Call button.');
    }
  }

  return (
    <Sheet onClose={onClose}>
      <h3 style={{ color: C.teal, marginTop: 0 }}>Send SMS</h3>
      <p style={{ color: C.textSecondary, fontSize: 13 }}>Your number (needed to receive a reply)</p>
      <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="10-digit mobile number" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 10 }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {templateList.map(t => (
          <button key={t.id} onClick={() => { setSelectedTpl(selectedTpl === t.id ? null : t.id); setCustomMessage(''); }} style={{ borderRadius: 999, border: `1px solid ${selectedTpl === t.id ? C.teal : C.border}`, background: selectedTpl === t.id ? 'rgba(0,229,160,0.14)' : 'rgba(255,255,255,0.03)', color: C.textPrimary, padding: '8px 10px', cursor: 'pointer' }}>
            {t.emoji} {t.text}
          </button>
        ))}
      </div>

      <textarea value={customMessage} onChange={e => { setCustomMessage(e.target.value.slice(0, 160)); setSelectedTpl(null); }} placeholder="Type a custom message..." style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, background: 'rgba(255,255,255,0.04)', color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, minHeight: 72 }} />
      <p style={{ color: C.textSecondary, marginTop: 4, textAlign: 'right', fontSize: 12 }}>{customMessage.length}/160</p>

      {status === 'sending' && <p style={{ color: C.textSecondary }}>Sending SMS...</p>}
      {status === 'success' && <p style={{ color: C.teal }}>SMS sent to vehicle owner! If they reply, you will receive it on your phone.</p>}
      {status === 'failed' && <p style={{ color: C.danger }}>{error}</p>}
      {status === 'rate' && <p style={{ color: C.amber }}>Too many messages. Please try again later.</p>}
      {status === 'silent' && <p style={{ color: C.amber }}>Vehicle owner has disabled messages. Try Emergency if urgent.</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={btn('transparent', C.textSecondary, false)}>Close</button>
        <button onClick={sendSMS} style={btn(C.teal, '#0A0F2C', !canSend || status === 'sending')}>
          {status === 'sending' ? 'Sending SMS...' : 'Send SMS'}
        </button>
      </div>
    </Sheet>
  );
}

function EmergencyPanel({ vehicleId, sig, onClose }) {
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('form');
  const [error, setError] = useState('');
  const pollRef = useRef(null);
  useEffect(() => () => clearInterval(pollRef.current), []);

  async function startEmergency() {
    if (!PHONE_RE.test(phone)) {
      setError('Enter a valid 10-digit Indian number');
      return;
    }
    setError('');
    const r = await fetch(`${API_BASE}/v/${vehicleId}/emergency`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sig, caller_phone: phone, description: 'Emergency' }),
    });
    const d = await r.json();
    if (!d.success) {
      setError(d.message || 'Emergency call failed');
      return;
    }
    setState('running');
    pollRef.current = setInterval(async () => {
      const sr = await fetch(`${API_BASE}/v/${vehicleId}/emergency-status/${d.emergency_session_id}`);
      const sd = await sr.json();
      if (sd.stage === 'connected') {
        clearInterval(pollRef.current);
        setState('connected');
      }
      if (sd.stage === 'all_failed') {
        clearInterval(pollRef.current);
        setState('failed');
      }
    }, 3000);
  }

  return (
    <Sheet onClose={state === 'running' ? undefined : onClose}>
      {state === 'form' && (
        <>
          <h3 style={{ color: C.danger, marginTop: 0 }}>Emergency</h3>
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="10-digit mobile number" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }} />
          {error && <p style={{ color: C.danger, fontSize: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={btn('transparent', C.textSecondary, false)}>Cancel</button>
            <button onClick={startEmergency} style={btn(C.danger, '#fff', phone.length !== 10)}>Emergency</button>
          </div>
        </>
      )}
      {state === 'running' && <p style={{ color: C.textPrimary }}>Emergency chain running...</p>}
      {state === 'connected' && <><p style={{ color: C.teal }}>Connected.</p><button onClick={onClose} style={btn(C.teal, '#0A0F2C', false)}>Done</button></>}
      {state === 'failed' && <><p style={{ color: C.amber }}>No one answered. Emergency SMS fallback has been sent.</p><button onClick={onClose} style={btn(C.amber, '#0A0F2C', false)}>Close</button></>}
    </Sheet>
  );
}

function ReportPanel({ vehicleId, onClose }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit() {
    if (!PHONE_RE.test(phone)) {
      setError('Enter a valid 10-digit Indian number');
      return;
    }
    const r = await fetch(`${API_BASE}/v/${vehicleId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'other', reporter_phone: phone }),
    });
    const d = await r.json();
    if (d.success) setDone(true);
    else setError(d.message || 'Failed');
  }
  return (
    <Sheet onClose={onClose}>
      {done ? <><p style={{ color: C.teal }}>Report submitted.</p><button onClick={onClose} style={btn(C.teal, '#0A0F2C', false)}>Done</button></> : (
        <>
          <h3 style={{ marginTop: 0, color: C.textPrimary }}>Report an issue</h3>
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} placeholder="Your phone number" style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12 }} />
          {error && <p style={{ color: C.danger, fontSize: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={btn('transparent', C.textSecondary, false)}>Cancel</button>
            <button onClick={submit} style={btn(C.amber, '#0A0F2C', phone.length !== 10)}>Submit</button>
          </div>
        </>
      )}
    </Sheet>
  );
}

export default function PublicScan() {
  const { vehicleId } = useParams();
  const [searchParams] = useSearchParams();
  const sig = searchParams.get('sig');
  const [state, setState] = useState('loading');
  const [vehicle, setVehicle] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [panel, setPanel] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sig) {
      setState('error');
      setError('Invalid QR code');
      return;
    }
    const base = `${API_BASE}/v/${vehicleId}`;
    fetch(`${base}?sig=${encodeURIComponent(sig)}`)
      .then(r => r.json())
      .then(async d => {
        if (!d.success) throw new Error(d.message || 'Invalid QR');
        setVehicle(d.vehicle);
        if (d.expired) return setState('expired');
        if (d.suspended) return setState('suspended');
        if (d.deactivated) return setState('deactivated');
        if (d.transferring) return setState('transferring');
        setState('ok');
        const tpl = await fetch(`${base}/sms-templates`).then(r => r.json()).catch(() => null);
        if (Array.isArray(tpl)) setTemplates(tpl);
      })
      .catch(e => {
        setState('error');
        setError(e.message || 'Invalid QR');
      });
  }, [vehicleId, sig]);

  if (state === 'loading') {
    return <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }
  if (state !== 'ok') {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
        <div>
          <h2>{state === 'error' ? 'Invalid QR' : state}</h2>
          <p style={{ color: C.textSecondary }}>{error || 'This QR cannot be used right now.'}</p>
          <button onClick={() => setPanel('report')} style={btn('transparent', C.textSecondary, false)}>Report issue</button>
          {panel === 'report' && <ReportPanel vehicleId={vehicleId} onClose={() => setPanel(null)} />}
        </div>
      </div>
    );
  }

  const isSilent = vehicle?.comm_mode === 'silent';
  const isMessageOnly = vehicle?.comm_mode === 'message_only';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.textPrimary, padding: 16 }}>
      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <p style={{ color: C.teal, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, textAlign: 'center' }}>Sampaark</p>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-block', padding: '12px 20px', borderRadius: 12, border: '2px solid rgba(0,229,160,0.18)', background: 'rgba(0,229,160,0.06)', fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 700 }}>{vehicle.plate_number}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!isSilent && !isMessageOnly && <button onClick={() => setPanel('call')} style={btn(C.blue, '#fff', false)}>📞 Call Vehicle Owner</button>}
          {!isSilent && <button onClick={() => setPanel('sms')} style={btn(C.teal, '#0A0F2C', false)}>💬 Send SMS</button>}
          <button onClick={() => setPanel('emergency')} style={btn(C.danger, '#fff', false)}>🚨 Emergency</button>
        </div>
        {/* Indian Emergency Helplines */}
        <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          <p style={{ textAlign: 'center', color: C.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, margin: '0 0 10px' }}>Emergency Helplines</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="tel:100" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none', background: 'rgba(59,130,246,0.12)', border: `1px solid rgba(59,130,246,0.35)`, borderRadius: 10, padding: '11px 8px', color: '#60A5FA', fontWeight: 700, fontSize: 15 }}>
              🚔 Police <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>100</span>
            </a>
            <a href="tel:108" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none', background: 'rgba(239,68,68,0.12)', border: `1px solid rgba(239,68,68,0.35)`, borderRadius: 10, padding: '11px 8px', color: '#F87171', fontWeight: 700, fontSize: 15 }}>
              🚑 Ambulance <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>108</span>
            </a>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button onClick={() => setPanel('report')} style={{ border: 'none', background: 'none', color: C.textSecondary, textDecoration: 'underline', cursor: 'pointer' }}>Report an issue</button>
        </div>
      </div>

      {panel === 'call' && <CallPanel vehicleId={vehicleId} sig={sig} templates={templates} onClose={() => setPanel(null)} />}
      {panel === 'sms' && <SMSPanel vehicleId={vehicleId} sig={sig} templates={templates} onClose={() => setPanel(null)} />}
      {panel === 'emergency' && <EmergencyPanel vehicleId={vehicleId} sig={sig} onClose={() => setPanel(null)} />}
      {panel === 'report' && <ReportPanel vehicleId={vehicleId} onClose={() => setPanel(null)} />}
    </div>
  );
}
