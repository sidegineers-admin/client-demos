import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, CalendarDays, ArrowRight } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';

function toDateKey(d) { return d.toISOString().slice(0, 10); }

export default function RecurringPage() {
  const { bookings, myIds } = useApp();
  const navigate = useNavigate();

  // Find my recurring series
  const myBookings = bookings.filter(b => myIds.includes(b.id) && b.recurringId);
  const seriesMap = {};
  myBookings.forEach(b => {
    if (!seriesMap[b.recurringId]) seriesMap[b.recurringId] = [];
    seriesMap[b.recurringId].push(b);
  });
  const seriesList = Object.entries(seriesMap).map(([id, items]) => ({
    id,
    items: items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
  }));

  const today = toDateKey(new Date());

  return (
    <div className="recurring-page">
      <div style={{ marginBottom: 28 }}>
        <h1 className="display" style={{ fontSize: 32, marginBottom: 6 }}>Recurring Bookings</h1>
        <p style={{ color: 'var(--c-text-mute)', fontSize: 13 }}>Your standing lane reservations — automatically renewed each week or fortnight.</p>
      </div>

      {seriesList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--c-text-mute)' }}>
          <RotateCcw size={40} style={{ opacity: 0.25, marginBottom: 14 }} />
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--c-text-sub)', marginBottom: 6 }}>No standing bookings</div>
          <div style={{ fontSize: 13, marginBottom: 24 }}>When you book a slot, toggle "Make this recurring" at checkout to set up a standing reservation.</div>
          <button className="btn btn-primary" onClick={() => navigate('/app/book')}>
            <CalendarDays size={14} /> Book a slot
          </button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--c-text-mute)', marginBottom: 20 }}>
            You have <b style={{ color: 'var(--c-text)' }}>{seriesList.length}</b> active standing booking{seriesList.length > 1 ? 's' : ''}.
          </div>
          {seriesList.map(({ id, items }) => {
            const upcoming = items.filter(b => b.date >= today);
            const past = items.filter(b => b.date < today);
            const base = items[0];
            return (
              <div key={id} className="card" style={{ marginBottom: 20, borderColor: 'rgba(255,210,63,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <RotateCcw size={15} style={{ color: 'var(--c-gold)' }} />
                      <span className="display" style={{ fontSize: 20 }}>{base.sportName} — {base.unit}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--c-text-mute)' }}>
                      Every week at <b className="mono text-gold">{base.time}</b> · {items.length} total sessions
                    </div>
                  </div>
                  <span className="badge badge-gold">Active</span>
                </div>

                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--c-text-mute)', marginBottom: 8 }}>
                  Upcoming ({upcoming.length})
                </div>
                <div className="recur-preview" style={{ marginBottom: 14 }}>
                  {upcoming.length === 0 && (
                    <div className="recur-row" style={{ color: 'var(--c-text-faint)' }}>No upcoming sessions in this series.</div>
                  )}
                  {upcoming.slice(0, 8).map(b => (
                    <div className="recur-row" key={b.id}>
                      <span className="date">{b.date}</span>
                      <span style={{ fontSize: 12, color: 'var(--c-text-mute)' }}>{b.time} · {b.unit}</span>
                      <span className="badge badge-green" style={{ fontSize: 10 }}>Confirmed</span>
                    </div>
                  ))}
                  {upcoming.length > 8 && (
                    <div className="recur-row" style={{ color: 'var(--c-text-faint)', fontSize: 12 }}>+{upcoming.length - 8} more…</div>
                  )}
                </div>

                {past.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--c-text-faint)' }}>{past.length} past session{past.length > 1 ? 's' : ''} in this series.</div>
                )}

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--c-border)', display: 'flex', gap: 10 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/app/my-bookings')}>
                    Manage in My Bookings <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* How it works */}
      <div className="card" style={{ marginTop: 28, background: 'rgba(82,183,136,0.04)', borderColor: 'rgba(82,183,136,0.2)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 12 }}>How recurring bookings work</div>
        {[
          ['Set it up at checkout', 'When paying for any slot, toggle "Make this a standing booking" to schedule weekly or fortnightly repeats.'],
          ['Automatic renewal', 'Your lane is pre-reserved at the same time each interval. You\'ll get a notification when each session is confirmed.'],
          ['Cancel any time', 'Cancel individual sessions or the entire series from My Bookings — no fees, no fuss.'],
        ].map(([title, desc]) => (
          <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-green)', marginTop: 6, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', marginBottom: 3 }}>{title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-mute)' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
