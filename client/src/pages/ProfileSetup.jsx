import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Loader2 } from 'lucide-react';
import api from '../api/axios';

const C = {
  navy: '#0A0F2C',
  panel: '#111834',
  teal: '#00E5A0',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: 'rgba(148,163,184,0.12)',
  borderTeal: 'rgba(0,229,160,0.25)',
  navyDeep: '#07091E',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
};

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focus, setFocus] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put('/users/me', { name });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
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
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 50%, transparent 100%)'
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '40%', width: '400px', height: '400px',
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,160,0.1) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0, filter: 'blur(50px)'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'relative', zIndex: 10,
          width: '100%', maxWidth: '420px',
          backgroundColor: 'rgba(17,24,52,0.8)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '28px',
          padding: '48px 40px',
          border: `1px solid ${C.borderTeal}`,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex flex-col items-center mb-8" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15, delay: 0.2 }}
            style={{
              width: '64px', height: '64px', borderRadius: '16px',
              backgroundColor: 'rgba(0,229,160,0.1)',
              border: '1px solid rgba(0,229,160,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '24px',
            }}
          >
            <User style={{ width: '32px', height: '32px', color: C.teal }} />
          </motion.div>

          <h1 style={{ fontFamily: font.heading, fontSize: '1.8rem', fontWeight: 800, color: C.textPrimary, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            One last thing
          </h1>
          <p style={{ color: C.textSecondary, fontSize: '0.9rem', textAlign: 'center', margin: 0 }}>
            What should we call you?
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                backgroundColor: 'rgba(255,59,92,0.1)',
                border: '1px solid rgba(255,59,92,0.25)',
                borderRadius: '12px', padding: '12px', marginBottom: '1.25rem', textAlign: 'center',
              }}
            >
              <p style={{ color: '#FF3B5C', fontSize: '0.85rem', margin: 0 }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              borderRadius: '12px', overflow: 'hidden', transition: 'all 0.3s',
              border: focus ? '2px solid rgba(0,229,160,1)' : '2px solid rgba(148,163,184,0.2)',
              backgroundColor: focus ? 'rgba(0,229,160,0.05)' : 'rgba(30,41,59,0.6)',
              boxShadow: focus ? '0 0 0 3px rgba(0,229,160,0.1)' : 'none',
            }}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              placeholder="Your full name"
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                border: 'none', borderRadius: '12px',
                padding: '16px', fontSize: '1rem',
                color: C.textPrimary, backgroundColor: 'transparent',
                outline: 'none', fontFamily: font.body,
              }}
            />
          </div>
          <motion.button
            type="submit"
            disabled={loading || name.trim().length < 2}
            whileHover={name.trim().length >= 2 && !loading ? { scale: 1.02 } : {}}
            whileTap={name.trim().length >= 2 && !loading ? { scale: 0.98 } : {}}
            style={{
              width: '100%', padding: '16px', borderRadius: '12px', border: 'none',
              backgroundColor: name.trim().length >= 2 && !loading ? C.teal : 'rgba(0,229,160,0.2)',
              color: name.trim().length >= 2 && !loading ? C.navyDeep : 'rgba(0,229,160,0.5)',
              fontWeight: 700, fontSize: '1rem', cursor: name.trim().length >= 2 && !loading ? 'pointer' : 'not-allowed',
              fontFamily: font.body,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.3s',
            }}
          >
            {loading ? (
              <><Loader2 style={{ width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} /> Saving...</>
            ) : (
              <>Continue <ArrowRight style={{ width: '18px', height: '18px' }} /></>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
