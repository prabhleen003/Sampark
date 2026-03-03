import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios';

const C = {
  bg:            '#0A0F2C',
  card:          '#0D1438',
  panel:         '#111834',
  border:        'rgba(148,163,184,0.12)',
  teal:          '#00E5A0',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  danger:        '#FF3B5C',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

const CATEGORIES = [
  { value: 'account',   label: 'Account' },
  { value: 'vehicle',   label: 'Vehicle' },
  { value: 'payment',   label: 'Payment' },
  { value: 'qr',        label: 'QR Code' },
  { value: 'calling',   label: 'Calling' },
  { value: 'messaging', label: 'Messaging' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'order',     label: 'Orders' },
  { value: 'technical', label: 'Technical' },
  { value: 'other',     label: 'Other' },
];

export default function Help() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preCategory = searchParams.get('category') || '';
  const contactRef = useRef(null);

  const [faq, setFaq]             = useState([]);
  const [search, setSearch]       = useState('');
  const [openCat, setOpenCat]     = useState(null);
  const [openQ, setOpenQ]         = useState(null);
  const [vehicles, setVehicles]   = useState([]);

  // Ticket form state
  const [subject, setSubject]     = useState('');
  const [category, setCategory]   = useState(preCategory);
  const [vehicleId, setVehicleId] = useState('');
  const [message, setMessage]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    document.title = 'Help & FAQ — Sampaark';
    return () => { document.title = 'Sampaark'; };
  }, []);

  useEffect(() => {
    api.get('/support/faq').then(r => setFaq(r.data.faq?.categories || [])).catch(() => {});
    const token = localStorage.getItem('token');
    if (token) api.get('/vehicles').then(r => setVehicles(r.data.vehicles || [])).catch(() => {});
  }, []);

  // Auto-scroll to contact form if ?category= present
  useEffect(() => {
    if (preCategory && contactRef.current) {
      setTimeout(() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, [preCategory, faq.length]);

  const searchActive = search.trim().length > 0;
  const searchLower  = search.toLowerCase();

  function matchesSearch(q) {
    return q.question.toLowerCase().includes(searchLower) || q.answer.toLowerCase().includes(searchLower);
  }

  const filteredFaq = faq.map(cat => ({
    ...cat,
    questions: searchActive ? cat.questions.filter(matchesSearch) : cat.questions,
  })).filter(cat => !searchActive || cat.questions.length > 0);

  const hasResults = filteredFaq.some(c => c.questions.length > 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!subject.trim() || !category || !message.trim()) {
      setSubmitErr('Subject, category, and message are required'); return;
    }
    setSubmitting(true); setSubmitErr(''); setSuccessMsg('');
    try {
      const { data } = await api.post('/support', {
        subject: subject.trim(), category, message: message.trim(),
        vehicle_id: vehicleId || undefined,
      });
      setSuccessMsg(`Ticket ${data.ticket.ticket_number} created! We'll respond within 24 hours.`);
      setSubject(''); setCategory(preCategory); setVehicleId(''); setMessage('');
    } catch (err) {
      setSubmitErr(err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, fontFamily: font.body, color: C.textPrimary }}>

      {/* Nav */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: C.textSecondary, cursor: 'pointer', fontSize: '1.1rem' }}>←</button>
        <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: '1.1rem', color: C.textPrimary }}>Help & FAQ</span>
        <Link to="/support/tickets" style={{ marginLeft: 'auto', color: C.teal, fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>
          My Tickets →
        </Link>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Search */}
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search for help…"
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', borderRadius: '10px', border: `1px solid ${C.border}`, backgroundColor: C.panel, color: C.textPrimary, fontSize: '0.95rem', outline: 'none', marginBottom: '2rem' }}
        />

        {/* FAQ */}
        <h2 style={{ fontFamily: font.heading, fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1.25rem', color: C.textPrimary }}>
          Frequently Asked Questions
        </h2>

        {!hasResults && searchActive && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: C.textSecondary }}>
            <p style={{ marginBottom: '8px' }}>No matching questions found.</p>
            <button onClick={() => contactRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ background: 'none', border: 'none', color: C.teal, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
              Contact support below →
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '3rem' }}>
          {filteredFaq.map(cat => {
            const isOpen = searchActive || openCat === cat.name;
            return (
              <div key={cat.name} style={{ backgroundColor: C.panel, border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => { if (!searchActive) setOpenCat(isOpen ? null : cat.name); setOpenQ(null); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', color: C.textPrimary, cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{cat.icon}</span> {cat.name}
                    <span style={{ fontSize: '0.72rem', color: C.textSecondary }}>({cat.questions.length})</span>
                  </span>
                  <span style={{ color: C.textSecondary, fontSize: '0.85rem' }}>{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}` }}>
                    {cat.questions.map(q => {
                      const qOpen = openQ === q.id;
                      return (
                        <div key={q.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                          <button
                            onClick={() => setOpenQ(qOpen ? null : q.id)}
                            style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: qOpen ? 'rgba(0,229,160,0.04)' : 'none', border: 'none', color: qOpen ? C.teal : C.textPrimary, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}
                          >
                            <span>{q.question}</span>
                            <span style={{ flexShrink: 0, fontSize: '0.8rem', marginTop: '1px' }}>{qOpen ? '−' : '+'}</span>
                          </button>
                          {qOpen && (
                            <div style={{ padding: '0 16px 14px', color: C.textSecondary, fontSize: '0.85rem', lineHeight: 1.7 }}>
                              {q.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact Support */}
        <div ref={contactRef} style={{ scrollMarginTop: '80px' }}>
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '2rem', marginBottom: '1.25rem' }}>
            <h2 style={{ fontFamily: font.heading, fontSize: '1.15rem', fontWeight: 700, margin: '0 0 4px' }}>
              Still need help? Contact us
            </h2>
            <p style={{ color: C.textSecondary, fontSize: '0.85rem', margin: 0 }}>We respond to all tickets within 24 hours.</p>
          </div>

          {successMsg && (
            <div style={{ backgroundColor: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', color: C.teal, fontSize: '0.9rem', fontWeight: 600 }}>
              ✓ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: C.textSecondary, display: 'block', marginBottom: '5px' }}>Category *</label>
                <select value={category} onChange={e => setCategory(e.target.value)} required
                  style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.panel, color: category ? C.textPrimary : C.textSecondary, fontSize: '0.9rem', outline: 'none' }}>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {vehicles.length > 0 && (
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: C.textSecondary, display: 'block', marginBottom: '5px' }}>Vehicle (optional)</label>
                  <select value={vehicleId} onChange={e => setVehicleId(e.target.value)}
                    style={{ width: '100%', padding: '11px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.panel, color: C.textPrimary, fontSize: '0.9rem', outline: 'none' }}>
                    <option value="">Not vehicle-specific</option>
                    {vehicles.map(v => <option key={v._id} value={v._id}>{v.plate_number}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.8rem', color: C.textSecondary }}>Subject *</label>
                <span style={{ fontSize: '0.75rem', color: subject.length > 180 ? C.danger : C.textSecondary }}>{subject.length}/200</span>
              </div>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value.slice(0, 200))} required placeholder="Brief description of your issue"
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.panel, color: C.textPrimary, fontSize: '0.9rem', outline: 'none' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label style={{ fontSize: '0.8rem', color: C.textSecondary }}>Message *</label>
                <span style={{ fontSize: '0.75rem', color: message.length > 1900 ? C.danger : C.textSecondary }}>{message.length}/2000</span>
              </div>
              <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, 2000))} required placeholder="Describe the issue in detail…"
                style={{ width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: '8px', border: `1px solid ${C.border}`, backgroundColor: C.panel, color: C.textPrimary, fontSize: '0.9rem', outline: 'none', resize: 'vertical', minHeight: '120px' }} />
            </div>

            {submitErr && <p style={{ color: C.danger, fontSize: '0.85rem', margin: 0 }}>{submitErr}</p>}

            <button type="submit" disabled={submitting}
              style={{ padding: '13px', borderRadius: '10px', border: 'none', backgroundColor: submitting ? 'rgba(0,229,160,0.4)' : C.teal, color: '#0A0F2C', fontWeight: 700, fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: font.body }}>
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
