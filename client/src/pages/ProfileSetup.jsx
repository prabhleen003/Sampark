import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import api from '../api/axios';

export default function ProfileSetup() {
  const [name, setName]     = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const cardRef  = useRef(null);
  const fieldRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    gsap.from(cardRef.current,  { y: 30, opacity: 0, duration: 0.6, ease: 'power2.out' });
    gsap.from(fieldRef.current, { y: 20, opacity: 0, duration: 0.5, delay: 0.2, ease: 'power2.out' });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put('/users/me', { name });
      gsap.to(cardRef.current, {
        y: -20, opacity: 0, duration: 0.4, ease: 'power2.in',
        onComplete: () => navigate('/dashboard'),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div ref={cardRef} style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>One last thing</h1>
        <p style={{ fontSize: '0.9rem', color: '#4B5563', marginBottom: '1.5rem' }}>What should we call you?</p>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem' }}>
            <p style={{ color: '#DC2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          </div>
        )}

        <form ref={fieldRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoFocus
            style={{ border: '1.5px solid #D1D5DB', borderRadius: '10px', padding: '13px 14px', fontSize: '1rem', color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box' }}
          />
          <button
            type="submit"
            disabled={loading || name.trim().length < 2}
            style={{ backgroundColor: name.trim().length >= 2 && !loading ? '#4F46E5' : '#A5B4FC', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '0.95rem', fontWeight: 600, cursor: name.trim().length >= 2 ? 'pointer' : 'not-allowed' }}
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
