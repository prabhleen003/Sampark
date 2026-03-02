import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const S = {
  navy:   '#0A0F2C',
  slate:  '#1E293B',
  teal:   '#00E5A0',
  text:   '#F1F5F9',
  muted:  '#94A3B8',
  border: 'rgba(148,163,184,0.12)',
  danger: '#FF3B5C',
};

export default function AdminLayout() {
  const [admin, setAdmin]                     = useState(null);
  const [suspendedCount, setSuspendedCount]   = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/users/me').then(r => {
      const u = r.data.user;
      if (u.role !== 'admin') { navigate('/dashboard'); return; }
      setAdmin(u);
    }).catch(() => { localStorage.removeItem('token'); navigate('/login'); });
  }, [navigate]);

  // Poll for auto-suspended vehicles to show alert banner
  useEffect(() => {
    function check() {
      api.get('/admin/suspended-vehicles').then(r => {
        setSuspendedCount(r.data.vehicles?.length || 0);
      }).catch(() => {});
    }
    check();
    const interval = setInterval(check, 60000); // re-check every minute
    return () => clearInterval(interval);
  }, []);

  if (!admin) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: S.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: S.muted, fontFamily: "'Inter', sans-serif" }}>Loading…</p>
      </div>
    );
  }

  const navItems = [
    { to: '/admin/verifications', label: 'Flagged Reviews', icon: '🔍' },
    { to: '/admin/orders',        label: 'Orders',          icon: '📦' },
    { to: '/admin/abuse-reports', label: 'Abuse Reports',   icon: '🚨' },
    { to: '/admin/blocklist',     label: 'Blocklist',       icon: '🛡️' },
  ];

  const linkStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 14px', borderRadius: '8px',
    fontFamily: "'Inter', sans-serif", fontSize: '0.9rem', fontWeight: 500,
    color: isActive ? S.teal : S.muted,
    backgroundColor: isActive ? 'rgba(0,229,160,0.08)' : 'transparent',
    textDecoration: 'none',
    transition: 'background 0.2s, color 0.2s',
    border: isActive ? '1px solid rgba(0,229,160,0.18)' : '1px solid transparent',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0D1438' }}>

      {/* Sidebar */}
      <aside style={{
        width: '220px', flexShrink: 0,
        backgroundColor: S.navy,
        borderRight: `1px solid ${S.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '24px 16px',
      }}>
        <div style={{ marginBottom: '32px' }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.2rem', color: S.text }}>
            Sam<span style={{ color: S.teal }}>park</span>
          </span>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: S.teal, margin: '4px 0 0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Admin Panel
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {navItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => linkStyle(isActive)}>
              <span>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: user + logout */}
        <div style={{ borderTop: `1px solid ${S.border}`, paddingTop: '16px' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: S.muted, margin: '0 0 10px', wordBreak: 'break-all' }}>
            {admin.name || admin.phone_hash}
          </p>
          <button
            onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
            style={{
              width: '100%', border: `1px solid ${S.border}`,
              borderRadius: '8px', padding: '8px',
              fontFamily: "'Inter', sans-serif", fontSize: '0.82rem',
              color: S.muted, backgroundColor: 'transparent', cursor: 'pointer',
            }}>
            Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>

        {/* Top bar */}
        <div style={{
          padding: '18px 32px',
          borderBottom: `1px solid ${S.border}`,
          backgroundColor: S.navy,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.1rem', fontWeight: 700, color: S.text, margin: 0 }}>
            Admin Panel
          </h1>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: S.muted }}>
            Signed in as <strong style={{ color: S.teal }}>{admin.name || 'Admin'}</strong>
          </span>
        </div>

        {/* Auto-suspension alert banner */}
        {suspendedCount > 0 && (
          <div
            onClick={() => navigate('/admin/blocklist')}
            style={{
              padding: '12px 32px',
              backgroundColor: 'rgba(255,59,92,0.08)',
              borderBottom: '1px solid rgba(255,59,92,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.875rem', color: S.danger, fontWeight: 600 }}>
              🚨 {suspendedCount} vehicle{suspendedCount > 1 ? 's' : ''} auto-suspended due to excessive abuse reports.
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: S.danger, fontWeight: 700, textDecoration: 'underline' }}>
              Review now →
            </span>
          </div>
        )}

        <div style={{ padding: '32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
