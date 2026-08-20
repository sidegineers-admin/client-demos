import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, RotateCcw, CalendarDays, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { useDemo } from '../../store/DemoContext.jsx';
import { storage, uid } from '../../store/storage.js';

function hoursUntilBooking(dateKey, timeStr) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const hour = parseInt(timeStr.split(':')[0], 10);
  const bookingDate = new Date(y, m - 1, d, hour, 0, 0);
  const now = new Date();
  const diffMs = bookingDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

export default function MyBookingsPage() {
  const { session, bookings, setBookings, myIds, setMyIds, showToast } = useApp();
  const navigate = useNavigate();
  const [showPast, setShowPast] = useState(false);

  // Cancellation modal state
  const [cancelTarget, setCancelTarget] = useState(null); // booking object or { isSeries: true, recurringId, count }
  const [cancelReason, setCancelReason] = useState('Schedule conflict');
  const [cancelNotes, setCancelNotes]   = useState('');
  const [refundMethod, setRefundMethod] = useState('original_card');
  const [cancelBusy, setCancelBusy]     = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const nowH = new Date().getHours();

  const myBookings = bookings
    .filter(b => myIds.includes(b.id))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const upcoming = myBookings.filter(b => b.date > today || (b.date === today && parseInt(b.time) > nowH));
  const past     = myBookings.filter(b => b.date < today || (b.date === today && parseInt(b.time) <= nowH));

  const { demoOpenCancelModal } = useDemo() || {};
  React.useEffect(() => {
    if (demoOpenCancelModal && upcoming.length > 0) {
      setCancelTarget(upcoming[0]);
    }
  }, [demoOpenCancelModal, upcoming]);

  // Group by recurringId
  const groups = {};
  upcoming.forEach(b => {
    const key = b.recurringId || b.id;
    if (!groups[key]) groups[key] = [];
    groups[key].push(b);
  });

  async function processCancellationSubmit(e) {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelBusy(true);

    await new Promise(r => setTimeout(r, 1200)); // simulate payment reversal API call

    try {
      const latest = await storage.get('bookings');
      const current = latest?.value ? JSON.parse(latest.value) : [];

      if (cancelTarget.isSeries) {
        const idsToRemove = current.filter(b => b.recurringId === cancelTarget.recurringId && myIds.includes(b.id)).map(b => b.id);
        const filtered = current.filter(b => !idsToRemove.includes(b.id));
        const newMine = myIds.filter(i => !idsToRemove.includes(i));
        await storage.set('bookings', JSON.stringify(filtered));
        await storage.set('my-booking-ids', JSON.stringify(newMine));
        setBookings(filtered); setMyIds(newMine);
        showToast(`Series cancelled. Payment reversal of £${(cancelTarget.totalAmount || 0).toFixed(2)} initiated.`);
      } else {
        const id = cancelTarget.id;
        const filtered = current.filter(b => b.id !== id);
        const newMine = myIds.filter(i => i !== id);
        await storage.set('bookings', JSON.stringify(filtered));
        await storage.set('my-booking-ids', JSON.stringify(newMine));
        setBookings(filtered); setMyIds(newMine);
        
        const isEligible24h = hoursUntilBooking(cancelTarget.date, cancelTarget.time) >= 24;
        const refundAmt = isEligible24h ? (cancelTarget.amount || 0) : 0;
        
        if (cancelTarget.subsidised || refundAmt === 0) {
          showToast('Booking cancelled.');
        } else {
          showToast(`Booking cancelled. £${refundAmt.toFixed(2)} refund reversed to your card.`);
        }
      }
      setCancelTarget(null);
    } catch {
      showToast('Could not process cancellation.', 'error');
    }
    setCancelBusy(false);
  }

  function renderCard(b, isGrouped = false) {
    const isPast = b.date < today || (b.date === today && parseInt(b.time) <= nowH);
    const hrsLeft = hoursUntilBooking(b.date, b.time);
    const eligible24h = hrsLeft >= 24;

    return (
      <div className="booking-card" key={b.id} style={{ opacity: isPast ? 0.65 : 1 }}>
        <div className="booking-card-top">
          <div>
            <div className="booking-sport">{b.sportName}</div>
            {b.recurringId && !isGrouped && (
              <span className="recurring-pill"><RotateCcw size={10} /> Recurring</span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="booking-when mono">{b.date}</div>
            <div style={{ fontSize: 13, color: 'var(--c-text-mute)' }}>{b.time} – {String(parseInt(b.time)+1).padStart(2,'0')}:00</div>
          </div>
        </div>
        <div className="booking-sub">
          {b.unit} &mdash; booked under {b.name}
          {b.subsidised && <span style={{ color: 'var(--c-green)', fontWeight: 700 }}> · Free (ECB coach)</span>}
          {b.amount > 0 && <span style={{ color: 'var(--c-text-mute)' }}> · £{b.amount.toFixed(2)} paid</span>}
        </div>

        {!isPast && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 5, color: eligible24h ? 'var(--c-green)' : 'var(--c-amber)' }}>
              {eligible24h ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {eligible24h ? 'Notice > 24h: 100% Refundable' : 'Notice < 24h: Late Policy applies'}
            </div>
            <div className="booking-actions" style={{ marginTop: 0 }}>
              <button id="demo-cancel-btn-0" className="btn btn-ghost btn-sm" style={{ color: 'var(--c-red)', borderColor: 'rgba(226,74,74,0.3)' }} onClick={() => setCancelTarget(b)}>
                <Trash2 size={13} /> Cancel session
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="my-bookings-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 32 }}>My Bookings</h1>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/book')}>
          <CalendarDays size={14} /> Book a slot
        </button>
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--c-text-mute)' }}>
          <CalendarDays size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-sub)' }}>No bookings yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Book a net lane and it'll appear here.</div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/app/book')}>Book a slot</button>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-text-mute)', marginBottom: 12 }}>
            Upcoming ({upcoming.length})
          </div>

          {/* Group recurring sessions */}
          {Object.entries(groups).map(([key, items]) => {
            if (items.length === 1) return renderCard(items[0]);
            const totalSeriesPrice = items.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            return (
              <div key={key} style={{ background: 'rgba(255,210,63,0.05)', border: '1px solid rgba(255,210,63,0.2)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RotateCcw size={14} style={{ color: 'var(--c-gold)' }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>Standing booking ({items.length} sessions)</span>
                  </div>
                  <button className="btn btn-danger btn-sm"
                    onClick={() => setCancelTarget({ isSeries: true, recurringId: items[0].recurringId, count: items.length, totalAmount: totalSeriesPrice, sample: items[0] })}>
                    Cancel series
                  </button>
                </div>
                {items.slice(0, 3).map(b => renderCard(b, true))}
                {items.length > 3 && (
                  <div style={{ fontSize: 12, color: 'var(--c-text-mute)', textAlign: 'center', paddingTop: 8 }}>
                    +{items.length - 3} more sessions in this series
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* Past */}
      {past.length > 0 && (
        <>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, marginBottom: 12, display: 'flex', gap: 6 }} onClick={() => setShowPast(p => !p)}>
            {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Past bookings ({past.length})
          </button>
          {showPast && past.map(b => renderCard(b))}
        </>
      )}

      {/* Cancellation Modal Form */}
      {cancelTarget && (
        <div className="modal-backdrop" onClick={() => !cancelBusy && setCancelTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={22} color="var(--c-red)" />
              Cancel Booking & Payment Reversal
            </div>
            <div className="modal-sub">
              {cancelTarget.isSeries
                ? `Cancel all ${cancelTarget.count} sessions in this standing order`
                : `${cancelTarget.unit} on ${cancelTarget.date} @ ${cancelTarget.time}`}
            </div>

            {/* 24-Hour Policy Banner */}
            {(() => {
              const hrsLeft = cancelTarget.isSeries ? 48 : hoursUntilBooking(cancelTarget.date, cancelTarget.time);
              const isEligible = hrsLeft >= 24;
              const amt = cancelTarget.isSeries ? cancelTarget.totalAmount : (cancelTarget.amount || 0);

              return (
                <div style={{
                  background: isEligible ? 'rgba(82,183,136,0.1)' : 'rgba(255,210,63,0.1)',
                  border: `1px solid ${isEligible ? 'rgba(82,183,136,0.3)' : 'rgba(255,210,63,0.35)'}`,
                  borderRadius: 10, padding: 14, marginBottom: 16
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isEligible ? 'var(--c-green)' : 'var(--c-gold)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {isEligible ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    {isEligible ? '24+ Hours Notice — Full Refund Approved' : 'Under 24 Hours Notice — Late Policy'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-sub)', lineHeight: 1.45 }}>
                    {isEligible
                      ? `According to the Dorset Cricket Centre policy, cancellations made with over 24 hours notice receive a 100% payment reversal of £${amt.toFixed(2)}.`
                      : `Cancellations within 24 hours notice are subject to centre review. Standard refund: £0.00 (You may request manager credit below).`
                    }
                  </div>
                </div>
              );
            })()}

            <form onSubmit={processCancellationSubmit}>
              <div className="input-group">
                <label className="input-label">Reason for cancellation</label>
                <div className="input-wrap">
                  <select value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                    <option value="Schedule conflict">Schedule conflict</option>
                    <option value="Weather / Rain">Weather / Travel delay</option>
                    <option value="Illness or injury">Illness or injury</option>
                    <option value="Team match reschedule">Team match reschedule</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Additional details (Optional)</label>
                <div className="input-wrap">
                  <input value={cancelNotes} onChange={e => setCancelNotes(e.target.value)} placeholder="Provide any notes for centre staff" />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Refund Reversal Destination</label>
                <div className="input-wrap">
                  <RefreshCw size={15} color="var(--c-text-mute)" />
                  <select value={refundMethod} onChange={e => setRefundMethod(e.target.value)}>
                    <option value="original_card">Reverse to Original Payment Card (Stripe)</option>
                    <option value="account_credit">Store Credit for Future Net Bookings</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setCancelTarget(null)} disabled={cancelBusy}>Keep Booking</button>
                <button id="demo-cancel-modal-submit-btn" type="submit" className="btn btn-danger" style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'center' }} disabled={cancelBusy}>
                  {cancelBusy ? 'Processing Reversal…' : 'Confirm & Reverse Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
