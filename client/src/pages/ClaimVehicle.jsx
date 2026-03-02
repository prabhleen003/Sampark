import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const C = {
  navy:          '#0A0F2C',
  navyLight:     '#0D1438',
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
  mono:    "'JetBrains Mono', monospace",
};

export default function ClaimVehicle() {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(null); // { plate_number }
  const navigate = useNavigate();

  async function handleClaim(e) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true); setError('');
    try {
      const { data } = await api.post('/vehicles/transfer/claim', { transfer_code: trimmed });
      setSuccess(data.vehicle);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to claim vehicle');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{ border: 'none', background: 'none', color: C.textSecondary, fontSize: '0.88rem', cursor: 'pointer', padding: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          ← Back to Dashboard
        </button>

        <div style={{ backgroundColor: C.panel, borderRadius: '16px', padding: '2rem', border: `1px solid ${C.border}` }}>

          {success ? (
            // Success state
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
              <h2 style={{ fontFamily: font.heading, fontSize: '1.3rem', color: C.textPrimary, margin: '0 0 10px' }}>
                Vehicle Claimed!
              </h2>
              <p style={{ fontFamily: font.mono, fontSize: '1.2rem', fontWeight: 700, color: C.teal, margin: '0 0 12px', letterSpacing: '0.08em' }}>
                {success.plate_number}
              </p>
              <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: '0 0 24px', lineHeight: 1.6 }}>
                The vehicle is now in your account. Upload your documents to re-verify and activate your QR code.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: C.teal, color: C.navy, fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            // Claim form
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔄</div>
                <h1 style={{ fontFamily: font.heading, fontSize: '1.4rem', fontWeight: 700, color: C.textPrimary, margin: '0 0 6px' }}>
                  Claim a Vehicle
                </h1>
                <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
                  Enter the transfer code shared by the previous owner.
                </p>
              </div>

              <form onSubmit={handleClaim}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.textSecondary, marginBottom: '6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Transfer Code
                </label>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4"
                  maxLength={8}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${error ? 'rgba(255,59,92,0.5)' : C.borderTeal}`,
                    backgroundColor: C.navy,
                    color: C.textPrimary,
                    fontFamily: font.mono,
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    letterSpacing: '0.2em',
                    textAlign: 'center',
                    outline: 'none',
                    marginBottom: '14px',
                  }}
                />

                {error && (
                  <div style={{ backgroundColor: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.25)', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
                    <p style={{ color: C.danger, fontSize: '0.82rem', margin: 0 }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.trim().length < 8}
                  style={{
                    width: '100%', padding: '13px',
                    borderRadius: '10px', border: 'none',
                    backgroundColor: loading || code.trim().length < 8 ? 'rgba(0,229,160,0.3)' : C.teal,
                    color: C.navy,
                    fontWeight: 700, fontSize: '0.95rem',
                    cursor: loading || code.trim().length < 8 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Claiming…' : 'Claim Vehicle'}
                </button>
              </form>

              <p style={{ color: C.textSecondary, fontSize: '0.78rem', textAlign: 'center', margin: '16px 0 0', lineHeight: 1.6 }}>
                Transfer codes expire 48 hours after being issued. Contact the previous owner if the code has expired.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
