import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, ArrowRight, Calendar, ShieldCheck } from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';

export default function ConfirmPage() {
  const { pendingBooking, settings } = useApp();
  const navigate = useNavigate();

  const status = pendingBooking?.status || 'pending_approval';
  const isConfirmed = status === 'confirmed';

  return (
    <div style={{ maxWidth: 540, margin: '60px auto', textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>
      {/* Icon */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isConfirmed ? 'var(--sf-emerald-dim)' : 'var(--sf-amber-dim)',
        border: `2px solid ${isConfirmed ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
        boxShadow: isConfirmed ? '0 0 40px rgba(16,185,129,0.2)' : '0 0 40px rgba(245,158,11,0.2)',
        animation: 'pulse-glow 2.5s ease-in-out infinite',
      }}>
        {isConfirmed
          ? <CheckCircle size={38} style={{ color: 'var(--sf-emerald-lt)' }} />
          : <Clock size={38} style={{ color: 'var(--sf-amber-lt)' }} />
        }
      </div>

      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, marginBottom: 10 }}>
        {isConfirmed ? 'Booking Confirmed!' : 'Request Submitted!'}
      </h1>

      <p style={{ fontSize: 16, color: 'var(--sf-text-sub)', lineHeight: 1.7, marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
        {isConfirmed
          ? `Your booking for ${pendingBooking?.facilityName} is confirmed. You'll receive a confirmation email shortly.`
          : `Your booking request for ${pendingBooking?.facilityName} is under review. Venue staff will confirm within 24 hours.`
        }
      </p>

      {/* Status card */}
      <div style={{ background: 'var(--sf-bg-card)', border: '1px solid var(--sf-border-hi)', borderRadius: 'var(--r-xl)', padding: '24px 28px', marginBottom: 24, textAlign: 'left' }}>
        {pendingBooking && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Facility', val: pendingBooking.facilityName },
              { label: 'Event type', val: pendingBooking.eventType || '—' },
              { label: 'Status', val: isConfirmed ? '✅ Confirmed' : '⏳ Pending approval' },
              { label: 'Payment', val: pendingBooking.paymentMode === 'auto' ? '💳 Card payment' : '🏦 Invoice issued' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--sf-text-mute)' }}>{r.label}</span>
                <span style={{ fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {pendingBooking?.preAuthEnabled && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--sf-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <ShieldCheck size={16} style={{ color: 'var(--sf-amber)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--sf-text-sub)' }}>
              A security hold of <strong style={{ color: 'var(--sf-amber-lt)' }}>£{pendingBooking?.facility?.preAuthAmount?.toLocaleString()}</strong> has been placed on your card and will be released after the event.
            </span>
          </div>
        )}
      </div>

      {!isConfirmed && (
        <div style={{ padding: '14px 20px', background: 'var(--sf-amber-dim)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--r-lg)', marginBottom: 20, fontSize: 13.5, color: 'var(--sf-amber-lt)', textAlign: 'left', display: 'flex', gap: 10, alignItems: 'center' }}>
          <Clock size={16} />
          <span>You'll be notified by email once the venue approves your booking. Average response time is under 4 hours.</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/app/my-bookings')}>
          <Calendar size={15} /> My Bookings
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/app/book')}>
          Book Another Space <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
