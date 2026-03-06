import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ArrowRight, CheckCircle2, RefreshCcw, Loader2 } from 'lucide-react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../utils/firebase';
import api from '../api/axios';

const C = {
  navy:          '#0A0F2C',
  navyDeep:      '#07091E',
  teal:          '#00E5A0',
  tealDim:       'rgba(0,229,160,0.2)',
  tealDimText:   'rgba(0,229,160,0.5)',
  tealBorder:    'rgba(0,229,160,0.25)',
  tealBg:        'rgba(0,229,160,0.05)',
  tealGlow:      '0 0 0 3px rgba(0,229,160,0.1)',
  textPrimary:   '#F1F5F9',
  textSecondary: '#94A3B8',
  inputBg:       'rgba(30,41,59,0.6)',
  inputBorder:   'rgba(148,163,184,0.2)',
  prefixBg:      'rgba(7,9,30,0.4)',
  prefixBorder:  'rgba(148,163,184,0.12)',
  errorBg:       'rgba(255,59,92,0.1)',
  errorBorder:   'rgba(255,59,92,0.25)',
  errorText:     '#FF3B5C',
  footerBorder:  'rgba(148,163,184,0.12)',
  cardBg:        'rgba(17,24,52,0.8)',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

export default function Login() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusPhone, setFocusPhone] = useState(false);
  const [focusOtp, setFocusOtp] = useState(false);

  const navigate = useNavigate();
  const recaptchaRef = useRef(null);
  const confirmationRef = useRef(null);

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (recaptchaRef.current) {
        recaptchaRef.current.clear();
        recaptchaRef.current = null;
      }
      recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      const confirmation = await signInWithPhoneNumber(auth, `+91${phone}`, recaptchaRef.current);
      confirmationRef.current = confirmation;
      setStep('otp');
    } catch (err) {
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
      const msg = err.code === 'auth/invalid-phone-number'
        ? 'Invalid phone number. Enter a valid 10-digit Indian number.'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please try again later.'
        : err.message || 'Failed to send OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!confirmationRef.current) {
        setStep('phone');
        setError('Session expired. Please request a new OTP.');
        setLoading(false);
        return;
      }
      const result = await confirmationRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();
      const { data } = await api.post('/auth/firebase-verify', { id_token: idToken });
      if (data.success) {
        localStorage.setItem('token', data.token);
        navigate(data.isNewUser ? '/profile-setup' : '/dashboard');
      }
    } catch (err) {
      const msg = err.code === 'auth/invalid-verification-code'
        ? 'Incorrect OTP. Please try again.'
        : err.code === 'auth/code-expired'
        ? 'OTP expired. Go back and request a new one.'
        : err.response?.data?.message || 'Verification failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const phoneInputBorder = focusPhone ? `2px solid ${C.teal}` : `2px solid ${C.inputBorder}`;
  const phoneInputBg     = focusPhone ? C.tealBg : C.inputBg;
  const phoneInputShadow = focusPhone ? C.tealGlow : 'none';
  const otpInputBorder   = focusOtp ? `2px solid ${C.teal}` : `2px solid ${C.inputBorder}`;
  const otpInputBg       = focusOtp ? C.tealBg : C.inputBg;
  const otpInputShadow   = focusOtp ? C.tealGlow : 'none';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: C.navy,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative', overflow: 'hidden',
      fontFamily: font.body,
    }}>
      {/* Invisible reCAPTCHA mount point */}
      <div id="recaptcha-container" />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
      }} />

      {/* Glow orbs */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '20%', right: '25%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,160,0.15) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0, filter: 'blur(50px)',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{
          position: 'absolute', bottom: '10%', left: '20%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(103,183,255,0.1) 0%, transparent 70%)',
          pointerEvents: 'none', zIndex: 0, filter: 'blur(50px)',
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '440px',
          backgroundColor: C.cardBg,
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '28px',
          padding: '48px 40px',
          border: `1px solid ${C.tealBorder}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15, delay: 0.2 }}
            style={{
              width: '64px', height: '64px', borderRadius: '16px',
              backgroundColor: 'rgba(0,229,160,0.1)',
              border: '1px solid rgba(0,229,160,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '24px',
            }}
          >
            <ShieldCheck style={{ width: '32px', height: '32px', color: C.teal }} />
          </motion.div>

          <h1 style={{
            fontFamily: font.heading, fontSize: '1.875rem', fontWeight: 800,
            color: C.textPrimary, margin: '0 0 8px', letterSpacing: '-0.02em',
          }}>
            Sam<span style={{ color: C.teal }}>park</span>
          </h1>
          <p style={{ color: C.textSecondary, textAlign: 'center', fontSize: '0.875rem', margin: 0, padding: '0 1rem' }}>
            {step === 'phone'
              ? 'Enter your mobile number to securely access your dashboard.'
              : `Secure OTP sent to +91 ${phone}`}
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              style={{
                backgroundColor: C.errorBg,
                border: `1px solid ${C.errorBorder}`,
                borderRadius: '12px', padding: '12px',
                marginBottom: '1.5rem', textAlign: 'center',
              }}
            >
              <p style={{ color: C.errorText, fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Forms */}
        <div style={{ position: 'relative', width: '100%' }}>
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.form
                key="phone-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSendOtp}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {/* Phone input */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  borderRadius: '12px', overflow: 'hidden',
                  border: phoneInputBorder,
                  backgroundColor: phoneInputBg,
                  boxShadow: phoneInputShadow,
                  transition: 'all 0.3s',
                }}>
                  <span style={{
                    fontFamily: font.mono, fontWeight: 700, color: C.teal,
                    padding: '16px', borderRight: `1px solid ${C.prefixBorder}`,
                    backgroundColor: C.prefixBg, whiteSpace: 'nowrap',
                  }}>
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setFocusPhone(true)}
                    onBlur={() => setFocusPhone(false)}
                    placeholder="98765 43210"
                    autoFocus
                    style={{
                      flex: 1, backgroundColor: 'transparent',
                      border: 'none', outline: 'none',
                      color: C.textPrimary, padding: '16px',
                      fontFamily: font.mono, fontSize: '1.125rem',
                      letterSpacing: '0.05em',
                    }}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || phone.length !== 10}
                  whileHover={phone.length === 10 && !loading ? { scale: 1.02 } : {}}
                  whileTap={phone.length === 10 && !loading ? { scale: 0.98 } : {}}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                    backgroundColor: phone.length === 10 && !loading ? C.teal : C.tealDim,
                    color: phone.length === 10 && !loading ? C.navyDeep : C.tealDimText,
                    fontWeight: 700, fontSize: '1rem',
                    cursor: phone.length === 10 && !loading ? 'pointer' : 'not-allowed',
                    fontFamily: font.body,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.3s',
                  }}
                >
                  {loading ? (
                    <><Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> Sending...</>
                  ) : (
                    <>Send OTP <ArrowRight style={{ width: '20px', height: '20px' }} /></>
                  )}
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="otp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleVerifyOtp}
                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                {/* OTP input */}
                <div style={{
                  borderRadius: '12px', overflow: 'hidden',
                  border: otpInputBorder,
                  backgroundColor: otpInputBg,
                  boxShadow: otpInputShadow,
                  transition: 'all 0.3s',
                }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setFocusOtp(true)}
                    onBlur={() => setFocusOtp(false)}
                    placeholder="• • • • • •"
                    autoFocus
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      backgroundColor: 'transparent', border: 'none', outline: 'none',
                      color: C.textPrimary, textAlign: 'center',
                      padding: '16px', fontFamily: font.mono,
                      fontSize: '1.5rem', letterSpacing: '0.5em',
                    }}
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  whileHover={otp.length === 6 && !loading ? { scale: 1.02 } : {}}
                  whileTap={otp.length === 6 && !loading ? { scale: 0.98 } : {}}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
                    backgroundColor: otp.length === 6 && !loading ? C.teal : C.tealDim,
                    color: otp.length === 6 && !loading ? C.navyDeep : C.tealDimText,
                    fontWeight: 700, fontSize: '1rem',
                    cursor: otp.length === 6 && !loading ? 'pointer' : 'not-allowed',
                    fontFamily: font.body,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.3s',
                  }}
                >
                  {loading ? (
                    <><Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> Verifying...</>
                  ) : (
                    <>Verify Identity <CheckCircle2 style={{ width: '20px', height: '20px' }} /></>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                  style={{
                    marginTop: '8px', background: 'none', border: 'none',
                    color: C.textSecondary, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    fontSize: '0.875rem', fontFamily: font.body,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
                  onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
                >
                  <RefreshCcw style={{ width: '16px', height: '16px' }} /> Change Mobile Number
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '2rem', paddingTop: '1.5rem',
          borderTop: `1px solid ${C.footerBorder}`,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '12px', opacity: 0.6,
        }}>
          <ShieldCheck style={{ width: '16px', height: '16px', color: C.teal }} />
          <p style={{
            fontFamily: font.mono, fontSize: '0.75rem', color: C.teal,
            letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, margin: 0,
          }}>
            End-to-End Encrypted
          </p>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
