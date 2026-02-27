import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ArrowRight, CheckCircle2, RefreshCcw, Loader2 } from 'lucide-react';
import api from '../api/axios';

// --- Design Tokens (matching Landing) ---
const C = {
  navy: '#0A0F2C',
  navyLight: '#0D1438',
  navyDeep: '#07091E',
  slate: '#1E293B',
  panel: '#111834',
  teal: '#00E5A0',
  tealDark: '#00CC8E',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: 'rgba(148,163,184,0.12)',
  borderTeal: 'rgba(0,229,160,0.25)',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// --- Particle Background ---
function ParticleBackground() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = 30;
    const pts = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.2,
      dy: (Math.random() - 0.5) * 0.2,
      o: Math.random() * 0.4 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 229, 160, ${p.o})`;
        ctx.fill();
      });

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(0, 229, 160, ${0.05 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0
    }} />
  );
}

export default function Login() {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusPhone, setFocusPhone] = useState(false);
  const [focusOtp, setFocusOtp] = useState(false);

  const navigate = useNavigate();

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/send-otp', { phone });
      if (data.success) {
        if (data.otp) setOtp(data.otp); // DEV: prepopulate if backend returns it
        setStep('otp');
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
    <div style={{
      minHeight: '100vh',
      backgroundColor: C.navy,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      position: 'relative', overflow: 'hidden',
      fontFamily: font.body,
    }}>
      <ParticleBackground />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)'
      }} />

      {/* Glow Orbs */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: '20%', right: '25%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,160,0.15) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0, filter: 'blur(50px)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ position: 'absolute', bottom: '10%', left: '20%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(103,183,255,0.1) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0, filter: 'blur(50px)' }}
      />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '440px',
          backgroundColor: 'rgba(17,24,52,0.8)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '28px',
          padding: '48px 40px',
          border: `1px solid ${C.borderTeal}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
        }}
      >
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, delay: 0.2 }}
            className="w-16 h-16 rounded-2xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center mb-6"
          >
            <ShieldCheck className="w-8 h-8 text-teal-400" />
          </motion.div>

          <h1 style={{ fontFamily: font.heading }} className="text-3xl font-extrabold text-white tracking-tight mb-2">
            Sam<span className="text-teal-400">park</span>
          </h1>
          <p className="text-slate-400 text-center text-sm px-4">
            {step === 'phone' ? 'Enter your mobile number to securely access your dashboard.' : `Secure OTP sent to +91 ${phone}`}
          </p>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6 text-center"
            >
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Forms Container */}
        <div className="relative w-full">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.form
                key="phone-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleSendOtp}
                className="flex flex-col gap-4"
              >
                <div
                  className={`flex items-center rounded-xl overflow-hidden transition-all duration-300 border-2 ${focusPhone ? 'bg-teal-400/5 border-teal-400 shadow-[0_0_0_3px_rgba(0,229,160,0.1)]' : 'bg-slate-800/60 border-slate-700/50'}`}
                >
                  <span className="font-mono font-bold text-teal-400 px-4 py-4 border-r border-slate-700/50 bg-slate-900/40">
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
                    className="flex-1 bg-transparent border-none outline-none text-white px-4 py-4 font-body text-lg placeholder-slate-500 tracking-wider"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || phone.length !== 10}
                  whileHover={phone.length === 10 && !loading ? { scale: 1.02 } : {}}
                  whileTap={phone.length === 10 && !loading ? { scale: 0.98 } : {}}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 ${phone.length === 10 && !loading
                    ? 'bg-teal-400 hover:bg-teal-300 text-[#07091E]'
                    : 'bg-teal-400/20 text-teal-400/50 cursor-not-allowed'
                    }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send OTP <ArrowRight className="w-5 h-5" />
                    </>
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
                className="flex flex-col gap-4"
              >
                <div
                  className={`rounded-xl overflow-hidden transition-all duration-300 border-2 ${focusOtp ? 'bg-teal-400/5 border-teal-400 shadow-[0_0_0_3px_rgba(0,229,160,0.1)]' : 'bg-slate-800/60 border-slate-700/50'}`}
                >
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setFocusOtp(true)}
                    onBlur={() => setFocusOtp(false)}
                    placeholder="• • • • • •"
                    autoFocus
                    className="w-full bg-transparent border-none outline-none text-white text-center py-4 font-mono text-2xl tracking-[0.5em] placeholder-slate-600"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  whileHover={otp.length === 6 && !loading ? { scale: 1.02 } : {}}
                  whileTap={otp.length === 6 && !loading ? { scale: 0.98 } : {}}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all duration-300 ${otp.length === 6 && !loading
                    ? 'bg-teal-400 hover:bg-teal-300 text-[#07091E]'
                    : 'bg-teal-400/20 text-teal-400/50 cursor-not-allowed'
                    }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Identity <CheckCircle2 className="w-5 h-5" />
                    </>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                  className="mt-2 text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <RefreshCcw className="w-4 h-4" /> Change Mobile Number
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Security Note */}
        <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-center items-center gap-3 opacity-60">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <p style={{ fontFamily: font.mono }} className="text-xs text-teal-400 tracking-widest uppercase font-bold">
            End-to-End Encrypted
          </p>
        </div>
      </motion.div>
    </div>
  );
}
