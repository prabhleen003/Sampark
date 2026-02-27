import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const C = {
  navy:        '#0A0F2C',
  navyLight:   '#0D1438',
  navyDeep:    '#07091E',
  slate:       '#1E293B',
  panel:       '#111834',
  teal:        '#00E5A0',
  tealDark:    '#00CC8E',
  accent:      '#67B7FF',
  textPrimary: '#F1F5F9',
  textSecondary:'#94A3B8',
  border:      'rgba(148,163,184,0.12)',
  borderSoft:  'rgba(148,163,184,0.08)',
  borderTeal:  'rgba(0,229,160,0.25)',
  borderAccent:'rgba(103,183,255,0.22)',
};

const font = {
  heading: "'Space Grotesk', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

function TealBadge({ children }) {
  return (
    <span style={{
      display: 'inline-block',
      backgroundColor: 'rgba(0,229,160,0.12)',
      color: C.teal,
      border: `1px solid ${C.borderTeal}`,
      borderRadius: '999px',
      padding: '5px 16px',
      fontSize: '0.75rem',
      fontWeight: 600,
      fontFamily: font.body,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      marginBottom: '20px',
    }}>
      {children}
    </span>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const ref = useRef(null);
  useEffect(() => {
    gsap.from(ref.current, { y: -30, duration: 0.7, ease: 'power2.out', delay: 0.1 });
  }, []);

  return (
    <nav ref={ref} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 48px',
      backgroundColor: 'rgba(10,15,44,0.9)',
      backdropFilter: 'blur(14px)',
      borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: '1.3rem', color: C.textPrimary }}>
        Sam<span style={{ color: C.teal }}>park</span>
      </span>
      <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
        {[['Features', '#features'], ['How It Works', '#how-it-works'], ['Privacy', '#privacy']].map(([label, href]) => (
          <a key={label} href={href} style={{ fontFamily: font.body, fontSize: '0.9rem', color: C.textSecondary, textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
            onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
          >{label}</a>
        ))}
        <Link to="/login" style={{
          fontFamily: font.body, fontWeight: 600, fontSize: '0.9rem',
          backgroundColor: C.teal, color: C.navy,
          borderRadius: '8px', padding: '9px 22px', textDecoration: 'none',
        }}>Get Started</Link>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const headRef   = useRef(null);
  const subRef    = useRef(null);
  const ctaRef    = useRef(null);
  const visualRef = useRef(null);

  useEffect(() => {
    // Position-only animations — no opacity, so content is always visible
    gsap.from(headRef.current,   { y: 30, duration: 0.8, ease: 'power3.out', delay: 0.2 });
    gsap.from(subRef.current,    { y: 20, duration: 0.7, ease: 'power2.out', delay: 0.35 });
    gsap.from(ctaRef.current,    { y: 16, duration: 0.6, ease: 'power2.out', delay: 0.5 });
    gsap.from(visualRef.current, { x: 30, duration: 0.9, ease: 'power3.out', delay: 0.3 });

    // Floating loop on QR mockup
    gsap.to(visualRef.current, { y: -14, duration: 2.8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.0 });
  }, []);

  return (
    <section style={{
      minHeight: '100vh',
      backgroundColor: C.navy,
      display: 'flex', alignItems: 'center',
      padding: '120px 48px 80px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle grid background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }} />

      {/* Teal glow blob */}
      <div style={{
        position: 'absolute', right: '10%', top: '20%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,229,160,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: '80px', flexWrap: 'wrap' }}>

        {/* Copy */}
        <div style={{ flex: '1 1 440px' }}>
          <TealBadge>Privacy-First Vehicle Identity</TealBadge>

          <h1 ref={headRef} style={{
            fontFamily: font.heading,
            fontSize: 'clamp(2.4rem, 5vw, 4rem)',
            fontWeight: 700,
            color: C.textPrimary,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            margin: '0 0 24px',
          }}>
            Your Vehicle.<br />
            Your <span style={{ color: C.teal }}>Privacy</span>.<br />
            One QR Code.
          </h1>

          <p ref={subRef} style={{
            fontFamily: font.body,
            fontSize: '1.1rem',
            color: C.textSecondary,
            lineHeight: 1.75,
            margin: '0 0 40px',
            maxWidth: '460px',
          }}>
            Sampark lets vehicle owners receive contact requests without exposing their phone number. One QR sticker. Full privacy. Emergency routing included.
          </p>

          <div ref={ctaRef} style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" style={{
              fontFamily: font.body, fontWeight: 700, fontSize: '1rem',
              backgroundColor: C.teal, color: C.navy,
              borderRadius: '10px', padding: '14px 30px',
              textDecoration: 'none',
              boxShadow: '0 0 32px rgba(0,229,160,0.25)',
            }}>
              Get Your QR Code →
            </Link>
            <a href="#how-it-works" style={{ fontFamily: font.body, fontSize: '0.95rem', color: C.textSecondary, textDecoration: 'none' }}>
              See how it works ↓
            </a>
          </div>
        </div>

        {/* QR Mockup */}
        <div ref={visualRef} style={{ flex: '0 0 auto' }}>
          <div style={{
            backgroundColor: C.slate,
            border: `1px solid ${C.borderTeal}`,
            borderRadius: '28px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 0 80px rgba(0,229,160,0.18)',
            width: '320px',
          }}>
            {/* QR grid */}
            <div style={{
              width: '240px', height: '240px',
              margin: '0 auto 20px',
              backgroundColor: '#fff',
              borderRadius: '14px',
              padding: '16px',
              boxSizing: 'border-box',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '3px',
            }}>
              {Array.from({ length: 49 }).map((_, i) => {
                const filled = [0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,8,15,22,29,36,10,17,24,31,38].includes(i);
                return <div key={i} style={{ backgroundColor: filled ? C.navy : 'transparent', borderRadius: '1px' }} />;
              })}
            </div>
            <p style={{ fontFamily: font.mono, fontSize: '1rem', color: C.teal, margin: '0 0 6px', letterSpacing: '0.1em' }}>MH01AB1234</p>
            <p style={{ fontFamily: font.body, fontSize: '0.85rem', color: C.textSecondary, margin: 0 }}>Scan to contact owner</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: C.teal, boxShadow: `0 0 12px ${C.teal}` }} />
            <span style={{ fontFamily: font.body, fontSize: '0.9rem', color: C.textSecondary }}>Verified & Active</span>
          </div>
        </div>
      </div>

      {/* Scroll chevron */}
      <ScrollChevron />
    </section>
  );
}

function ScrollChevron() {
  const ref = useRef(null);
  useEffect(() => {
    gsap.to(ref.current, { y: 8, duration: 0.9, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1.5 });
  }, []);
  return (
    <div ref={ref} style={{ position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)', opacity: 0.4 }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.textSecondary} strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
    </div>
  );
}

// ─── Problems ─────────────────────────────────────────────────────────────────
function Problems() {
  const sectionRef = useRef(null);
  const headRef    = useRef(null);
  const statRef    = useRef(null);

  const items = [
    {
      num: '01',
      stat: '↑ Rising',
      statLabel: 'plate-linked harassment reports',
      title: 'Plate-Based Harassment',
      desc: 'Your registration number is publicly searchable. Stalkers, scammers, and road-rage offenders can trace it back to you in seconds.',
    },
    {
      num: '02',
      stat: '0',
      statLabel: 'standard anonymous contact channels',
      title: 'No Safe Way to Reach You',
      desc: 'Blocked car, parking damage, urgent alert — there\'s no way for a concerned stranger to contact the owner without exposing themselves.',
    },
    {
      num: '03',
      stat: '3+',
      statLabel: 'major RTO database breaches on record',
      title: 'Registration Data Leaks',
      desc: 'Vehicle registration databases have been compromised multiple times. Your address, name, and contact details are only as safe as the weakest server.',
    },
    {
      num: '04',
      stat: '3 min',
      statLabel: 'avg. delay locating owner in emergencies',
      title: 'Emergency Dead Zones',
      desc: 'When your vehicle needs urgent attention, first responders and bystanders have no fast, verified path to reach the owner.',
    },
  ];

  useEffect(() => {
    gsap.from(headRef.current, {
      scrollTrigger: { trigger: sectionRef.current, start: 'top 78%' },
      y: 32, duration: 0.7, ease: 'power3.out',
    });
    gsap.from(statRef.current, {
      scrollTrigger: { trigger: sectionRef.current, start: 'top 72%' },
      y: 20, duration: 0.6, ease: 'power2.out', delay: 0.1,
    });
    gsap.from(sectionRef.current.querySelectorAll('.prob-card'), {
      scrollTrigger: { trigger: sectionRef.current, start: 'top 65%' },
      y: 48, duration: 0.65, stagger: 0.12, ease: 'power3.out', delay: 0.2,
    });
  }, []);

  return (
    <section ref={sectionRef} style={{ backgroundColor: C.navyDeep, padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>

      {/* Dot-grid texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(rgba(103,183,255,0.05) 1px, transparent 1px)',
        backgroundSize: '30px 30px',
      }} />

      {/* Ambient danger glow — left edge */}
      <div style={{
        position: 'absolute', left: '-12%', top: '25%',
        width: '560px', height: '560px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(103,183,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Ambient danger glow — right edge */}
      <div style={{
        position: 'absolute', right: '-8%', bottom: '10%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(103,183,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative' }}>

        {/* Header */}
        <div ref={headRef} style={{ textAlign: 'center', marginBottom: '40px' }}>
          <TealBadge>The Problem</TealBadge>
          <h2 style={{
            fontFamily: font.heading,
            fontSize: 'clamp(2rem, 5vw, 3.4rem)',
            fontWeight: 800,
            color: C.textPrimary,
            letterSpacing: '-0.035em',
            lineHeight: 1.1,
            margin: '0 0 20px',
          }}>
            Every car owner is<br />
            <span style={{ color: C.accent }}>one plate lookup away</span><br />
            from losing their privacy.
          </h2>
          <p style={{
            fontFamily: font.body,
            fontSize: '1.05rem',
            color: C.textSecondary,
            lineHeight: 1.72,
            maxWidth: '480px',
            margin: '0 auto',
          }}>
            The current system forces a brutal choice: stay reachable and sacrifice privacy, or stay private and become unreachable.
          </p>
        </div>

        {/* Stat callout bar */}
        <div ref={statRef} style={{
          margin: '0 auto 64px',
          maxWidth: '720px',
          padding: '20px 36px',
          backgroundColor: 'rgba(103,183,255,0.08)',
          border: `1px solid ${C.borderAccent}`,
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
        }}>
          <div style={{
            width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0,
            backgroundColor: C.accent,
            boxShadow: `0 0 12px ${C.accent}`,
          }} />
          <p style={{
            fontFamily: font.mono,
            fontSize: 'clamp(0.82rem, 1.8vw, 0.98rem)',
            color: C.textSecondary,
            margin: 0,
            letterSpacing: '0.03em',
            lineHeight: 1.6,
            textAlign: 'center',
          }}>
            India has{' '}
            <span style={{ color: C.accent, fontWeight: 700 }}>330M+ registered vehicles</span>
            {' '}— every number plate is a publicly searchable{' '}
            <span style={{ color: C.textPrimary, fontWeight: 600 }}>privacy leak</span>.
          </p>
        </div>

        {/* Cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(248px, 1fr))', gap: '16px' }}>
          {items.map(({ num, stat, statLabel, title, desc }) => (
            <div
              key={num}
              className="prob-card"
              style={{
                backgroundColor: C.panel,
                border: '1px solid rgba(103,183,255,0.18)',
                borderRadius: '18px',
                padding: '32px 28px 28px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.28s ease, box-shadow 0.28s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(103,183,255,0.42)';
                e.currentTarget.style.boxShadow = '0 0 36px rgba(103,183,255,0.14)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(103,183,255,0.18)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Ghost number watermark */}
              <span style={{
                position: 'absolute', top: '18px', right: '22px',
                fontFamily: font.mono, fontSize: '3.8rem', fontWeight: 900,
                color: 'rgba(103,183,255,0.08)', lineHeight: 1,
                userSelect: 'none', pointerEvents: 'none',
              }}>
                {num}
              </span>

              {/* Danger accent line */}
              <div style={{
                width: '36px', height: '3px', borderRadius: '2px',
                background: 'linear-gradient(90deg, #67B7FF 0%, rgba(103,183,255,0.15) 100%)',
                marginBottom: '26px',
              }} />

              {/* Impact stat */}
              <div style={{ marginBottom: '18px' }}>
                <p style={{
                  fontFamily: font.heading,
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: C.accent,
                  margin: '0 0 4px',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}>
                  {stat}
                </p>
                <p style={{
                  fontFamily: font.body,
                  fontSize: '0.72rem',
                  color: 'rgba(148,163,184,0.6)',
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  fontWeight: 600,
                }}>
                  {statLabel}
                </p>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: 'rgba(148,163,184,0.07)', marginBottom: '18px' }} />

              <h3 style={{
                fontFamily: font.heading,
                fontWeight: 700,
                fontSize: '1.05rem',
                color: C.textPrimary,
                margin: '0 0 10px',
                letterSpacing: '-0.01em',
              }}>
                {title}
              </h3>
              <p style={{
                fontFamily: font.body,
                fontSize: '0.875rem',
                color: C.textSecondary,
                lineHeight: 1.7,
                margin: 0,
              }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works — Circular Connected Loop ───────────────────────────────────
function HowItWorks() {
  const [active, setActive] = useState(0);
  const intervalRef = useRef(null);

  const steps = [
    { num: '01', title: 'Register & Verify', desc: 'Sign up via OTP. Upload your RC and DL for admin verification — takes under 2 minutes.' },
    { num: '02', title: 'Get Your QR',       desc: 'Once approved, receive a unique QR code linked to your vehicle — not your number.' },
    { num: '03', title: 'Stick & Go',        desc: 'Place the sticker on your dashboard. Anyone can scan to reach you.' },
    { num: '04', title: 'Stay Private',      desc: 'Receive contact requests through Sampark. Your real number is never exposed.' },
  ];

  // Geometry
  const CX = 330, CY = 270, R = 165, NODE_R = 34;
  const OFFSET = Math.asin(NODE_R / R);
  const baseAngles = steps.map((_, i) => (i / 4) * 2 * Math.PI - Math.PI / 2);

  const nodes = steps.map((s, i) => ({
    ...s,
    x: CX + R * Math.cos(baseAngles[i]),
    y: CY + R * Math.sin(baseAngles[i]),
  }));

  // Pre-trimmed arc paths (start/end exclude the node circle radius)
  const arcs = baseAngles.map((a, i) => {
    const nextA = baseAngles[(i + 1) % 4];
    const sa = a + OFFSET, ea = nextA - OFFSET;
    const sx = CX + R * Math.cos(sa), sy = CY + R * Math.sin(sa);
    const ex = CX + R * Math.cos(ea), ey = CY + R * Math.sin(ea);
    return `M ${sx.toFixed(1)} ${sy.toFixed(1)} A ${R} ${R} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  });

  // Label positions: outside each node
  const labelPos = [
    { x: CX,         y: CY - R - 50, anchor: 'middle' },
    { x: CX + R + 50, y: CY,          anchor: 'start'  },
    { x: CX,         y: CY + R + 50, anchor: 'middle' },
    { x: CX - R - 50, y: CY,          anchor: 'end'    },
  ];

  function startAuto() {
    intervalRef.current = setInterval(() => setActive(a => (a + 1) % 4), 3000);
  }
  function stopAuto() { clearInterval(intervalRef.current); }

  useEffect(() => { startAuto(); return stopAuto; }, []);

  function handleNodeClick(i) {
    stopAuto();
    setActive(i);
    startAuto();
  }

  return (
    <section id="how-it-works" style={{ backgroundColor: C.navy, padding: '100px 48px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <TealBadge>How It Works</TealBadge>
          <h2 style={{ fontFamily: font.heading, fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
            Setup takes 3 minutes
          </h2>
        </div>

        {/* Circular ring diagram */}
        <div style={{ maxWidth: '660px', margin: '0 auto' }}>
          <svg viewBox="0 0 660 540" style={{ width: '100%', overflow: 'visible', display: 'block' }}>
            <defs>
              {/* Arrow markers */}
              <marker id="hiw-arr-on"  markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
                <path d="M0,1 L0,6 L7,3.5 z" fill={C.teal} />
              </marker>
              <marker id="hiw-arr-off" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
                <path d="M0,1 L0,6 L7,3.5 z" fill="rgba(148,163,184,0.25)" />
              </marker>
              {/* Teal glow filter */}
              <filter id="hiw-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Background dashed ring */}
            <circle cx={CX} cy={CY} r={R}
              fill="none"
              stroke="rgba(148,163,184,0.08)"
              strokeWidth="1"
              strokeDasharray="5 9"
            />

            {/* Arc segments */}
            {arcs.map((d, i) => {
              const isOn = i === active;
              return (
                <path key={i} d={d}
                  fill="none"
                  stroke={isOn ? C.teal : 'rgba(148,163,184,0.18)'}
                  strokeWidth={isOn ? 2.5 : 1.5}
                  markerEnd={isOn ? 'url(#hiw-arr-on)' : 'url(#hiw-arr-off)'}
                  filter={isOn ? 'url(#hiw-glow)' : undefined}
                />
              );
            })}

            {/* Center circle */}
            <circle cx={CX} cy={CY} r={58}
              fill={C.navy}
              stroke="rgba(0,229,160,0.18)"
              strokeWidth="1.5"
            />
            <text x={CX} y={CY - 10} textAnchor="middle"
              fill={C.textPrimary} fontFamily="Space Grotesk, sans-serif"
              fontSize="16" fontWeight="700">
              Sam<tspan fill={C.teal}>park</tspan>
            </text>
            <text x={CX} y={CY + 12} textAnchor="middle"
              fill={C.textSecondary} fontFamily="Inter, sans-serif" fontSize="12">
              {`Step ${active + 1} of 4`}
            </text>

            {/* Node circles */}
            {nodes.map((n, i) => {
              const isOn = i === active;
              return (
                <g key={i} onClick={() => handleNodeClick(i)} style={{ cursor: 'pointer' }}>
                  {isOn && (
                    <circle cx={n.x} cy={n.y} r={46}
                      fill="rgba(0,229,160,0.06)"
                      filter="url(#hiw-glow)"
                    />
                  )}
                  <circle cx={n.x} cy={n.y} r={NODE_R}
                    fill={isOn ? 'rgba(0,229,160,0.13)' : C.slate}
                    stroke={isOn ? C.teal : 'rgba(148,163,184,0.2)'}
                    strokeWidth="2"
                  />
                  <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle"
                    fill={isOn ? C.teal : C.textSecondary}
                    fontFamily="JetBrains Mono, monospace"
                    fontSize="14" fontWeight="700" letterSpacing="0.5">
                    {n.num}
                  </text>
                </g>
              );
            })}

            {/* Step title labels */}
            {nodes.map((n, i) => {
              const lp = labelPos[i];
              const isOn = i === active;
              const words = n.title.split(' ');
              const l1 = words.slice(0, 2).join(' ');
              const l2 = words.slice(2).join(' ');
              return (
                <g key={i} onClick={() => handleNodeClick(i)} style={{ cursor: 'pointer' }}>
                  <text x={lp.x} y={lp.y + (l2 ? -8 : 0)} textAnchor={lp.anchor}
                    fill={isOn ? C.textPrimary : C.textSecondary}
                    fontFamily="Space Grotesk, sans-serif"
                    fontSize="13" fontWeight={isOn ? '700' : '500'}>
                    {l1}
                  </text>
                  {l2 && (
                    <text x={lp.x} y={lp.y + 10} textAnchor={lp.anchor}
                      fill={isOn ? C.textPrimary : C.textSecondary}
                      fontFamily="Space Grotesk, sans-serif"
                      fontSize="13" fontWeight={isOn ? '700' : '500'}>
                      {l2}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Active step description */}
          <div style={{ textAlign: 'center', marginTop: '8px' }}>
            <p style={{ fontFamily: font.body, fontSize: '1rem', color: C.textSecondary, lineHeight: 1.72, margin: '0 auto', maxWidth: '420px' }}>
              {steps[active].desc}
            </p>
            {/* Dot indicators */}
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '24px' }}>
              {steps.map((_, i) => (
                <button key={i} onClick={() => handleNodeClick(i)} style={{
                  width: i === active ? '28px' : '6px', height: '6px',
                  borderRadius: '999px', border: 'none', padding: 0, cursor: 'pointer',
                  backgroundColor: i === active ? C.teal : 'rgba(148,163,184,0.2)',
                  transition: 'width 0.35s ease, background 0.3s',
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features Carousel ────────────────────────────────────────────────────────
function Features() {
  const FEATURES = [
    { icon: '🎭', title: 'Masked Contact',      desc: 'Callers and messengers interact with Sampark — your real number is never shared.' },
    { icon: '🚨', title: 'Emergency Routing',   desc: 'Mark a message urgent and it cuts through any comm mode, day or night.' },
    { icon: '🛡️', title: 'Abuse Prevention',    desc: 'Block senders, report abuse, and switch to message-only or silent mode instantly.' },
    { icon: '📋', title: 'Verified Ownership',  desc: 'RC + DL verification ensures only real vehicle owners can register on Sampark.' },
    { icon: '🔕', title: 'Privacy Controls',    desc: 'Choose who can reach you: everyone, messages only, or emergency contacts only.' },
    { icon: '⚡', title: 'Instant QR Delivery', desc: 'Approved vehicles receive a downloadable QR sticker within 24 hours of approval.' },
  ];

  const [active, setActive] = useState(0);
  const cardRefs   = useRef([]);
  const isAnimating = useRef(false);

  const N = FEATURES.length;

  // Circular shortest-path diff so the loop wraps correctly
  const circDiff = (i, center) => {
    const raw = i - center;
    return raw - Math.round(raw / N) * N;
  };

  // Per-position config: x offset, inward rotateY, scale, opacity
  const getConfig = (diff) => {
    const a = Math.abs(diff);
    if (a === 0) return { x: 0,    ry: 0,   scale: 1,    opacity: 1,    z: 20 };
    if (a === 1) return { x: diff < 0 ? -310 : 310, ry: diff < 0 ? 42 : -42, scale: 0.82, opacity: 0.65, z: 10 };
    if (a === 2) return { x: diff < 0 ? -540 : 540, ry: diff < 0 ? 55 : -55, scale: 0.65, opacity: 0.35, z: 5  };
    return null; // hide cards that are too far away
  };

  const applyPositions = useCallback((newActive) => {
    FEATURES.forEach((_, i) => {
      const el = cardRefs.current[i];
      if (!el) return;
      const diff = circDiff(i, newActive);
      const cfg  = getConfig(diff);
      if (!cfg) {
        gsap.set(el, { display: 'none' });
        return;
      }
      gsap.to(el, {
        x: cfg.x, rotateY: cfg.ry, scale: cfg.scale,
        opacity: cfg.opacity, zIndex: cfg.z,
        duration: 0.6, ease: 'power3.out',
        display: 'flex',
        onComplete: () => { isAnimating.current = false; },
      });
    });
  }, []);

  // Init without animation
  useEffect(() => {
    FEATURES.forEach((_, i) => {
      const el = cardRefs.current[i];
      if (!el) return;
      const diff = circDiff(i, 0);
      const cfg  = getConfig(diff);
      if (!cfg) { gsap.set(el, { display: 'none' }); return; }
      gsap.set(el, { x: cfg.x, rotateY: cfg.ry, scale: cfg.scale, opacity: cfg.opacity, zIndex: cfg.z, display: 'flex' });
    });
  }, []);

  // Wrap-around go — no hard stop at either end
  const go = useCallback((next) => {
    if (isAnimating.current) return;
    const wrapped = ((next % N) + N) % N;
    isAnimating.current = true;
    setActive(wrapped);
    applyPositions(wrapped);
  }, [applyPositions, N]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  go(active - 1);
      if (e.key === 'ArrowRight') go(active + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, go]);

  return (
    <section id="features" style={{ background: 'linear-gradient(160deg, #0D1438 0%, #0A0F2C 56%, #07091E 100%)', padding: '110px 0 80px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '72px', padding: '0 48px' }}>
        <TealBadge>Features</TealBadge>
        <h2 style={{ fontFamily: font.heading, fontSize: 'clamp(1.8rem,4vw,2.8rem)', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', margin: 0 }}>
          Everything you need. Nothing you don't.
        </h2>
      </div>

      {/* Stage */}
      <div style={{ position: 'relative', height: '420px', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '1400px', perspectiveOrigin: '50% 50%' }}>

        {/* Center glow — stronger on the dark-green bg */}
        <div style={{ position: 'absolute', width: '420px', height: '420px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,160,0.1) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        {FEATURES.map((f, i) => {
          const isCenter = i === active;
          return (
            <div
              key={f.title}
              ref={el => cardRefs.current[i] = el}
              onClick={() => !isCenter && go(i)}
              style={{
                position: 'absolute',
                width: '300px',
                minHeight: '340px',
                background: isCenter
                  ? 'linear-gradient(145deg, #1E293B 0%, #111834 100%)'
                  : C.panel,
                border: `1px solid ${isCenter ? C.teal : C.borderSoft}`,
                borderRadius: '24px',
                padding: '36px 32px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                cursor: isCenter ? 'default' : 'pointer',
                transformStyle: 'preserve-3d',
                boxShadow: isCenter
                  ? '0 0 0 1px rgba(0,229,160,0.3), 0 32px 80px rgba(0,0,0,0.6)'
                  : '0 12px 40px rgba(0,0,0,0.4)',
              }}
            >
              {/* Icon block */}
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                backgroundColor: isCenter ? 'rgba(0,229,160,0.12)' : 'rgba(148,163,184,0.08)',
                border: `1px solid ${isCenter ? 'rgba(0,229,160,0.25)' : 'rgba(148,163,184,0.14)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem',
              }}>
                {f.icon}
              </div>

              <h3 style={{ fontFamily: font.heading, fontSize: '1.15rem', fontWeight: 700, color: C.textPrimary, margin: 0, lineHeight: 1.3 }}>
                {f.title}
              </h3>
              <p style={{ fontFamily: font.body, fontSize: '0.88rem', color: C.textSecondary, lineHeight: 1.72, margin: 0 }}>
                {f.desc}
              </p>

              {isCenter && (
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ height: '2px', width: '32px', backgroundColor: C.teal, borderRadius: '2px' }} />
                  <span style={{ fontFamily: font.mono, fontSize: '0.7rem', color: C.teal, letterSpacing: '0.08em' }}>ACTIVE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '52px' }}>
        {/* Prev — always active, loops */}
        <button onClick={() => go(active - 1)} style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: 'rgba(148,163,184,0.08)',
          border: `1px solid ${C.borderTeal}`,
          color: C.teal, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        {/* Dots */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {FEATURES.map((_, i) => (
            <button key={i} onClick={() => go(i)} style={{
              width: i === active ? '28px' : '6px',
              height: '6px', borderRadius: '999px',
              backgroundColor: i === active ? C.teal : 'rgba(148,163,184,0.2)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'width 0.35s ease, background 0.3s',
            }} />
          ))}
        </div>

        {/* Next — always active, loops */}
        <button onClick={() => go(active + 1)} style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: 'rgba(148,163,184,0.08)',
          border: `1px solid ${C.borderTeal}`,
          color: C.teal, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Active label */}
      <div style={{ textAlign: 'center', marginTop: '28px', padding: '0 48px' }}>
        <p style={{ fontFamily: font.heading, fontSize: '1.05rem', fontWeight: 600, color: C.textPrimary, margin: '0 0 6px' }}>
          {FEATURES[active].title}
        </p>
        <p style={{ fontFamily: font.body, fontSize: '0.88rem', color: C.textSecondary, margin: 0, maxWidth: '480px', marginInline: 'auto', lineHeight: 1.65 }}>
          {FEATURES[active].desc}
        </p>
      </div>
    </section>
  );
}

// ─── Trust ────────────────────────────────────────────────────────────────────
function Trust() {
  const ref       = useRef(null);
  const shieldRef = useRef(null);
  const points = [
    'Your phone number is never stored publicly',
    'Documents verified by our admin team before approval',
    'Aligned with India\'s DPDP Act 2023',
    'All contact requests are logged and auditable',
    'QR tokens are rotatable — invalidate anytime',
  ];

  useEffect(() => {
    gsap.from(shieldRef.current, {
      scrollTrigger: { trigger: ref.current, start: 'top 78%' },
      scale: 0.7, duration: 0.7, ease: 'back.out(1.5)',
    });
    gsap.from(ref.current.querySelectorAll('.trust-point'), {
      scrollTrigger: { trigger: ref.current, start: 'top 75%' },
      x: -20, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0.2,
    });
  }, []);

  return (
    <section id="privacy" ref={ref} style={{ backgroundColor: C.navy, padding: '100px 48px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', gap: '80px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div ref={shieldRef} style={{ flex: '0 0 auto', textAlign: 'center' }}>
          <div style={{
            width: '160px', height: '160px', borderRadius: '50%',
            backgroundColor: 'rgba(0,229,160,0.07)',
            border: `2px solid ${C.borderTeal}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '4rem',
            boxShadow: '0 0 60px rgba(0,229,160,0.1)',
          }}>🛡️</div>
          <p style={{ fontFamily: font.mono, fontSize: '0.72rem', color: C.teal, marginTop: '14px', letterSpacing: '0.1em' }}>PRIVACY FIRST</p>
        </div>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <TealBadge>Trust & Security</TealBadge>
          <h2 style={{ fontFamily: font.heading, fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.02em', margin: '0 0 28px' }}>
            Your data stays yours
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {points.map(p => (
              <li key={p} className="trust-point" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: C.teal, fontWeight: 700, flexShrink: 0, marginTop: '2px' }}>✓</span>
                <span style={{ fontFamily: font.body, fontSize: '0.95rem', color: C.textSecondary, lineHeight: 1.6 }}>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTA() {
  const ref    = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    gsap.from(ref.current.querySelectorAll('.cta-el'), {
      scrollTrigger: { trigger: ref.current, start: 'top 80%' },
      y: 20, duration: 0.6, stagger: 0.15, ease: 'power3.out',
    });
    gsap.to(btnRef.current, { scale: 1.04, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1 });
  }, []);

  return (
    <section ref={ref} style={{ backgroundColor: C.navyLight, padding: '120px 48px', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <TealBadge>Ready?</TealBadge>
        <h2 className="cta-el" style={{ fontFamily: font.heading, fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 700, color: C.textPrimary, letterSpacing: '-0.03em', margin: '0 0 16px' }}>
          Protect Your Number.<br />
          <span style={{ color: C.teal }}>Get Your QR.</span>
        </h2>
        <p className="cta-el" style={{ fontFamily: font.body, fontSize: '1rem', color: C.textSecondary, lineHeight: 1.7, margin: '0 0 40px' }}>
          Join vehicle owners who've taken back control of their privacy. Free to register. Takes under 3 minutes.
        </p>
        <div className="cta-el">
          <Link ref={btnRef} to="/login" style={{
            display: 'inline-block',
            fontFamily: font.body, fontWeight: 700, fontSize: '1.05rem',
            backgroundColor: C.teal, color: C.navy,
            borderRadius: '12px', padding: '16px 38px',
            textDecoration: 'none',
            boxShadow: '0 0 40px rgba(0,229,160,0.3)',
          }}>
            Register Your Vehicle →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const col = (heading, links) => (
    <div>
      <p style={{ fontFamily: font.heading, fontWeight: 700, fontSize: '1rem', color: C.textPrimary, margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {heading}
      </p>
      {links.map(([label, href]) => (
        <a key={label} href={href}
          style={{ display: 'block', fontFamily: font.body, fontSize: '1rem', color: C.textSecondary, textDecoration: 'none', marginBottom: '12px', lineHeight: 1.5 }}
          onMouseEnter={e => e.currentTarget.style.color = C.textPrimary}
          onMouseLeave={e => e.currentTarget.style.color = C.textSecondary}
        >{label}</a>
      ))}
    </div>
  );

  return (
    <footer style={{ backgroundColor: C.navyLight, borderTop: `1px solid ${C.border}`, padding: '72px 48px 40px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '48px', marginBottom: '64px' }}>

          {/* Brand blurb */}
          <div style={{ flex: '1 1 280px', maxWidth: '320px' }}>
            <span style={{ fontFamily: font.heading, fontWeight: 700, fontSize: '1.8rem', color: C.textPrimary }}>
              Sam<span style={{ color: C.teal }}>park</span>
            </span>
            <p style={{ fontFamily: font.body, fontSize: '1rem', color: C.textSecondary, lineHeight: 1.75, margin: '16px 0 0' }}>
              Privacy-first vehicle identity for India. Receive contact requests without ever revealing your phone number.
            </p>
          </div>

          {/* Link columns */}
          <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
            {col('Product', [
              ['Features',     '#features'],
              ['How It Works', '#how-it-works'],
              ['Privacy',      '#privacy'],
            ])}
            {col('Legal', [
              ['Privacy Policy',   '#privacy'],
              ['Terms of Service', '#'],
              ['Contact Us',       '#'],
            ])}
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <p style={{ fontFamily: font.body, fontSize: '0.95rem', color: C.textSecondary, margin: 0 }}>
            © 2025 Sampark. All rights reserved.
          </p>
          <p style={{ fontFamily: font.mono, fontSize: '0.82rem', color: C.teal, margin: 0, letterSpacing: '0.06em' }}>
            BUILT FOR INDIA 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  useEffect(() => () => ScrollTrigger.getAll().forEach(t => t.kill()), []);

  return (
    <div style={{ backgroundColor: C.navy, overflowX: 'hidden' }}>
      <Navbar />
      <Hero />
      <Problems />
      <HowItWorks />
      <Features />
      <Trust />
      <CTA />
      <Footer />
    </div>
  );
}
