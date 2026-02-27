import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import api from '../api/axios';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  bg: '#FFFBEB', color: '#92400E', border: '#FCD34D' },
  verified: { label: 'Verified', bg: '#F0FDF4', color: '#166534', border: '#86EFAC' },
  rejected: { label: 'Rejected', bg: '#FEF2F2', color: '#991B1B', border: '#FCA5A5' },
};

function VehicleCard({ vehicle }) {
  const cfg = STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.pending;
  const isRejected = vehicle.status === 'rejected';

  return (
    <div style={{
      backgroundColor: '#fff',
      border: `1px solid ${isRejected ? '#FCA5A5' : '#E5E7EB'}`,
      borderLeft: isRejected ? '4px solid #EF4444' : '1px solid #E5E7EB',
      borderRadius: '12px',
      padding: '1.2rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>{vehicle.plate_number}</span>
        <span style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: '999px', padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600 }}>
          {cfg.label}
        </span>
      </div>

      {isRejected && vehicle.rejection_reason && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px' }}>
          <p style={{ color: '#991B1B', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 2px' }}>Rejection reason:</p>
          <p style={{ color: '#DC2626', fontSize: '0.82rem', margin: 0 }}>{vehicle.rejection_reason}</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: isRejected ? '14px' : 0 }}>
        {[['RC', vehicle.rc_doc_url], ['DL', vehicle.dl_doc_url], ['Plate', vehicle.plate_photo_url]].map(([label, url]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '4px' }}>{label}</p>
            {url?.endsWith('.pdf') ? (
              <a href={`http://localhost:5000${url}`} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '56px', backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px', fontSize: '0.78rem', color: '#4338CA', fontWeight: 600, textDecoration: 'none' }}>
                PDF
              </a>
            ) : (
              <img src={`http://localhost:5000${url}`} alt={label}
                style={{ height: '56px', width: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E5E7EB' }} />
            )}
          </div>
        ))}
      </div>

      {isRejected && (
        <Link to={`/vehicles/resubmit/${vehicle._id}`} style={{
          display: 'block', textAlign: 'center',
          backgroundColor: '#4F46E5', color: '#fff',
          borderRadius: '8px', padding: '10px',
          fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none',
        }}>
          Re-upload Documents →
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser]         = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const navigate  = useNavigate();
  const cardsRef  = useRef(null);

  useEffect(() => {
    Promise.all([api.get('/users/me'), api.get('/vehicles')])
      .then(([userRes, vehiclesRes]) => {
        const u = userRes.data.user;
        if (!u.profile_complete) { navigate('/profile-setup'); return; }
        setUser(u);
        setVehicles(vehiclesRes.data.vehicles);
      })
      .catch(() => { localStorage.removeItem('token'); navigate('/login'); });
  }, [navigate]);

  useEffect(() => {
    if (vehicles.length > 0 && cardsRef.current) {
      gsap.from(cardsRef.current.children, { y: 20, duration: 0.4, stagger: 0.1, ease: 'power2.out' });
    }
  }, [vehicles]);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Loading…</p>
      </div>
    );
  }

  const canAddMore = vehicles.filter(v => v.status !== 'rejected').length < 2;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>Hey, {user.name} 👋</h1>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '2px' }}>+91 {user.phone_hash}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {user.role === 'admin' && (
              <Link to="/admin" style={{ border: '1px solid #4F46E5', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, color: '#4F46E5', backgroundColor: '#EEF2FF', textDecoration: 'none' }}>
                Admin
              </Link>
            )}
            <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
              style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 500, color: '#374151', backgroundColor: '#fff', cursor: 'pointer' }}>
              Log out
            </button>
          </div>
        </div>

        {/* Vehicles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', margin: 0 }}>Your Vehicles</h2>
          {canAddMore && (
            <Link to="/vehicles/register"
              style={{ backgroundColor: '#4F46E5', color: '#fff', borderRadius: '8px', padding: '8px 14px', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              + Add Vehicle
            </Link>
          )}
        </div>

        {vehicles.length === 0 ? (
          <div style={{ backgroundColor: '#fff', border: '2px dashed #D1D5DB', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#6B7280', fontSize: '0.9rem', margin: 0 }}>No vehicles registered yet.</p>
            <Link to="/vehicles/register" style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.9rem', color: '#4F46E5', fontWeight: 600 }}>
              Register your first vehicle →
            </Link>
          </div>
        ) : (
          <div ref={cardsRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {vehicles.map((v) => <VehicleCard key={v._id} vehicle={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}
