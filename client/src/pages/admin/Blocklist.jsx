import { useEffect, useState } from 'react';
import api from '../../api/axios';

const C = {
  navy:    '#0A0F2C',
  panel:   '#111834',
  teal:    '#00E5A0',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  border:  'rgba(148,163,184,0.12)',
  danger:  '#FF3B5C',
  orange:  '#F97316',
  amber:   '#FB923C',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  return new Date(expiresAt) <= new Date();
}

function TypeBadge({ type }) {
  const cfg = type === 'global'
    ? { color: C.danger,  bg: 'rgba(255,59,92,0.1)',   border: 'rgba(255,59,92,0.3)',  label: 'Global' }
    : { color: C.orange,  bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)', label: 'Vehicle Specific' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px', borderRadius: '999px',
      backgroundColor: cfg.bg, border: `1px solid ${cfg.border}`,
      color: cfg.color, fontSize: '0.72rem', fontWeight: 700,
      fontFamily: font.body,
    }}>
      {cfg.label}
    </span>
  );
}

function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 500, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.panel, border: `1px solid rgba(0,229,160,0.25)`, borderRadius: '14px', padding: '1.5rem', maxWidth: '380px', width: '100%' }}>
        <h3 style={{ margin: '0 0 10px', color: C.textPrimary, fontFamily: font.heading, fontSize: '1rem', fontWeight: 700 }}>Remove block?</h3>
        <p style={{ margin: '0 0 1.25rem', color: C.textSecondary, fontFamily: font.body, fontSize: '0.875rem', lineHeight: 1.6 }}>
          This will immediately allow the caller to contact vehicles again.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontFamily: font.body, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,229,160,0.3)', backgroundColor: 'rgba(0,229,160,0.1)', color: C.teal, fontFamily: font.body, fontWeight: 700, cursor: 'pointer' }}>
            Unblock
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockRow({ block, onUnblock }) {
  const [confirmId, setConfirmId] = useState(null);
  const [removing, setRemoving]   = useState(false);

  async function handleUnblock() {
    setRemoving(true);
    try {
      await api.delete(`/admin/blocklist/${block._id}`);
      onUnblock(block._id);
    } catch {
      alert('Failed to remove block. Please try again.');
    } finally {
      setRemoving(false);
      setConfirmId(null);
    }
  }

  return (
    <>
      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
        <td style={td}>
          <span style={{ fontFamily: font.mono, fontSize: '0.82rem', color: C.textPrimary }}>
            {block.caller_hash ? block.caller_hash.slice(0, 8) + '…' : '—'}
          </span>
        </td>
        <td style={td}><TypeBadge type={block.block_type} /></td>
        <td style={td}>
          <span style={{ fontFamily: font.mono, fontSize: '0.82rem', color: C.textSecondary }}>
            {block.vehicle_id?.plate_number || 'All Vehicles'}
          </span>
        </td>
        <td style={{ ...td, maxWidth: '180px' }}>
          <span style={{ color: C.textSecondary, fontFamily: font.body, fontSize: '0.8rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {block.reason || '—'}
          </span>
        </td>
        <td style={td}>
          <span style={{ color: C.textSecondary, fontFamily: font.body, fontSize: '0.8rem' }}>
            {block.blocked_by?.name || 'System'}
          </span>
        </td>
        <td style={td}>
          <span style={{ color: C.textSecondary, fontFamily: font.body, fontSize: '0.8rem' }}>
            {formatDate(block.created_at)}
          </span>
        </td>
        <td style={td}>
          <span style={{
            color: block.expires_at ? (isExpired(block.expires_at) ? C.textSecondary : C.amber) : C.danger,
            fontFamily: font.body, fontSize: '0.8rem', fontWeight: block.expires_at ? 400 : 600,
          }}>
            {block.expires_at ? formatDate(block.expires_at) : 'Permanent'}
          </span>
        </td>
        <td style={td}>
          {!isExpired(block.expires_at) && (
            <button
              onClick={() => setConfirmId(block._id)}
              disabled={removing}
              style={{
                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer',
                border: '1px solid rgba(0,229,160,0.3)', backgroundColor: 'rgba(0,229,160,0.08)',
                color: C.teal, fontFamily: font.body, fontSize: '0.78rem', fontWeight: 600,
              }}
            >
              {removing ? '…' : 'Unblock'}
            </button>
          )}
        </td>
      </tr>
      {confirmId && (
        <ConfirmModal onConfirm={handleUnblock} onCancel={() => setConfirmId(null)} />
      )}
    </>
  );
}

// ── Suspended Vehicles Section ─────────────────────────────────────────────────
function SuspendedVehicles() {
  const [vehicles, setVehicles]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [unsuspendId, setUnsuspendId] = useState(null);
  const [notes, setNotes]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState('');

  useEffect(() => {
    api.get('/admin/suspended-vehicles')
      .then(r => setVehicles(r.data.vehicles || []))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleUnsuspend() {
    if (!notes.trim()) { setErr('Notes required.'); return; }
    setSaving(true); setErr('');
    try {
      await api.put(`/admin/suspended-vehicles/${unsuspendId}/unsuspend`, { notes: notes.trim() });
      setVehicles(prev => prev.filter(v => v._id !== unsuspendId));
      setUnsuspendId(null);
      setNotes('');
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to unsuspend vehicle.');
    } finally {
      setSaving(false);
    }
  }

  function formatDate2(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ margin: '0 0 0.5rem', fontFamily: font.heading, fontSize: '1.2rem', fontWeight: 700, color: C.textPrimary }}>
        Suspended Vehicles
      </h2>
      <p style={{ margin: '0 0 1rem', color: C.textSecondary, fontFamily: font.body, fontSize: '0.875rem' }}>
        Vehicles whose QR service is currently suspended.
      </p>

      {loading ? (
        <p style={{ color: C.textSecondary, fontFamily: font.body }}>Loading…</p>
      ) : vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: C.textSecondary, fontFamily: font.body, backgroundColor: C.panel, borderRadius: '10px', border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: '1.2rem', margin: '0 0 6px' }}>✓</p>
          <p style={{ margin: 0 }}>No suspended vehicles.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {vehicles.map(v => (
            <div key={v._id} style={{ backgroundColor: C.panel, borderRadius: '10px', border: '1px solid rgba(255,59,92,0.2)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <p style={{ margin: 0, fontFamily: font.mono, fontSize: '1rem', fontWeight: 700, color: C.textPrimary, letterSpacing: '0.05em' }}>{v.plate_number}</p>
                <p style={{ margin: '2px 0 0', fontFamily: font.body, fontSize: '0.8rem', color: C.textSecondary }}>{v.user_id?.name || 'Unknown owner'}</p>
              </div>
              <div style={{ flex: 2, minWidth: '200px' }}>
                <p style={{ margin: 0, fontFamily: font.body, fontSize: '0.8rem', color: C.danger }}>{v.suspension_reason || 'No reason given'}</p>
                <p style={{ margin: '2px 0 0', fontFamily: font.body, fontSize: '0.75rem', color: C.textSecondary }}>Since {formatDate2(v.updated_at)}</p>
              </div>
              <button
                onClick={() => { setUnsuspendId(v._id); setNotes(''); setErr(''); }}
                style={{ padding: '7px 16px', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(0,229,160,0.3)', backgroundColor: 'rgba(0,229,160,0.08)', color: C.teal, fontFamily: font.body, fontSize: '0.82rem', fontWeight: 600 }}
              >
                Unsuspend
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Unsuspend modal */}
      {unsuspendId && (
        <div onClick={() => { setUnsuspendId(null); setNotes(''); setErr(''); }} style={{ position: 'fixed', inset: 0, zIndex: 500, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: C.panel, border: `1px solid rgba(0,229,160,0.25)`, borderRadius: '14px', padding: '1.5rem', maxWidth: '420px', width: '100%' }}>
            <h3 style={{ margin: '0 0 10px', color: C.textPrimary, fontFamily: font.heading, fontSize: '1rem', fontWeight: 700 }}>Unsuspend vehicle</h3>
            <p style={{ margin: '0 0 1rem', color: C.textSecondary, fontFamily: font.body, fontSize: '0.875rem', lineHeight: 1.6 }}>
              Provide notes explaining why you are lifting this suspension.
            </p>
            <textarea
              rows={3}
              value={notes}
              onChange={e => { setNotes(e.target.value); setErr(''); }}
              placeholder="Reason for unsuspending…"
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'rgba(255,255,255,0.04)', color: C.textPrimary, fontSize: '0.875rem', fontFamily: font.body, resize: 'none', outline: 'none', marginBottom: '8px' }}
            />
            {err && <p style={{ margin: '0 0 8px', color: C.danger, fontSize: '0.8rem', fontFamily: font.body }}>{err}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setUnsuspendId(null); setNotes(''); }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: 'transparent', color: C.textSecondary, fontFamily: font.body, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUnsuspend} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,229,160,0.3)', backgroundColor: 'rgba(0,229,160,0.1)', color: C.teal, fontFamily: font.body, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Confirm Unsuspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BlocklistPage() {
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'expired'
  const [typeFilter, setTypeFilter] = useState('');     // '' | 'global' | 'vehicle_specific'
  const [allBlocks, setAllBlocks]   = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/blocklist')
      .then(r => setAllBlocks(r.data.blocks || []))
      .catch(() => setAllBlocks([]))
      .finally(() => setLoading(false));
  }, []);

  function handleUnblock(id) {
    setAllBlocks(prev => prev.filter(b => b._id !== id));
  }

  const now = new Date();
  const filtered = allBlocks
    .filter(b => {
      const expired = b.expires_at && new Date(b.expires_at) <= now;
      if (activeTab === 'active') return !expired;
      return expired;
    })
    .filter(b => !typeFilter || b.block_type === typeFilter);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontFamily: font.heading, fontSize: '1.4rem', fontWeight: 700, color: C.textPrimary }}>
          Blocklist
        </h2>
        <p style={{ margin: '4px 0 0', color: C.textSecondary, fontFamily: font.body, fontSize: '0.875rem' }}>
          Manage blocked callers and platform-wide bans.
        </p>
      </div>

      {/* Tab + Filter row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[{ val: 'active', label: 'Active Blocks' }, { val: 'expired', label: 'Expired Blocks' }].map(({ val, label }) => (
          <button
            key={val}
            onClick={() => setActiveTab(val)}
            style={{
              padding: '8px 18px', borderRadius: '8px', cursor: 'pointer',
              border: `1px solid ${activeTab === val ? 'rgba(0,229,160,0.3)' : C.border}`,
              backgroundColor: activeTab === val ? 'rgba(0,229,160,0.08)' : 'transparent',
              color: activeTab === val ? C.teal : C.textSecondary,
              fontFamily: font.body, fontSize: '0.875rem', fontWeight: activeTab === val ? 700 : 500,
            }}
          >
            {label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          {[{ val: '', label: 'All Types' }, { val: 'global', label: 'Global' }, { val: 'vehicle_specific', label: 'Vehicle' }].map(({ val, label }) => (
            <button
              key={val}
              onClick={() => setTypeFilter(val)}
              style={{
                padding: '6px 14px', borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${typeFilter === val ? 'rgba(148,163,184,0.4)' : C.border}`,
                backgroundColor: typeFilter === val ? 'rgba(148,163,184,0.08)' : 'transparent',
                color: typeFilter === val ? C.textPrimary : C.textSecondary,
                fontFamily: font.body, fontSize: '0.8rem',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ color: C.textSecondary, fontFamily: font.body }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.textSecondary, fontFamily: font.body, backgroundColor: C.panel, borderRadius: '10px', border: `1px solid ${C.border}` }}>
          <p style={{ margin: 0 }}>No {activeTab} blocks{typeFilter ? ` (${typeFilter})` : ''}</p>
        </div>
      ) : (
        <div style={{ backgroundColor: C.panel, borderRadius: '10px', border: `1px solid ${C.border}`, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Caller', 'Type', 'Vehicle', 'Reason', 'Blocked By', 'Created', 'Expires', ''].map(h => (
                  <th key={h} style={{ ...td, color: C.textSecondary, fontFamily: font.body, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', paddingBottom: '10px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(block => (
                <BlockRow key={block._id} block={block} onUnblock={handleUnblock} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Suspended vehicles section */}
      <SuspendedVehicles />
    </div>
  );
}

const td = {
  padding: '10px 14px',
  verticalAlign: 'middle',
};
