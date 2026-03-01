import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import PrivacyScore from '../components/PrivacyScore';

const C = {
  bg:            '#0A0F2C',
  card:          '#0D1438',
  slate:         '#1E293B',
  panel:         '#111834',
  teal:          '#00E5A0',
  tealDark:      '#00CC8E',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  border:        'rgba(148,163,184,0.12)',
  borderTeal:    'rgba(0,229,160,0.25)',
  danger:        '#FF3B5C',
};
const font = {
  heading: "'Space Grotesk', sans-serif",
  body:    "'Inter', sans-serif",
};

const PREF_LABELS = [
  { key: 'missed_calls',      label: 'Missed call alerts',        locked: false },
  { key: 'messages',          label: 'Message notifications',     locked: false },
  { key: 'emergency',         label: 'Emergency alerts',          locked: true  },
  { key: 'payment_reminders', label: 'Payment & QR reminders',   locked: false },
  { key: 'qr_expiry',         label: 'QR expiry warnings',        locked: false },
  { key: 'order_updates',     label: 'Order status updates',      locked: false },
];

function SectionTitle({ children }) {
  return (
    <p style={{ margin: '0 0 12px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.textSecondary }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: '1px', backgroundColor: C.border, margin: '24px 0' }} />;
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: C.slate, color: C.textPrimary, borderRadius: '10px',
      padding: '10px 20px', fontSize: '0.85rem', zIndex: 9999,
      border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      whiteSpace: 'nowrap',
    }}>
      {msg}
    </div>
  );
}

