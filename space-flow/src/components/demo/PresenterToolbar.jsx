import React from 'react';
import { Play, Pause, SkipForward, RotateCcw, X } from 'lucide-react';
import { useDemo } from '../../store/DemoContext.jsx';

export default function PresenterToolbar() {
  const { activeJourneyId, currentStep, totalSteps, currentStepInfo, isPlaying, isCompleted, togglePlayPause, resetJourney, JOURNEYS } = useDemo();
  if (!activeJourneyId) return null;

  const journey = JOURNEYS[activeJourneyId];
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  return (
    <div className="presenter-toolbar">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div className="pt-journey-label">Demo Journey</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-violet-lt)', marginTop: 2 }}>{journey?.label}</div>
        </div>
        <button className="sf-modal-close" onClick={resetJourney} title="Exit journey"><X size={16} /></button>
      </div>

      <div className="pt-progress">
        <div className="pt-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="pt-step-info">
        {isCompleted
          ? '✅ Journey complete!'
          : currentStepInfo?.text || 'Starting…'}
      </div>

      <div style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>
        Step {currentStep + 1} of {totalSteps}
      </div>

      <div className="pt-controls">
        <button className="pt-btn" onClick={resetJourney} title="Restart">
          <RotateCcw size={13} /> Reset
        </button>
        <button className={`pt-btn ${isPlaying ? '' : 'primary'}`} onClick={togglePlayPause}>
          {isPlaying ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Play</>}
        </button>
      </div>
    </div>
  );
}
