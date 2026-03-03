import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Hide on public scan page and login/landing
const HIDDEN_PATHS = ['/', '/login'];

export default function HelpButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (HIDDEN_PATHS.includes(pathname) || pathname.startsWith('/v/')) return null;
  if (!localStorage.getItem('token')) return null;

  function go(to) { navigate(to); setOpen(false); }

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 50 }}>
      {open && (
        <div style={{
          marginBottom: '10px', backgroundColor: '#111834',
          border: '1px solid rgba(148,163,184,0.14)', borderRadius: '10px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)', overflow: 'hidden',
          minWidth: '160px',
        }}>
          {[
            { label: 'Browse FAQ',   to: '/help' },
            { label: 'My Tickets',   to: '/support/tickets' },
            { label: 'New Ticket',   to: '/help#contact' },
          ].map(item => (
            <button key={item.to} onClick={() => go(item.to)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 16px', background: 'none', border: 'none', color: '#F1F5F9', fontSize: '0.88rem', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
              onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#00E5A0', border: 'none', color: '#0A0F2C', fontSize: '1.2rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,229,160,0.35)', fontFamily: "'Space Grotesk', sans-serif" }}
      >
        ?
      </button>
    </div>
  );
}
