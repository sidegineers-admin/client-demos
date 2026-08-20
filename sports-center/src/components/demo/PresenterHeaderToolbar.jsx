import React, { useState } from 'react';
import { User, Calendar, RotateCcw, ShieldCheck, SlidersHorizontal, ChevronDown, CheckCircle2, Trophy, Sparkles, Play, Pause, Check } from 'lucide-react';
import { useDemo } from '../../store/DemoContext.jsx';

const PERSONA_BADGES = {
  member:    { color: '#52B788', label: '👤 Member: Tom Richards' },
  ecb:       { color: '#5B9BD5', label: '🏅 ECB Coach: Sarah Mitchell' },
  new_staff: { color: '#E24B4A', label: '📝 Staff Applicant: Alex Turner' },
  admin:     { color: '#FFD23F', label: '🛡️ Admin: Centre Staff' },
};

export default function PresenterHeaderToolbar() {
  const { activePersona, activeJourneyId, isPlaying, isCompleted, togglePlayPause, triggerJourney, stopDemo } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);

  const persona = activePersona ? PERSONA_BADGES[activePersona] : null;

  const JOURNEYS = [
    { id: 'single_booking',      label: '👤 Single Slot Booking' },
    { id: 'multi_recurring',     label: '📅 Multi-Slot & Recurring' },
    { id: 'cancellation_refund', label: '🔄 24h Cancel & Refund' },
    { id: 'ecb_rate',            label: '🏅 ECB Coach 50% Rate' },
    { id: 'staff_approval',      label: '📝 Staff Registration Queue' },
    { id: 'admin_dashboard',     label: '🛡️ Admin Dashboard' },
    { id: 'block_lanes',         label: '🚧 Block Lanes / Full Day' },
    { id: 'future_sports',       label: '🏸 Future Sports (Squash/Padel)' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* Persona Badge */}
      {persona ? (
        <span style={{ fontSize: 11.5, fontWeight: 700, color: persona.color, background: 'rgba(0,0,0,0.35)', padding: '3px 10px', borderRadius: 12, border: `1px solid ${persona.color}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {persona.label}
        </span>
      ) : (
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--c-gold)', background: 'rgba(255,210,63,0.08)', padding: '3px 10px', borderRadius: 12, border: '1px solid rgba(255,210,63,0.3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          📢 Presenter Mode
        </span>
      )}

      {/* Completion Indicator */}
      {isCompleted && (
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-green)', background: 'rgba(82,183,136,0.15)', padding: '3px 9px', borderRadius: 10, border: '1px solid rgba(82,183,136,0.3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Check size={12} /> Completed
        </span>
      )}

      {/* Play / Pause Toggle Button */}
      {activeJourneyId && !isCompleted && (
        <button
          className="btn btn-ghost btn-sm"
          onClick={togglePlayPause}
          style={{ fontSize: 11, padding: '3px 8px', gap: 4, display: 'flex', alignItems: 'center', borderColor: isPlaying ? 'rgba(255,210,63,0.4)' : 'var(--c-gold)', color: 'var(--c-gold)' }}
          title={isPlaying ? 'Pause journey' : 'Resume journey'}
        >
          {isPlaying ? <Pause size={12} /> : <Play size={12} />}
          <span>{isPlaying ? 'Pause' : 'Resume'}</span>
        </button>
      )}

      {/* 1-Click Presenter Journey Trigger Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11.5, padding: '4px 10px', gap: 6, display: 'flex', alignItems: 'center', borderColor: 'rgba(255,210,63,0.35)', color: 'var(--c-gold)', background: 'rgba(255,210,63,0.08)' }}
          onClick={() => setMenuOpen(o => !o)}
        >
          <Sparkles size={13} />
          <span>Demo Journeys</span>
          <ChevronDown size={12} />
        </button>

        {menuOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#0E281E', border: '1.5px solid var(--c-gold)', borderRadius: 10, padding: 6, width: 220, zIndex: 10000, boxShadow: '0 12px 32px rgba(0,0,0,0.85)' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--c-gold)', padding: '4px 8px 6px', borderBottom: '1px solid rgba(247,245,240,0.08)', marginBottom: 4 }}>
              1-Click Demo Journeys
            </div>
            {JOURNEYS.map(j => (
              <button
                key={j.id}
                onClick={() => {
                  triggerJourney(j.id);
                  setMenuOpen(false);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '7px 9px', fontSize: 12, color: activeJourneyId === j.id ? 'var(--c-gold)' : 'var(--c-text-sub)',
                  fontWeight: activeJourneyId === j.id ? 700 : 400,
                  background: activeJourneyId === j.id ? 'rgba(255,210,63,0.15)' : 'none',
                  border: 'none', borderRadius: 6, cursor: 'pointer', marginBottom: 2
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,210,63,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = activeJourneyId === j.id ? 'rgba(255,210,63,0.15)' : 'none'}
              >
                {j.label}
              </button>
            ))}

            {activeJourneyId && (
              <button
                onClick={() => { stopDemo(); setMenuOpen(false); }}
                style={{ display: 'block', width: '100%', textAlign: 'center', padding: '6px', marginTop: 4, fontSize: 11, color: 'var(--c-red)', background: 'rgba(226,74,74,0.1)', border: '1px solid rgba(226,74,74,0.3)', borderRadius: 6, cursor: 'pointer' }}
              >
                Reset Demo Mode
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
