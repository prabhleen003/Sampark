import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import api from '../api/axios';

export default function Login() {
  const [step, setStep]     = useState('phone');
  const [phone, setPhone]   = useState('');
  const [otp, setOtp]       = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const cardRef      = useRef(null);
  const phoneFieldRef = useRef(null);
  const otpFieldRef  = useRef(null);
  const navigate     = useNavigate();

  useEffect(() => {
    gsap.from(cardRef.current, { y: 30, opacity: 0, duration: 0.6, ease: 'power2.out' });
  }, []);

  useEffect(() => {
    if (step === 'otp') {
      gsap.fromTo(otpFieldRef.current,
        { x: 60, opacity: 0 },
        { x: 0,  opacity: 1, duration: 0.35, ease: 'power2.out' }
      );
    }
  }, [step]);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      if (data.success) {
        if (data.otp) setOtp(data.otp);
        gsap.to(phoneFieldRef.current, {
          x: -60, opacity: 0, duration: 0.3, ease: 'power2.in',
          onComplete: () => setStep('otp'),
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp });
      if (data.success) {
        localStorage.setItem('token', data.token);
        navigate(data.isNewUser ? '/profile-setup' : '/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div ref={cardRef} style={{ width: '100%', maxWidth: '380px', backgroundColor: '#ffffff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Sampark</h1>
        <p style={{ fontSize: '0.9rem', color: '#4B5563', marginBottom: '1.5rem' }}>
          {step === 'phone' ? 'Enter your mobile number to continue' : `OTP sent to +91 ${phone}`}
        </p>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem' }}>
            <p style={{ color: '#DC2626', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          </div>
        )}

        {step === 'phone' && (
          <form ref={phoneFieldRef} onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #D1D5DB', borderRadius: '10px', padding: '0 14px', backgroundColor: '#fff' }}>
              <span style={{ color: '#374151', fontWeight: 600, paddingRight: '8px', borderRight: '1px solid #E5E7EB', marginRight: '8px', fontSize: '0.95rem' }}>+91</span>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="98765 43210"
                autoFocus
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', color: '#111827', padding: '12px 0', backgroundColor: 'transparent' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || phone.length !== 10}
              style={{ backgroundColor: phone.length === 10 && !loading ? '#4F46E5' : '#A5B4FC', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '0.95rem', fontWeight: 600, cursor: phone.length === 10 ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form ref={otpFieldRef} onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="• • • • • •"
              autoFocus
              style={{ border: '1.5px solid #D1D5DB', borderRadius: '10px', padding: '13px', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.3em', color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box' }}
            />
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              style={{ backgroundColor: otp.length === 6 && !loading ? '#4F46E5' : '#A5B4FC', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '0.95rem', fontWeight: 600, cursor: otp.length === 6 ? 'pointer' : 'not-allowed' }}
            >
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.85rem', cursor: 'pointer', padding: '4px' }}
            >
              Change number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
