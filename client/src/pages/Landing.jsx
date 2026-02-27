import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView, AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import { Shield, Lock, Bell, EyeOff, Zap, ShieldCheck, CheckCircle2, ChevronRight, Menu, X } from 'lucide-react';

// --- Design Tokens ---
const C = {
  navy: '#0A0F2C',
  navyLight: '#0D1438',
  navyDeep: '#07091E',
  slate: '#1E293B',
  panel: '#111834',
  teal: '#00E5A0',
  tealDark: '#00CC8E',
  accent: '#67B7FF',
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

// --- Lenis Smooth Scrolling Wrapper ---
function SmoothScroll({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return <>{children}</>;
}

// --- Reusable Components ---
const TealBadge = ({ children }) => (
  <motion.span
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    style={{
      display: 'inline-block',
      backgroundColor: 'rgba(0,229,160,0.1)',
      color: C.teal,
      border: `1px solid ${C.borderTeal}`,
      borderRadius: '999px',
      padding: '6px 20px',
      fontSize: '0.75rem',
      fontWeight: 700,
      fontFamily: font.body,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: '24px',
      backdropFilter: 'blur(10px)'
    }}
  >
    {children}
  </motion.span>
);

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

    const count = 40;
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
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(0, 229, 160, ${0.05 * (1 - dist / 120)})`;
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

// --- Navbar ---
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setScrolled(latest > 50);
    });
  }, [scrollY]);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Privacy', href: '#privacy' }
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 5vw',
          backgroundColor: scrolled ? 'rgba(10,15,44,0.85)' : 'rgba(10,15,44,0)',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div style={{ fontFamily: font.heading, fontWeight: 800, fontSize: '1.5rem', color: C.textPrimary, letterSpacing: '-0.02em' }}>
          Sam<span style={{ color: C.teal }}>park</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <motion.a
              key={link.label}
              href={link.href}
              className="group relative"
              style={{
                fontFamily: font.body, fontSize: '0.9rem', color: C.textSecondary,
                textDecoration: 'none', fontWeight: 500,
                transition: 'color 0.3s ease',
              }}
              whileHover={{ color: C.textPrimary }}
            >
              {link.label}
              <motion.span
                className="absolute -bottom-1 left-0 w-0 h-0.5 bg-teal-400 group-hover:w-full transition-all duration-300"
              />
            </motion.a>
          ))}
          <Link to="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-teal-400 hover:bg-teal-300 transition-colors"
              style={{
                fontFamily: font.body, fontWeight: 700, fontSize: '0.9rem',
                color: C.navyDeep, borderRadius: '12px', padding: '10px 24px',
                border: 'none', cursor: 'pointer',
              }}
            >
              Get Started
            </motion.button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white p-2">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[999] bg-[#0A0F2C]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-2xl font-bold text-white font-heading tracking-tight hover:text-[#00E5A0] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
              <div className="bg-teal-400 hover:bg-teal-300 transition-colors px-8 py-4 rounded-xl text-[#07091E] font-bold text-lg mt-4">
                Get Started
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- Hero Section ---
function Hero() {
  const containerRef = useRef(null);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -100]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);

  // Mouse Parallax for QR Card
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePosition({ x, y });
  };

  const cardRotateX = useSpring(mousePosition.y * -20, { stiffness: 100, damping: 30 });
  const cardRotateY = useSpring(mousePosition.x * 20, { stiffness: 100, damping: 30 });

  useEffect(() => {
    cardRotateX.set(mousePosition.y * -20);
    cardRotateY.set(mousePosition.x * 20);
  }, [mousePosition, cardRotateX, cardRotateY]);

  const textVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    })
  };

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        minHeight: '100vh', backgroundColor: C.navy,
        display: 'flex', alignItems: 'center',
        padding: '160px 5vw 100px',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <ParticleBackground />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `linear-gradient(rgba(148,163,184,0.03) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(148,163,184,0.03) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
      }} />

      {/* Ambient Glows */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: 'absolute', right: '10%', top: '20%', zIndex: 1,
          width: '600px', height: '600px', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(0,229,160,0.15) 0%, transparent 60%)',
          filter: 'blur(60px)'
        }}
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: 'absolute', left: '-5%', bottom: '-10%', zIndex: 1,
          width: '500px', height: '500px', borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(circle, rgba(103,183,255,0.12) 0%, transparent 60%)',
          filter: 'blur(50px)'
        }}
      />

      <div style={{ maxWidth: '1280px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: '8vw', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>

        {/* Copy */}
        <motion.div style={{ flex: '1 1 500px', y: y1, opacity }}>
          <TealBadge>Privacy-First Vehicle Identity</TealBadge>

          <motion.h1
            custom={1} initial="hidden" animate="visible" variants={textVariants}
            style={{
              fontFamily: font.heading,
              fontSize: 'clamp(3rem, 6vw, 4.8rem)',
              fontWeight: 800, color: C.textPrimary,
              lineHeight: 1.05, letterSpacing: '-0.04em',
              margin: '0 0 32px',
            }}
          >
            Your Vehicle.<br />
            Your <span className="text-teal-400 font-extrabold">Privacy</span>.<br />
            One QR Code.
          </motion.h1>

          <motion.p
            custom={2} initial="hidden" animate="visible" variants={textVariants}
            style={{
              fontFamily: font.body, fontSize: '1.2rem',
              color: C.textSecondary, lineHeight: 1.6,
              margin: '0 0 48px', maxWidth: '520px',
            }}
          >
            Sampark shields your personal phone number while keeping you reachable. Connect with bystanders and first responders securely through a single dashboard sticker.
          </motion.p>

          <motion.div
            custom={3} initial="hidden" animate="visible" variants={textVariants}
            style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Link to="/login">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-teal-400 hover:bg-teal-300 transition-colors flex items-center gap-2"
                style={{
                  fontFamily: font.body, fontWeight: 700, fontSize: '1.1rem',
                  color: C.navyDeep, borderRadius: '14px', padding: '16px 36px',
                }}
              >
                Get Your QR <ChevronRight size={20} />
              </motion.div>
            </Link>

            <a href="#how-it-works" className="group flex items-center gap-2 text-[#94A3B8] hover:text-white transition-colors duration-300 font-medium text-lg">
              <span className="relative overflow-hidden">
                <span className="inline-block transition-transform duration-300 group-hover:-translate-y-full">See how it works</span>
                <span className="absolute left-0 top-0 inline-block translate-y-full transition-transform duration-300 group-hover:translate-y-0 text-white">See how it works</span>
              </span>
              <motion.span
                animate={{ y: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                ↓
              </motion.span>
            </a>
          </motion.div>
        </motion.div>

        {/* 3D QR Card */}
        <motion.div
          style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center', perspective: 1200, y: y2 }}
          initial={{ opacity: 0, scale: 0.8, rotateY: 30 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        >
          <motion.div
            style={{
              rotateX: cardRotateX,
              rotateY: cardRotateY,
              transformStyle: "preserve-3d"
            }}
            className="relative"
          >
            {/* Glowing Backdrop */}
            <div className="absolute inset-0 bg-teal-400/20 blur-[100px] rounded-full transform -translate-z-10" />

            <motion.div
              animate={{ y: [-15, 15, -15] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              style={{
                backgroundColor: 'rgba(17,24,52,0.8)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${C.borderTeal}`,
                borderRadius: '32px', padding: '48px', textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
                width: '100%', maxWidth: '380px',
                transformStyle: "preserve-3d"
              }}
            >
              {/* Inner floating elements */}
              <motion.div
                style={{ transform: "translateZ(60px)" }}
                className="bg-white p-5 rounded-2xl mx-auto w-56 h-56 mb-8 shadow-2xl relative"
              >
                {/* Fake QR Scanner line */}
                <motion.div
                  className="absolute inset-x-0 h-1 bg-teal-400 shadow-[0_0_15px_rgba(0,229,160,0.8)] z-10"
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <div className="grid grid-cols-7 gap-1 h-full w-full">
                  {Array.from({ length: 49 }).map((_, i) => {
                    const filled = [0, 1, 2, 5, 6, 7, 9, 13, 14, 16, 20, 21, 22, 23, 26, 27, 28, 31, 34, 35, 36, 37, 38, 40, 41, 42, 46, 47, 48].includes(i);
                    return <motion.div
                      key={i}
                      className={`rounded-sm ${filled ? 'bg-[#0A0F2C]' : 'bg-transparent'}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.02 + 0.5 }}
                    />;
                  })}
                </div>
              </motion.div>

              <motion.div style={{ transform: "translateZ(40px)" }}>
                <p style={{ fontFamily: font.mono, fontSize: '1.2rem', color: C.teal, margin: '0 0 8px', letterSpacing: '0.15em', fontWeight: 'bold' }}>MH01AB1234</p>
                <p style={{ fontFamily: font.body, fontSize: '0.9rem', color: '#94A3B8', margin: 0 }}>Scan to contact owner securely</p>

                <div className="flex items-center justify-center gap-2 mt-6 px-4 py-2 bg-teal-400/10 rounded-full border border-teal-400/20 w-fit mx-auto">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shadow-[0_0_10px_#00E5A0]" />
                  <span className="text-teal-400 text-xs font-bold tracking-wider uppercase">Active & Protected</span>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// --- Problems Section ---
const PROBLEM_ITEMS = [
  { icon: EyeOff, title: 'Number Plate Scraping', desc: 'Your registration number is publicly accessible. Scammers and stalkers can easily trace it to your identity.' },
  { icon: ShieldCheck, title: 'No Secure Contact', desc: 'If your car is blocked or damaged, strangers have zero safe ways to reach you without risking their own privacy.' },
  { icon: Lock, title: 'Database Breaches', desc: 'Multiple RTO leaks have exposed millions of vehicle owners\' addresses and phone numbers on the dark web.' },
  { icon: Zap, title: 'Emergency Delays', desc: 'During critical accidents, first responders lose precious minutes trying to locate and notify family members.' },
];

function Problems() {
  const containerRef = useRef(null);

  return (
    <section id="problems" ref={containerRef} className="py-32 px-6 md:px-12 relative bg-[#07091E] overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(103,183,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="max-w-[1280px] mx-auto relative z-10">
        <div className="text-center mb-24">
          <TealBadge>The Reality</TealBadge>
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white font-heading tracking-tight leading-tight mb-8"
          >
            A Number Plate is a <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">Public Privacy Leak</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto"
          >
            The outdated vehicle registration ecosystem forces you to choose between being reachable and staying secure.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {PROBLEM_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-[#111834] border border-[#1E293B] p-8 md:p-10 rounded-3xl relative group overflow-hidden"
            >
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <item.icon className="text-blue-400 w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white font-heading mb-4 group-hover:text-blue-400 transition-colors">{item.title}</h3>
                <p className="text-slate-400 text-lg leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Interactive Tabbed How It Works ---
function HowItWorks() {
  const steps = [
    { id: 'step-1', num: '01', title: 'Verify Ownership', desc: 'Securely link your vehicle using your RC and phone number. Our admin ensures authenticity.', icon: <CheckCircle2 className="w-6 h-6" /> },
    { id: 'step-2', num: '02', title: 'Get Your QR', desc: 'We generate an exclusive, cryptographic QR code that maps to your vehicle, not your identity.', icon: <ShieldCheck className="w-6 h-6" /> },
    { id: 'step-3', num: '03', title: 'Stick & Go', desc: 'Affix the sleek QR sticker to your windshield or dashboard. It endures all weather conditions.', icon: <Zap className="w-6 h-6" /> },
    { id: 'step-4', num: '04', title: 'Stay Anonymous', desc: 'Anyone can scan the QR to message or alert you. You control how and when you receive notifications.', icon: <EyeOff className="w-6 h-6" /> },
  ];

  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="how-it-works" className="py-32 px-6 md:px-12 bg-[#0A0F2C] relative border-t border-[#1E293B]">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center md:text-left mb-20 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <TealBadge>Seamless Process</TealBadge>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white font-heading tracking-tight">
              How Sampark Works
            </h2>
          </div>
          <p className="text-slate-400 text-lg md:text-xl max-w-md">
            A frictionless onboarding experience designed for absolute privacy.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Left Side: Steps List */}
          <div className="flex-1 flex flex-col justify-center space-y-4">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(idx)}
                  className={`text-left p-6 md:p-8 rounded-3xl transition-all duration-500 border relative overflow-hidden flex gap-6 items-start ${isActive ? 'bg-[#111834] border-teal-500/30' : 'bg-transparent border-transparent hover:border-[#1E293B] hover:bg-[#111834]/50'}`}
                >
                  <div className={`mt-1 flex-shrink-0 transition-colors duration-500 ${isActive ? 'text-teal-400' : 'text-slate-600'}`}>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className={`text-xl md:text-2xl font-bold font-heading mb-2 transition-colors duration-500 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                      {step.title}
                    </h3>
                    <AnimatePresence initial={false}>
                      {isActive && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="text-slate-400 text-lg leading-relaxed mt-4"
                        >
                          {step.desc}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Side: Interactive Visual */}
          <div className="flex-[1.2] relative h-[500px] lg:h-[600px] rounded-3xl bg-[#0D1438] border border-[#1E293B] overflow-hidden flex items-center justify-center p-8 lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,229,160,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="relative z-10 w-full max-w-md"
              >
                {/* Visual mockups depending on the active step */}
                {activeStep === 0 && (
                  <div className="bg-[#111834] border border-[#1E293B] rounded-2xl p-6 shadow-2xl">
                    <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center mb-6">
                      <ShieldCheck className="w-8 h-8 text-teal-400" />
                    </div>
                    <div className="space-y-4">
                      <div className="h-4 bg-slate-800 rounded w-3/4 animate-pulse delay-75" />
                      <div className="h-4 bg-slate-800 rounded w-1/2 animate-pulse delay-100" />
                      <div className="h-4 bg-slate-800 rounded w-5/6 animate-pulse delay-150" />
                    </div>
                  </div>
                )}
                {activeStep === 1 && (
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-48 h-48 bg-white rounded-2xl p-4 flex flex-wrap gap-1">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div key={i} className={`w-[calc(20%-4px)] h-[calc(20%-4px)] rounded-sm ${Math.random() > 0.4 ? 'bg-[#0A0F2C]' : 'bg-transparent'}`} />
                      ))}
                    </div>
                  </div>
                )}
                {activeStep === 2 && (
                  <div className="bg-[#111834] border border-[#1E293B] rounded-2xl p-6 shadow-2xl flex items-center justify-center">
                    <div className="w-full h-32 bg-slate-800/50 rounded-xl border border-slate-700/50 relative overflow-hidden flex items-center justify-center">
                      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-teal-500/20 to-transparent" />
                      <span className="font-mono text-xl text-teal-400 tracking-widest uppercase">MH01AB1234</span>
                    </div>
                  </div>
                )}
                {activeStep === 3 && (
                  <div className="bg-[#111834] border border-[#1E293B] rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-slate-800 shrink-0" />
                      <div className="flex-1">
                        <div className="h-3 bg-slate-800 rounded w-24 mb-2" />
                        <div className="h-2 bg-slate-800 rounded w-16" />
                      </div>
                    </div>
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4">
                      <p className="text-teal-400 text-sm">"Your car is blocking the driveway. Please move it."</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- Features Bento Grid ---
function Features() {
  const features = [
    { title: 'Masked Communication', desc: 'In-app messaging buffers your real number from the scanner.', colSpan: 'md:col-span-2' },
    { title: 'Emergency Overrides', desc: 'Critical alerts bypass silent modes to reach you instantly.', colSpan: 'md:col-span-1' },
    { title: 'Granular Access', desc: 'You decide who can message you and when. Block spam instantly.', colSpan: 'md:col-span-1' },
    { title: 'QR Rotation', desc: 'Compromised sticker? Generate a new QR token in one tap and invalidate the old one.', colSpan: 'md:col-span-2' },
  ];

  return (
    <section id="features" className="py-32 px-6 md:px-12 bg-[#0D1438] relative border-y border-[#1E293B]">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div>
            <TealBadge>Features</TealBadge>
            <h2 className="text-4xl md:text-5xl font-extrabold text-white font-heading tracking-tight">
              Powerful tools.<br />Zero compromises.
            </h2>
          </div>
          <p className="text-slate-400 text-lg max-w-md">
            Everything you need to manage your vehicle's public interface seamlessly and securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
              whileHover={{ scale: 1.02 }}
              className={`bg-[#111834] rounded-3xl p-8 border border-[#1E293B] hover:border-teal-500/30 transition-all ${f.colSpan} flex flex-col justify-between overflow-hidden relative group`}
            >
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-colors" />
              <div>
                <CheckCircle2 className="w-8 h-8 text-teal-400 mb-6 opacity-80" />
                <h3 className="text-2xl font-bold text-white font-heading mb-4">{f.title}</h3>
                <p className="text-slate-400 text-lg">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// --- Dynamic CTA ---
function CTA() {
  return (
    <section className="py-40 px-6 bg-[#07091E] relative overflow-hidden text-center">
      {/* Heavy glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <Shield className="w-20 h-20 text-teal-400 mb-8 mx-auto" strokeWidth={1.5} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-7xl font-extrabold text-white font-heading tracking-tight leading-tight mb-8"
        >
          Take back your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-teal-600">anonymity.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-xl text-slate-400 mb-12 max-w-xl mx-auto"
        >
          Join thousands of smart vehicle owners shielding their data. Setup takes precisely 3 minutes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Link to="/login">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-teal-400 hover:bg-teal-300 transition-colors text-[#07091E] font-bold text-xl px-12 py-5 rounded-2xl flex items-center gap-3 mx-auto"
            >
              Register Vehicle <ChevronRight />
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// --- Footer ---
function Footer() {
  return (
    <footer className="bg-[#0A0F2C] border-t border-[#1E293B] pt-20 pb-10 px-6 md:px-12">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16">
          <div className="max-w-sm">
            <span className="font-heading font-extrabold text-3xl text-white tracking-tight">Sam<span className="text-teal-400">park</span></span>
            <p className="text-slate-400 text-base mt-6 leading-relaxed">
              Redefining vehicle-to-human communication with an uncompromising focus on privacy and security.
            </p>
          </div>
          <div className="flex gap-16 flex-wrap">
            <div>
              <h4 className="font-heading font-bold text-white tracking-widest uppercase text-sm mb-6">Product</h4>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#features" className="hover:text-teal-400 transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-teal-400 transition-colors">How it Works</a></li>
                <li><a href="#problems" className="hover:text-teal-400 transition-colors">The Problem</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-bold text-white tracking-widest uppercase text-sm mb-6">Legal</h4>
              <ul className="space-y-4 text-slate-400">
                <li><a href="#" className="hover:text-teal-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-teal-400 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-[#1E293B] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} Sampark. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">Built in India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// --- Main Page ---
export default function Landing() {
  return (
    <SmoothScroll>
      <div className="bg-[#0A0F2C] text-white selection:bg-teal-400/30">
        <Navbar />
        <Hero />
        <Problems />
        <HowItWorks />
        <Features />
        <CTA />
        <Footer />
      </div>
    </SmoothScroll>
  );
}
