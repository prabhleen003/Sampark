// Print-ready QR card — 85.6mm × 53.98mm (credit card size)
// Use className="qr-card" for CSS targeting
export default function QRCard({ qrImage, plateNumber, validUntil, cardCode }) {
  const monthYear = validUntil
    ? new Date(validUntil).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';

  return (
    <>
      <style>{`
        .qr-card {
          width: 85.6mm;
          height: 53.98mm;
          box-sizing: border-box;
          padding: 3mm;
          border: 1.5px solid #00E5A0;
          background: white;
          border-radius: 3px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          font-family: 'Inter', sans-serif;
        }
        @media screen {
          .qr-card {
            transform: scale(2.5);
            transform-origin: top left;
          }
        }
        @media print {
          .qr-card {
            transform: none;
            box-shadow: none;
          }
        }
      `}</style>
      <div className="qr-card">
        {/* Brand */}
        <p style={{ margin: 0, fontSize: '5pt', fontWeight: 700, color: '#00E5A0', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Space Grotesk', sans-serif" }}>
          SAMPAARK
        </p>

        {/* QR Code */}
        <img
          src={qrImage}
          alt={`QR for ${plateNumber}`}
          style={{ width: '28mm', height: '28mm', display: 'block' }}
        />

        {/* Plate number */}
        <p style={{ margin: 0, fontSize: '8pt', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#111827', letterSpacing: '0.05em' }}>
          {plateNumber}
        </p>

        {/* Card code */}
        <p style={{ margin: 0, fontSize: '5pt', color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
          Manual Code: <strong style={{ color: '#374151' }}>{cardCode}</strong>
        </p>

        {/* Footer */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '4.5pt', color: '#9CA3AF' }}>Valid until: {monthYear}</p>
          <p style={{ margin: '1pt 0 0', fontSize: '4pt', color: '#D1D5DB' }}>Scan to contact vehicle owner securely</p>
        </div>
      </div>
    </>
  );
}
