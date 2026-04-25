import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/axios';

const C = {
  navy: '#0A0F2C',
  navyDeep: '#07091E',
  panel: '#111834',
  teal: '#00E5A0',
  accent: '#67B7FF',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: 'rgba(148,163,184,0.12)',
  borderTeal: 'rgba(0,229,160,0.25)',
  danger: '#FF3B5C',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

const STEPS = [
  'Initiating payment',
  'Confirming transaction',
  'Generating QR',
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PaymentProcessing() {
  const navigate = useNavigate();
  const { vehicleId } = useParams();
  const [searchParams] = useSearchParams();

  const txnid = searchParams.get('txnid');
  const isRenewal = searchParams.get('renew') === '1';

  const [step, setStep] = useState(0);
  const [status, setStatus] = useState(txnid ? 'processing' : 'error');
  const [error, setError] = useState(txnid ? '' : 'Missing transaction details.');
  const [qrData, setQrData] = useState(null);
  const [copyLabel, setCopyLabel] = useState('Copy Link');

  useEffect(() => {
    if (!txnid) return;

    let active = true;

    async function runDemoPayment() {
      try {
        setStep(0);
        await delay(700);
        if (!active) return;

        setStep(1);
        await api.post('/payments/demo-complete', { txnid });
        if (!active) return;

        await delay(900);
        if (!active) return;

        setStep(2);
        const { data } = await api.get(`/vehicles/${vehicleId}/qr`);
        if (!active) return;

        await delay(400);
        if (!active) return;

        setQrData(data);
        setStatus('success');
      } catch (err) {
        if (!active) return;
        setError(err.response?.data?.message || 'We could not complete this demo payment.');
        setStatus('error');
      }
    }

    runDemoPayment();
    return () => {
      active = false;
    };
  }, [txnid, vehicleId]);

  function downloadQr() {
    if (!qrData?.qr_image_url) return;
    const a = document.createElement('a');
    a.href = qrData.qr_image_url;
    a.download = `Sampark_QR_${qrData.plate_number}.png`;
    a.click();
  }

  function copyLink() {
    if (!qrData?.qr_token) return;
    const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173';
    const link = `${appUrl}/v/${vehicleId}?sig=${qrData.qr_token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy Link'), 2000);
    });
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: C.navy,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      fontFamily: font.body,
    }}>
      <div style={{
        width: '100%',
        maxWidth: '460px',
        backgroundColor: 'rgba(17,24,52,0.88)',
        backdropFilter: 'blur(24px)',
        borderRadius: '28px',
        padding: '40px 32px',
        border: `1px solid ${C.borderTeal}`,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        {status === 'processing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              border: '3px solid rgba(0,229,160,0.25)',
              borderTopColor: C.teal,
              margin: '0 auto 20px',
              animation: 'spin 0.9s linear infinite',
            }} />
            <h1 style={{ margin: '0 0 8px', color: C.textPrimary, fontSize: '1.6rem', fontWeight: 800, fontFamily: font.heading }}>
              {isRenewal ? 'Renewing Your QR' : 'Processing Payment'}
            </h1>
            <p style={{ margin: '0 0 20px', color: C.textSecondary, fontSize: '0.92rem', lineHeight: 1.6 }}>
              Demo mode is active. No real charge is being made while we walk through the activation flow.
            </p>

            <div style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: `1px solid ${C.border}`,
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'left',
            }}>
              {STEPS.map((label, index) => {
                const complete = index < step;
                const activeStep = index === step;
                return (
                  <div key={label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: index === STEPS.length - 1 ? '0' : '0 0 12px',
                    marginBottom: index === STEPS.length - 1 ? 0 : '12px',
                    borderBottom: index === STEPS.length - 1 ? 'none' : `1px solid ${C.border}`,
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: complete ? C.teal : activeStep ? 'rgba(0,229,160,0.12)' : 'rgba(148,163,184,0.12)',
                      color: complete ? C.navyDeep : activeStep ? C.teal : C.textSecondary,
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}>
                      {complete ? '✓' : index + 1}
                    </div>
                    <span style={{
                      color: activeStep || complete ? C.textPrimary : C.textSecondary,
                      fontSize: '0.88rem',
                      fontWeight: activeStep ? 700 : 500,
                    }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>!</div>
            <h1 style={{ margin: '0 0 8px', color: C.textPrimary, fontSize: '1.5rem', fontWeight: 800, fontFamily: font.heading }}>
              Payment Couldn&apos;t Finish
            </h1>
            <p style={{ margin: '0 0 20px', color: C.danger, fontSize: '0.9rem', lineHeight: 1.6 }}>
              {error}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, cursor: 'pointer', fontWeight: 600 }}
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: C.teal, color: C.navyDeep, cursor: 'pointer', fontWeight: 700 }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {status === 'success' && qrData && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✓</div>
            <h1 style={{ margin: '0 0 6px', color: C.textPrimary, fontSize: '1.6rem', fontWeight: 800, fontFamily: font.heading }}>
              {isRenewal ? 'Renewal Complete' : 'QR Ready'}
            </h1>
            <p style={{ margin: '0 0 18px', color: C.textSecondary, fontSize: '0.92rem', lineHeight: 1.6 }}>
              Demo payment completed successfully. Your QR has been activated and is ready to show.
            </p>

            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '18px',
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <img
                src={qrData.qr_image_url}
                alt={`QR for ${qrData.plate_number}`}
                style={{ width: '220px', height: '220px', borderRadius: '8px' }}
              />
            </div>

            <p style={{ margin: '0 0 18px', color: C.teal, fontSize: '1rem', fontWeight: 700, fontFamily: font.mono }}>
              {qrData.plate_number}
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button
                onClick={downloadQr}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: C.teal, color: C.navyDeep, cursor: 'pointer', fontWeight: 700 }}
              >
                Download PNG
              </button>
              <button
                onClick={copyLink}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.05)', color: C.textPrimary, cursor: 'pointer', fontWeight: 600 }}
              >
                {copyLabel}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => navigate(`/print/${vehicleId}`)}
                style={{ flex: 1, padding: '11px', borderRadius: '12px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, cursor: 'pointer', fontWeight: 600 }}
              >
                Print Card
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                style={{ flex: 1, padding: '11px', borderRadius: '12px', border: 'none', backgroundColor: C.accent, color: C.navyDeep, cursor: 'pointer', fontWeight: 700 }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
