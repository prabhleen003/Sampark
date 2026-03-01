import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import QRCard from '../components/QRCard';

const C = {
  bg:            '#0A0F2C',
  card:          '#0D1438',
  border:        'rgba(148,163,184,0.12)',
  teal:          '#00E5A0',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  danger:        '#FF3B5C',
};

export default function PrintCard() {
  const { vehicleId } = useParams();
  const navigate      = useNavigate();
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    api.get(`/vehicles/${vehicleId}/qr-card`)
      .then(r => setCardData(r.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load card data'))
      .finally(() => setLoading(false));
  }, [vehicleId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: C.textSecondary, fontSize: '0.9rem' }}>Loading card…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: C.danger, fontSize: '0.9rem', marginBottom: '16px' }}>{error}</p>
          <button onClick={() => navigate('/dashboard')} style={{ color: C.teal, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, padding: '2rem 1rem' }}>
      {/* Global print CSS */}
      <style>{`@media print { .no-print { display: none !important; } body { margin: 0; background: white; } }`}</style>

      {/* Header — hidden on print */}
      <div className="no-print" style={{ maxWidth: '520px', margin: '0 auto 2rem' }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'none', border: 'none', color: C.textSecondary, fontSize: '0.9rem', cursor: 'pointer', padding: 0, marginBottom: '1.5rem' }}
        >
          ← Back to Dashboard
        </button>
        <h1 style={{ color: C.textPrimary, fontWeight: 700, fontSize: '1.4rem', margin: '0 0 4px' }}>Print Your QR Card</h1>
        <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: 0 }}>
          {cardData.plate_number} — cut along the border and stick it on your vehicle.
        </p>
      </div>

      {/* Card preview (scaled on screen, actual size on print) */}
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        {/* Screen wrapper adds spacing for the scaled card */}
        <div style={{ marginBottom: 'calc(53.98mm * 1.5 + 2rem)' }}>
          <QRCard
            qrImage={cardData.qr_image}
            plateNumber={cardData.plate_number}
            validUntil={cardData.valid_until}
            cardCode={cardData.card_code}
          />
        </div>

        {/* Instructions + Print button — hidden on print */}
        <div className="no-print" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '1.25rem', marginTop: '1rem' }}>
          <p style={{ color: C.textSecondary, fontSize: '0.82rem', margin: '0 0 12px', lineHeight: 1.6 }}>
            💡 For best results, print on thick paper or a sticker sheet. Cut along the teal border.
            On Chrome, choose "Save as PDF" in the print dialog to get a digital copy.
          </p>
          <button
            onClick={() => window.print()}
            style={{ width: '100%', padding: '13px', borderRadius: '10px', border: 'none', backgroundColor: C.teal, color: '#0A0F2C', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}
          >
            🖨️ Print Card
          </button>
        </div>
      </div>
    </div>
  );
}
