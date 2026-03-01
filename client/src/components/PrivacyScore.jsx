/**
 * PrivacyScore component
 * ----------------------
 * Renders a circular SVG score ring + checklist breakdown.
 *
 * Props:
 *   score        {number}   0-100
 *   breakdown    {array}    [{ factor, points, completed, action }]
 *   compact      {boolean}  if true, renders a smaller inline badge version
 *   onActionClick {fn}      called with the action URL when "Fix this" is clicked
 *   prevScore    {number|null} if provided, ring animates from prevScore to score
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Color helpers ─────────────────────────────────────────────────────────────
function scoreColor(s) {
  if (s >= 80) return '#38A169'; // green
  if (s >= 60) return '#00E5A0'; // teal
  if (s >= 40) return '#F59E0B'; // amber
  return '#E53E3E';              // red
}
function scoreLabel(s) {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  return 'Needs Attention';
}

// ── SVG Ring ─────────────────────────────────────────────────────────────────
const R  = 44;      // circle radius
const CX = 56;      // viewBox centre
const CY = 56;
const CIRCUMFERENCE = 2 * Math.PI * R;

function Ring({ displayScore, size = 112 }) {
  const color  = scoreColor(displayScore);
  const offset = CIRCUMFERENCE * (1 - displayScore / 100);

  return (
    <svg width={size} height={size} viewBox="0 0 112 112" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      {/* Track */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="10" />
      {/* Progress */}
      <circle
        cx={CX} cy={CY} r={R} fill="none"
        stroke={color} strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
      />
    </svg>
  );
}

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ from, to, duration = 800 }) {
  const [display, setDisplay] = useState(from ?? to);
  const rafRef = useRef(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const startVal = display;

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(startVal + (to - startVal) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [to]); // eslint-disable-line

  return display;
}

// ── Compact badge (for vehicle cards) ────────────────────────────────────────
export function ScoreBadge({ score }) {
  const color = scoreColor(score);
  return (
    <div style={{
      position: 'relative', width: '40px', height: '40px', flexShrink: 0,
    }}>
      <svg width="40" height="40" viewBox="0 0 112 112" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="12" />
        <circle
          cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - score / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <span style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6rem', fontWeight: 700, color,
      }}>
        {score}
      </span>
    </div>
  );
}

// ── Full widget ───────────────────────────────────────────────────────────────
export default function PrivacyScore({ score, breakdown = [], prevScore = null, onActionClick, compact = false }) {
  const navigate    = useNavigate();
  const animFrom    = prevScore ?? score;
  const color       = scoreColor(score);
  const label       = scoreLabel(score);

  function handleAction(url) {
    if (onActionClick) onActionClick(url);
    else navigate(url);
  }

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: '56px', height: '56px' }}>
          <Ring displayScore={score} size={56} />
          <span style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 800, color,
            transform: 'rotate(0deg)', // offset ring rotation
          }}>
            <AnimatedNumber from={animFrom} to={score} />
          </span>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color }}>
            {label}
          </p>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8' }}>
            Privacy score
          </p>
        </div>
      </div>
    );
  }

  const completed   = breakdown.filter(f => f.completed);
  const incomplete  = breakdown.filter(f => !f.completed);

  return (
    <div style={{
      backgroundColor: '#111834', borderRadius: '16px',
      border: '1px solid rgba(148,163,184,0.12)',
      padding: '1.25rem', marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>

        {/* Ring + number */}
        <div style={{ position: 'relative', width: '112px', height: '112px', flexShrink: 0 }}>
          <Ring displayScore={score} size={112} />
          {/* Text overlay — counter-rotate since ring itself is rotated -90deg */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, lineHeight: 1, color }}>
              <AnimatedNumber from={animFrom} to={score} />
            </span>
            <span style={{ fontSize: '0.65rem', fontWeight: 600, color, marginTop: '2px', letterSpacing: '0.05em' }}>
              {label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Breakdown list */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          {/* Incomplete items first — the key action drivers */}
          {incomplete.map(f => (
            <div key={f.factor} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8', flexShrink: 0 }}>○</span>
              <span style={{ flex: 1, fontSize: '0.78rem', color: '#94A3B8' }}>{f.factor}</span>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', flexShrink: 0 }}>+{f.points}</span>
              {f.action && (
                <button
                  onClick={() => handleAction(f.action)}
                  style={{ fontSize: '0.7rem', color: '#00E5A0', background: 'none', border: 'none', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', textDecoration: 'underline' }}
                >
                  Fix this
                </button>
              )}
            </div>
          ))}
          {/* Completed items */}
          {completed.map(f => (
            <div key={f.factor} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', color: '#38A169', flexShrink: 0 }}>✓</span>
              <span style={{ flex: 1, fontSize: '0.78rem', color: '#F1F5F9' }}>{f.factor}</span>
              <span style={{ fontSize: '0.72rem', color: '#38A169', flexShrink: 0 }}>+{f.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