// ── Delete Account Modal ──────────────────────────────────────────────────────
function DeleteModal({ onClose, onDeleted }) {
  const [checks, setChecks] = useState({ c1: false, c2: false, c3: false });
  const [typed, setTyped]   = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const allChecked = checks.c1 && checks.c2 && checks.c3;
  const canDelete  = allChecked && typed === 'DELETE';

  async function handleDelete() {
    setLoading(true); setErr('');
    try {
      await api.delete('/users/me', { data: { confirmation: 'DELETE' } });
      onDeleted();
    } catch (e) {
      setErr(e.response?.data?.message || 'Deletion failed. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.card, borderRadius: '16px', border: `1.5px solid ${C.danger}`, padding: '2rem', maxWidth: '420px', width: '100%' }}>
        <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '12px' }}>⚠️</div>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, color: C.danger, fontFamily: font.heading, textAlign: 'center' }}>Delete Your Account</h2>
        <p style={{ margin: '0 0 20px', fontSize: '0.84rem', color: C.textSecondary, lineHeight: 1.6, textAlign: 'center' }}>
          This action is permanent and cannot be undone. All your data will be removed, all QR codes will stop working immediately, and any pending orders will be cancelled.
        </p>

        {/* Checkboxes */}
        {[
          { k: 'c1', label: 'I understand all my QR codes will be permanently deactivated' },
          { k: 'c2', label: 'I understand this cannot be undone' },
          { k: 'c3', label: 'I have downloaded my data if needed' },
        ].map(({ k, label }) => (
          <label key={k} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={checks[k]}
              onChange={e => setChecks(prev => ({ ...prev, [k]: e.target.checked }))}
              style={{ marginTop: '2px', accentColor: C.danger }}
            />
            <span style={{ fontSize: '0.82rem', color: C.textSecondary, lineHeight: 1.5 }}>{label}</span>
          </label>
        ))}

        {/* Type DELETE */}
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder='Type DELETE to confirm'
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '10px 12px', borderRadius: '8px', marginTop: '8px', marginBottom: '16px',
            backgroundColor: C.slate, border: `1px solid ${C.border}`,
            color: C.textPrimary, fontSize: '0.88rem', outline: 'none',
          }}
        />

        {err && <p style={{ color: C.danger, fontSize: '0.8rem', marginBottom: '12px', margin: '0 0 12px' }}>{err}</p>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.88rem', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || loading}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
              backgroundColor: canDelete ? C.danger : C.slate,
              color: canDelete ? '#fff' : C.textSecondary,
              fontSize: '0.88rem', fontWeight: 700,
              cursor: canDelete ? 'pointer' : 'not-allowed',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Deleting…' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState('');

  // Profile edit state
  const [nameVal, setNameVal]   = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [savingName, setSavingName]   = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Phone change
  const [showPhoneChange, setShowPhoneChange] = useState(false);
  const [phoneStep, setPhoneStep]  = useState(1); // 1=enter phone, 2=enter otp
  const [newPhone, setNewPhone]    = useState('');
  const [phoneOtp, setPhoneOtp]    = useState('');
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneErr, setPhoneErr]    = useState('');

  // Prefs
  const [prefs, setPrefs] = useState(null);

  // Language
  const [lang, setLang] = useState('en');

  // Payments
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  // Privacy score
  const [privacyScore, setPrivacyScore]         = useState(null);
  const [privacyBreakdown, setPrivacyBreakdown] = useState([]);
  const [prevPrivacyScore, setPrevPrivacyScore] = useState(null);
  const [scoreToast, setScoreToast]             = useState('');

  // Delete modal
  const [showDelete, setShowDelete] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  function loadScore(showImprovement = false) {
    api.get('/users/me/privacy-score')
      .then(r => {
        const newScore = r.data.score;
        setPrivacyBreakdown(r.data.breakdown || []);
        setPrivacyScore(prev => {
          if (showImprovement && prev !== null && newScore > prev) {
            setScoreToast(`+${newScore - prev} points`);
            setTimeout(() => setScoreToast(''), 4000);
          }
          setPrevPrivacyScore(prev);
          return newScore;
        });
      })
      .catch(() => {});
  }

  const loadSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/users/me/settings');
      const s = data.settings;
      setSettings(s);
      setNameVal(s.name || '');
      setEmailVal(s.email || '');
      setPrefs({ ...s.notification_preferences });
      setLang(s.language || 'en');
    } catch {
      navigate('/login');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadSettings();
    loadScore();
    setPaymentsLoading(true);
    api.get('/users/me/payments')
      .then(r => setPayments(r.data.payments || []))
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }, [loadSettings]);

  async function saveName() {
    setSavingName(true);
    try {
      await api.put('/users/me/settings', { name: nameVal });
      setSettings(prev => ({ ...prev, name: nameVal.trim() }));
      showToast('Name saved ✓');
      loadScore(true);
    } catch (e) { showToast(e.response?.data?.message || 'Failed to save'); }
    finally { setSavingName(false); }
  }

  async function saveEmail() {
    setSavingEmail(true);
    try {
      await api.put('/users/me/settings', { email: emailVal || null });
      setSettings(prev => ({ ...prev, email: emailVal || null }));
      showToast('Email saved ✓');
      loadScore(true);
    } catch (e) { showToast(e.response?.data?.message || 'Failed to save'); }
    finally { setSavingEmail(false); }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showToast('Only JPEG or PNG images allowed'); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2 MB'); return;
    }
    const formData = new FormData();
    formData.append('avatar', file);
    setUploadingAvatar(true);
    try {
      const { data } = await api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSettings(prev => ({ ...prev, avatar_url: data.avatar_url }));
      showToast('Avatar updated ✓');
    } catch { showToast('Failed to upload avatar'); }
    finally { setUploadingAvatar(false); }
  }

  async function handleSendOtp() {
    if (!/^[6-9]\d{9}$/.test(newPhone)) { setPhoneErr('Valid 10-digit phone required'); return; }
    setPhoneSending(true); setPhoneErr('');
    try {
      const { data } = await api.post('/users/me/change-phone', { new_phone: newPhone });
      if (data.otp) console.log('Dev OTP:', data.otp); // dev only
      setPhoneStep(2);
    } catch (e) { setPhoneErr(e.response?.data?.message || 'Failed to send OTP'); }
    finally { setPhoneSending(false); }
  }

  async function handleVerifyPhone() {
    if (!phoneOtp.trim()) { setPhoneErr('Enter the OTP'); return; }
    setPhoneVerifying(true); setPhoneErr('');
    try {
      await api.post('/users/me/change-phone/verify', { new_phone: newPhone, otp: phoneOtp });
      localStorage.removeItem('token');
      navigate('/login');
    } catch (e) { setPhoneErr(e.response?.data?.message || 'OTP verification failed'); }
    finally { setPhoneVerifying(false); }
  }

  async function handlePrefToggle(key) {
    if (key === 'emergency') return; // locked
    const newVal = !prefs[key];
    setPrefs(prev => ({ ...prev, [key]: newVal }));
    try {
      await api.put('/users/me/settings', { notification_preferences: { [key]: newVal } });
      showToast(`${newVal ? 'Enabled' : 'Disabled'} ✓`);
      loadScore(true);
    } catch {
      setPrefs(prev => ({ ...prev, [key]: !newVal })); // revert
      showToast('Failed to save preference');
    }
  }

  async function handleLangChange(l) {
    if (l === lang) return;
    setLang(l);
    try {
      await api.put('/users/me/settings', { language: l });
      showToast('Language saved ✓');
    } catch { setLang(lang); }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const response = await api.get('/users/me/export', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sampark_data_export.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Download started ✓');
    } catch { showToast('Export failed. Try again.'); }
    finally { setExporting(false); }
  }

  function handleDeleted() {
    localStorage.removeItem('token');
    navigate('/');
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.textSecondary }}>Loading…</p>
      </div>
    );
  }

  const avatarSrc = settings?.avatar_url ? settings.avatar_url : null;
  const initials  = (settings?.name || '?').slice(0, 2).toUpperCase();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: font.body }}>
      {/* Header */}
      <div style={{ backgroundColor: C.card, borderBottom: `1px solid ${C.border}`, padding: '0 1rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px', height: '60px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: '1.1rem', padding: '4px' }}>←</button>
          <h1 style={{ margin: 0, flex: 1, fontSize: '1.05rem', fontWeight: 700, color: C.textPrimary, fontFamily: font.heading }}>Settings</h1>
        </div>
      </div>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

        {/* ── Privacy Score (compact) ── */}
        {privacyScore !== null && (
          <div style={{ marginBottom: '1.5rem' }}>
            <SectionTitle>Privacy Score</SectionTitle>
            <PrivacyScore
              score={privacyScore}
              breakdown={privacyBreakdown}
              prevScore={prevPrivacyScore}
            />
          </div>
        )}

        {/* Score improvement toast */}
        {scoreToast && (
          <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#111834', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '10px', padding: '10px 20px', fontSize: '0.85rem', color: '#00E5A0', fontWeight: 600, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            ↑ Privacy score improved! {scoreToast}
          </div>
        )}

        {/* ── Section 1: Profile ── */}
        <SectionTitle>Profile</SectionTitle>
        <div style={{ backgroundColor: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, padding: '1.5rem', marginBottom: '0' }}>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
            <div
              onClick={() => avatarInputRef.current?.click()}
              style={{ position: 'relative', width: '72px', height: '72px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0 }}
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: C.slate, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700, color: C.teal, fontFamily: font.heading }}>
                  {initials}
                </div>
              )}
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: uploadingAvatar ? 1 : 0, transition: 'opacity 0.15s' }}>
                <span style={{ color: '#fff', fontSize: '1.2rem' }}>{uploadingAvatar ? '⏳' : '📷'}</span>
              </div>
              <div className="avatar-hover-overlay" style={{ position: 'absolute', inset: 0, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: '1rem' }}>📷</span>
              </div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} style={{ display: 'none' }} />
            <div>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: C.textPrimary }}>{settings?.name || 'Your Name'}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: C.textSecondary }}>{settings?.masked_phone}</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: C.textSecondary }}>Click avatar to change</p>
            </div>
          </div>

          {/* Name field */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: C.textSecondary, marginBottom: '6px' }}>Display Name</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.slate, color: C.textPrimary, fontSize: '0.88rem', outline: 'none' }}
              />
              {nameVal.trim() !== (settings?.name || '') && (
                <button onClick={saveName} disabled={savingName} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: '#0A0F2C', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {savingName ? '…' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {/* Email field */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', color: C.textSecondary, marginBottom: '6px' }}>Email <span style={{ opacity: 0.6 }}>— optional, for account recovery</span></label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="email"
                value={emailVal}
                onChange={e => setEmailVal(e.target.value)}
                placeholder="you@example.com"
                style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.slate, color: C.textPrimary, fontSize: '0.88rem', outline: 'none' }}
              />
              {emailVal !== (settings?.email || '') && (
                <button onClick={saveEmail} disabled={savingEmail} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: '#0A0F2C', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {savingEmail ? '…' : 'Save'}
                </button>
              )}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', color: C.textSecondary, marginBottom: '6px' }}>Phone Number</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.88rem', color: C.textPrimary, letterSpacing: '0.05em' }}>{settings?.masked_phone}</span>
              <button
                onClick={() => { setShowPhoneChange(v => !v); setPhoneStep(1); setNewPhone(''); setPhoneOtp(''); setPhoneErr(''); }}
                style={{ background: 'none', border: 'none', color: C.teal, fontSize: '0.78rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
              >
                Change
              </button>
            </div>
          </div>
        </div>

        {/* ── Section 2: Change Phone (expandable) ── */}
        {showPhoneChange && (
          <div style={{ backgroundColor: C.panel, borderRadius: '12px', border: `1px solid ${C.border}`, padding: '1.25rem', marginTop: '8px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.8rem', fontWeight: 600, color: C.textPrimary }}>Change Phone Number</p>
            <p style={{ margin: '0 0 14px', fontSize: '0.75rem', color: '#F59E0B' }}>
              ⚠️ Changing your phone number will log you out. You'll need to login with the new number.
            </p>

            {phoneStep === 1 && (
              <>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value.replace(/\D/, ''))}
                  maxLength={10}
                  placeholder="New 10-digit phone number"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.slate, color: C.textPrimary, fontSize: '0.88rem', outline: 'none', marginBottom: '10px' }}
                />
                {phoneErr && <p style={{ color: C.danger, fontSize: '0.78rem', margin: '0 0 8px' }}>{phoneErr}</p>}
                <button onClick={handleSendOtp} disabled={phoneSending} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: '#0A0F2C', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>
                  {phoneSending ? 'Sending OTP…' : 'Send OTP'}
                </button>
              </>
            )}

            {phoneStep === 2 && (
              <>
                <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: C.textSecondary }}>OTP sent to +91 {newPhone}</p>
                <input
                  type="text"
                  value={phoneOtp}
                  onChange={e => setPhoneOtp(e.target.value.replace(/\D/, ''))}
                  maxLength={6}
                  placeholder="6-digit OTP"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.slate, color: C.textPrimary, fontSize: '0.88rem', letterSpacing: '0.15em', outline: 'none', marginBottom: '10px' }}
                />
                {phoneErr && <p style={{ color: C.danger, fontSize: '0.78rem', margin: '0 0 8px' }}>{phoneErr}</p>}
                <button onClick={handleVerifyPhone} disabled={phoneVerifying} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: '#0A0F2C', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>
                  {phoneVerifying ? 'Verifying…' : 'Verify & Update'}
                </button>
                <button onClick={() => setPhoneStep(1)} style={{ width: '100%', padding: '8px', marginTop: '8px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontSize: '0.8rem', cursor: 'pointer' }}>
                  ← Use different number
                </button>
              </>
            )}
          </div>
        )}

        <Divider />

        {/* ── Section 3: Notification Preferences ── */}
        <SectionTitle>Notification Preferences</SectionTitle>
        <div style={{ backgroundColor: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: '0' }}>
          {PREF_LABELS.map(({ key, label, locked }, i) => (
            <div
              key={key}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 1.25rem',
                borderBottom: i < PREF_LABELS.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: C.textPrimary }}>{label}</p>
                {locked && <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: C.textSecondary }}>Cannot be disabled for your safety</p>}
              </div>
              {/* Toggle */}
              <button
                onClick={() => handlePrefToggle(key)}
                disabled={locked}
                title={locked ? 'Emergency notifications cannot be disabled' : undefined}
                style={{
                  position: 'relative', width: '44px', height: '24px', borderRadius: '12px',
                  border: 'none', cursor: locked ? 'not-allowed' : 'pointer',
                  backgroundColor: (locked || prefs?.[key]) ? C.teal : C.slate,
                  transition: 'background 0.2s', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: '3px',
                  left: (locked || prefs?.[key]) ? '23px' : '3px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  backgroundColor: '#fff', transition: 'left 0.2s',
                }} />
              </button>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── Section 4: Language ── */}
        <SectionTitle>Language</SectionTitle>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '0' }}>
          {[{ code: 'en', name: 'English' }, { code: 'hi', name: 'हिंदी' }].map(l => (
            <button
              key={l.code}
              onClick={() => handleLangChange(l.code)}
              style={{
                flex: 1, padding: '14px', borderRadius: '12px', cursor: 'pointer',
                border: lang === l.code ? `1.5px solid ${C.teal}` : `1px solid ${C.border}`,
                backgroundColor: lang === l.code ? 'rgba(0,229,160,0.08)' : C.card,
                color: lang === l.code ? C.teal : C.textSecondary,
                fontSize: '0.9rem', fontWeight: lang === l.code ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              {l.name}
            </button>
          ))}
        </div>

        <Divider />

        {/* ── Section 5: Payment History ── */}
        <SectionTitle>Payment History</SectionTitle>
        <div style={{ backgroundColor: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden', marginBottom: '0' }}>
          {paymentsLoading ? (
            <p style={{ padding: '1.25rem', color: C.textSecondary, fontSize: '0.85rem', margin: 0 }}>Loading…</p>
          ) : payments.length === 0 ? (
            <p style={{ padding: '1.25rem', color: C.textSecondary, fontSize: '0.85rem', margin: 0 }}>No payments yet.</p>
          ) : payments.map((p, i) => (
            <div key={p._id} style={{ padding: '14px 1.25rem', borderBottom: i < payments.length - 1 ? `1px solid ${C.border}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: C.textPrimary }}>
                  ₹{p.amount} — {p.plate_number || 'Vehicle'}
                </p>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 700, borderRadius: '999px',
                  padding: '2px 8px',
                  backgroundColor: p.status === 'paid' ? 'rgba(0,229,160,0.15)' : 'rgba(255,59,92,0.15)',
                  color: p.status === 'paid' ? C.teal : C.danger,
                }}>
                  {p.status}
                </span>
              </div>
              {p.valid_from && p.valid_until && (
                <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: C.textSecondary }}>
                  Valid: {new Date(p.valid_from).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} — {new Date(p.valid_until).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </p>
              )}
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: C.textSecondary, letterSpacing: '0.03em' }}>
                {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {p.txnid && <span> · TXN: {p.txnid}</span>}
              </p>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── Section 6: Privacy & Data ── */}
        <SectionTitle>Privacy & Data</SectionTitle>
        <div style={{ backgroundColor: C.card, borderRadius: '14px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>

          {/* Download data */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 1.25rem', borderBottom: `1px solid ${C.border}` }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: C.textPrimary }}>Download My Data</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: C.textSecondary }}>Export all your data as a JSON file (DPDP Act)</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textPrimary, fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {exporting ? '⏳' : '⬇ Export'}
            </button>
          </div>

          {/* Privacy policy */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 1.25rem', borderBottom: `1px solid ${C.border}` }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: C.textPrimary }}>Privacy Policy</p>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: C.teal, textDecoration: 'none' }}>Open →</a>
          </div>

          {/* Delete account */}
          <div style={{ padding: '14px 1.25rem' }}>
            <button
              onClick={() => setShowDelete(true)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.88rem', color: C.danger, textDecoration: 'underline' }}
            >
              Delete Account
            </button>
            <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: C.textSecondary }}>Permanently remove all your data from Sampark.</p>
          </div>
        </div>

      </div>

      {showDelete && <DeleteModal onClose={() => setShowDelete(false)} onDeleted={handleDeleted} />}
      <Toast msg={toast} />

      {/* Hide avatar camera icon by default, show on hover */}
      <style>{`.avatar-hover-overlay { opacity: 0; transition: opacity 0.15s; } div:hover > .avatar-hover-overlay { opacity: 1; }`}</style>
    </div>
  );
}
