import React, { useEffect, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, X, Zap } from 'lucide-react';
import { useDemo } from '../../store/DemoContext.jsx';

const PERSONA = {
  member: { color: '#52B788', label: '👤 Member' },
  ecb:    { color: '#5B9BD5', label: '🏅 ECB Coach' },
  admin:  { color: '#FFD23F', label: '🛡️ Staff' },
};

export default function DemoBanner() {
  const { active, step, stepIndex, totalSteps, isPlaying, nextStep, prevStep, togglePlay, stopDemo } = useDemo();
  const [timerPct, setTimerPct] = useState(0);

  // Per-step progress bar animation
  useEffect(() => {
    if (!active || !isPlaying) return;
    setTimerPct(0);
    const dur = step.duration || 6500;
    const tick = 80;
    const increment = (tick / dur) * 100;
    const id = setInterval(() => setTimerPct(p => Math.min(p + increment, 100)), tick);
    return () => clearInterval(id);
  }, [active, isPlaying, stepIndex]);

  if (!active) return null;

  const p = step.persona ? PERSONA[step.persona] : null;
  const overallPct = ((stepIndex) / (totalSteps - 1)) * 100;

  return (
    <div className="demo-banner">
      {/* Overall progress */}
      <div className="demo-overall-bar" style={{ width: `${overallPct}%` }} />
      {/* Per-step timer */}
      <div className="demo-timer-bar" style={{ width: `${timerPct}%` }} />

      <div className="demo-banner-body">
        {/* Left — persona + label */}
        <div className="demo-left">
          <div className="demo-badge"><Zap size={11} /> AUTO DEMO</div>
          {p && (
            <div className="demo-persona-pill" style={{ borderColor: p.color, color: p.color }}>
              {p.label}{step.personaName ? ` · ${step.personaName}` : ''}
            </div>
          )}
        </div>

        {/* Center — action badge & narration */}
        <div className="demo-center">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 2 }}>
            <div className="demo-step-title">{step.title}</div>
            {step.actionBadge && (
              <span className="mono" style={{ fontSize: 11, background: 'rgba(255,210,63,0.15)', color: 'var(--c-gold)', border: '1px solid rgba(255,210,63,0.3)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                {step.actionBadge}
              </span>
            )}
          </div>
          <div className="demo-narration">{step.narration}</div>
        </div>

        {/* Right — counter + controls */}
        <div className="demo-right">
          <div className="demo-counter">
            <span className="demo-count-num">{stepIndex + 1}</span>
            <span className="demo-count-total">/ {totalSteps}</span>
          </div>
          <div className="demo-controls">
            <button className="demo-ctrl" onClick={prevStep} disabled={stepIndex === 0} title="Previous step">
              <SkipBack size={13} />
            </button>
            <button className="demo-ctrl demo-ctrl-play" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Resume'}>
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
            <button className="demo-ctrl" onClick={nextStep} disabled={stepIndex === totalSteps - 1} title="Next step">
              <SkipForward size={13} />
            </button>
            <button className="demo-ctrl demo-ctrl-exit" onClick={stopDemo} title="Exit demo">
              <X size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
