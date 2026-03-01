import { useEffect, useState } from 'react';
import api from '../../api/axios';

const C = {
  navy: '#0A0F2C',
  slate: '#1E293B',
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

const STATUS_TABS = ['All', 'Paid', 'Processing', 'Shipped', 'Delivered'];
const STATUS_VALUES = { All: '', Paid: 'paid', Processing: 'processing', Shipped: 'shipped', Delivered: 'delivered' };

function statusBadge(status) {
  const map = {
    paid: { bg: 'rgba(103,183,255,0.1)', color: C.accent, border: 'rgba(103,183,255,0.25)' },
    processing: { bg: 'rgba(251,146,60,0.1)', color: '#FB923C', border: 'rgba(251,146,60,0.25)' },
    shipped: { bg: 'rgba(0,229,160,0.1)', color: C.teal, border: C.borderTeal },
    delivered: { bg: 'rgba(148,163,184,0.08)', color: C.textSecondary, border: C.border },
  };
  return map[status] || { bg: 'rgba(148,163,184,0.08)', color: C.textSecondary, border: C.border };
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function OrderRow({ order, onUpdate }) {
  const [selectedStatus, setSelectedStatus] = useState(order.status);
  const [trackingId, setTrackingId] = useState(order.tracking_id || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  async function handleUpdate() {
    if (selectedStatus === 'shipped' && !trackingId.trim()) {
      setToast('Tracking ID is required when status is Shipped.'); return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/orders/${order._id}`, {
        status: selectedStatus,
        tracking_id: trackingId.trim() || undefined,
      });
      if (data.success) {
        setToast('Order updated.');
        onUpdate(data.order);
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) {
      setToast(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  const sb = statusBadge(order.status);

  return (
    <div style={{ backgroundColor: C.slate, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px 24px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <div>
          <span style={{ fontFamily: font.mono, fontWeight: 700, fontSize: '0.95rem', color: C.textPrimary }}>
            {order.vehicle_id?.plate_number || '—'}
          </span>
          <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: C.textSecondary }}>{formatDate(order.created_at)}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '999px', backgroundColor: order.type === 'express' ? 'rgba(103,183,255,0.1)' : 'rgba(148,163,184,0.08)', color: order.type === 'express' ? C.accent : C.textSecondary, border: `1px solid ${order.type === 'express' ? 'rgba(103,183,255,0.25)' : C.border}` }}>
            {order.type === 'express' ? 'Express' : 'Standard'}
          </span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '999px', backgroundColor: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>
            {order.status}
          </span>
        </div>
      </div>

      <div style={{ fontSize: '0.82rem', color: C.textSecondary, marginBottom: '10px' }}>
        <p style={{ margin: '2px 0' }}><strong style={{ color: C.textPrimary }}>{order.user_id?.name || '—'}</strong></p>
        <p style={{ margin: '2px 0' }}>
          {order.delivery_address.line1}{order.delivery_address.line2 ? `, ${order.delivery_address.line2}` : ''},{' '}
          {order.delivery_address.city}, {order.delivery_address.state} — {order.delivery_address.pincode}
        </p>
        <p style={{ margin: '2px 0' }}>📱 {order.delivery_address.phone}</p>
        {order.tracking_id && (
          <p style={{ margin: '4px 0 0', color: C.teal, fontWeight: 600 }}>Tracking: {order.tracking_id}</p>
        )}
      </div>

      {/* Status update controls */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '0.85rem', color: C.textPrimary, cursor: 'pointer', backgroundColor: C.navy, fontFamily: font.body }}
        >
          {['paid', 'processing', 'shipped', 'delivered'].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        {selectedStatus === 'shipped' && (
          <input
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            placeholder="Tracking ID"
            style={{ flex: 1, minWidth: '140px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${C.border}`, fontSize: '0.85rem', color: C.textPrimary, backgroundColor: C.navy, fontFamily: font.body }}
          />
        )}

        <button
          onClick={handleUpdate}
          disabled={saving || selectedStatus === order.status}
          style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', backgroundColor: saving || selectedStatus === order.status ? C.slate : C.teal, color: saving || selectedStatus === order.status ? C.textSecondary : C.navy, fontWeight: 600, fontSize: '0.85rem', cursor: saving || selectedStatus === order.status ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', fontFamily: font.body }}
        >
          {saving ? 'Saving…' : 'Update'}
        </button>
      </div>

      {toast && (
        <p style={{ fontSize: '0.8rem', color: toast.includes('updated') ? C.teal : C.danger, marginTop: '8px', marginBottom: 0, fontFamily: font.body }}>{toast}</p>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    const statusParam = STATUS_VALUES[activeTab];
    const url = statusParam ? `/admin/orders?status=${statusParam}` : '/admin/orders';
    setLoading(true);
    api.get(url)
      .then(r => setOrders(r.data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

  function handleUpdate(updatedOrder) {
    setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
  }

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontFamily: font.heading, fontSize: '1.6rem', fontWeight: 700, color: C.textPrimary, margin: '0 0 4px' }}>Physical Card Orders</h2>
        <p style={{ fontFamily: font.body, fontSize: '0.9rem', color: C.textSecondary, margin: 0 }}>Manage printing and shipping for customer orders.</p>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem', flexWrap: 'wrap', backgroundColor: C.navy, borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontFamily: font.body, fontSize: '0.88rem', fontWeight: 600,
              backgroundColor: activeTab === tab ? C.slate : 'transparent',
              color: activeTab === tab ? C.textPrimary : C.textSecondary,
              textTransform: 'capitalize',
              transition: 'background 0.2s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading && <p style={{ fontFamily: font.body, color: C.textSecondary, fontSize: '0.88rem', textAlign: 'center', padding: '2rem 0' }}>Loading…</p>}

      {!loading && orders.length === 0 && (
        <div style={{ backgroundColor: C.slate, border: `2px dashed ${C.border}`, borderRadius: '14px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📭</p>
          <p style={{ fontFamily: font.body, color: C.textSecondary, fontSize: '0.88rem', margin: 0 }}>No orders in this category.</p>
        </div>
      )}

      {!loading && orders.map(order => (
        <OrderRow key={order._id} order={order} onUpdate={handleUpdate} />
      ))}
    </div>
  );
}
