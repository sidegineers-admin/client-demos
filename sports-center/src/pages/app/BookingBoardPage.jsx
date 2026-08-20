import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, X, Loader2, ShieldCheck, CalendarOff, Ban, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { storage, uid } from '../../store/storage.js';

function toDateKey(d) { return d.toISOString().slice(0, 10); }
function startOfToday() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function makeDates(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d;
  });
}
function parseDateKey(key) {
  const [y,m,d] = key.split('-').map(Number);
  const dt = new Date(); dt.setFullYear(y, m-1, d); dt.setHours(0,0,0,0); return dt;
}
function dowLabel(d) { return d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(); }
function isPastSlot(dateKey, time, todayKey, nowHour) {
  if (dateKey < todayKey) return true;
  if (dateKey > todayKey) return false;
  return parseInt(time.split(':')[0], 10) <= nowHour;
}

export default function BookingBoardPage() {
  const { session, bookings, setBookings, closedDates, setClosedDates, myIds, setMyIds, settings, showToast, SPORTS, TIMES } = useApp();
  const navigate = useNavigate();

  const [windowStart, setWindowStart] = useState(startOfToday);
  const dates = useMemo(() => makeDates(windowStart), [windowStart]);
  const [selectedDate, setSelectedDate] = useState(startOfToday);
  const dateInputRef = useRef(null);
  const [selection, setSelection] = useState([]);
  const [manageSlot, setManageSlot] = useState(null);
  const [closeModal, setCloseModal] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [closeBusy, setCloseBusy] = useState(false);

  // Range block modal state
  const [rangeModal, setRangeModal] = useState(false);
  const [rangeLane, setRangeLane]   = useState('Lane 1');
  const [rangeFrom, setRangeFrom]   = useState(toDateKey(new Date()));
  const [rangeTo, setRangeTo]       = useState(toDateKey(new Date()));
  const [rangeReason, setRangeReason] = useState('');
  const [rangeBusy, setRangeBusy]   = useState(false);

  const sport = SPORTS[0];
  const dateKey = toDateKey(selectedDate);
  const todayKey = toDateKey(new Date());
  const nowHour = new Date().getHours();
  const closureToday = closedDates.find(c => c.date === dateKey);
  const isAdmin = session?.role === 'admin';

  function shiftWindow(days) {
    setWindowStart(prev => {
      const next = new Date(prev); next.setDate(next.getDate() + days);
      return next < startOfToday() ? startOfToday() : next;
    });
  }

  function onPickCalendarDate(e) {
    if (!e.target.value) return;
    const d = parseDateKey(e.target.value);
    setSelectedDate(d); setWindowStart(d);
  }

  function isBooked(unit, time) {
    return bookings.find(b => b.sportId === sport.id && b.date === dateKey && b.unit === unit && b.time === time);
  }

  function toggleCell(unit, time) {
    if (isPastSlot(dateKey, time, todayKey, nowHour) || closureToday) return;
    const existing = isBooked(unit, time);
    if (isAdmin && existing) { setManageSlot(existing); return; }
    if (!isAdmin && existing) return;
    const key = `${unit}|${time}`;
    setSelection(prev => {
      const exists = prev.find(s => s.key === key);
      return exists ? prev.filter(s => s.key !== key) : [...prev, { key, unit, time }];
    });
  }

  function getSlotPrice() {
    let price = settings.pricePerHour || 12;
    if (session?.ecbCoach) {
      const ecbDisc = settings.ecbDiscount !== undefined ? settings.ecbDiscount : 50;
      return price * (1 - ecbDisc / 100);
    }
    if (session?.role !== 'admin') {
      price = price * (1 - (settings.memberDiscount || 0) / 100);
    }
    return price;
  }

  const totalPrice = selection.length * getSlotPrice();

  function goToCheckout() {
    if (!selection.length) return;
    sessionStorage.setItem('dcc_pending', JSON.stringify({ selection, dateKey, sportId: sport.id, sportName: sport.name, totalPrice }));
    navigate('/app/checkout');
  }

  async function adminRemoveSlot(id) {
    try {
      const latest = await storage.get('bookings');
      const current = latest?.value ? JSON.parse(latest.value) : [];
      const filtered = current.filter(b => b.id !== id);
      await storage.set('bookings', JSON.stringify(filtered));
      setBookings(filtered);
      setManageSlot(null);
      showToast('Slot freed.');
    } catch { showToast('Could not update.', 'error'); }
  }

  async function closeLanesForDate() {
    setCloseBusy(true);
    try {
      const latest = await storage.get('closed-dates');
      const current = latest?.value ? JSON.parse(latest.value) : [];
      const entry = { id: uid(), date: dateKey, reason: closeReason.trim() || 'Reserved for a match', createdAt: Date.now() };
      const merged = [...current, entry];
      await storage.set('closed-dates', JSON.stringify(merged));
      setClosedDates(merged);
      setCloseModal(false); setCloseReason('');
      showToast('All lanes closed for that date.');
    } catch { showToast('Could not close lanes.', 'error'); }
    setCloseBusy(false);
  }

  async function applyRangeBlock() {
    if (!rangeFrom || !rangeTo) { showToast('Select valid start and end dates.', 'error'); return; }
    if (rangeFrom > rangeTo) { showToast('Start date cannot be after end date.', 'error'); return; }
    setRangeBusy(true);
    try {
      const latest = await storage.get('bookings');
      const current = latest?.value ? JSON.parse(latest.value) : [];

      const start = new Date(rangeFrom);
      const end   = new Date(rangeTo);
      const targetLanes = rangeLane === 'ALL' ? sport.units : [rangeLane];

      const newBlocks = [];
      const currDate = new Date(start);
      while (currDate <= end) {
        const dk = currDate.toISOString().slice(0, 10);
        for (const lane of targetLanes) {
          for (const t of TIMES) {
            // only add if not already booked
            const exists = current.some(b => b.date === dk && b.unit === lane && b.time === t);
            if (!exists) {
              newBlocks.push({
                id: uid(),
                sportId: sport.id,
                sportName: sport.name,
                unit: lane,
                date: dk,
                time: t,
                name: `Held: ${rangeReason.trim() || 'Staff Hold'}`,
                contact: '',
                type: 'blocked',
                createdByRole: 'admin',
                createdAt: Date.now(),
              });
            }
          }
        }
        currDate.setDate(currDate.getDate() + 1);
      }

      const merged = [...current, ...newBlocks];
      await storage.set('bookings', JSON.stringify(merged));
      setBookings(merged);
      setRangeModal(false);
      showToast(`Blocked ${newBlocks.length} slot(s) across date range.`);
    } catch (e) {
      showToast('Could not apply lane blocks.', 'error');
    }
    setRangeBusy(false);
  }

  async function reopenDate(id) {
    try {
      const latest = await storage.get('closed-dates');
      const current = latest?.value ? JSON.parse(latest.value) : [];
      const filtered = current.filter(c => c.id !== id);
      await storage.set('closed-dates', JSON.stringify(filtered));
      setClosedDates(filtered);
      showToast('Lanes reopened.');
    } catch { showToast('Could not reopen.', 'error'); }
  }

  return (
    <>
      {/* Date strip */}
      <div className="date-strip">
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => shiftWindow(-7)} aria-label="Previous week"><ChevronLeft size={16} /></button>
        {dates.map((d, i) => {
          const dk = toDateKey(d);
          const closed = closedDates.some(c => c.date === dk);
          return (
            <div key={i} className={`date-btn ${dk === dateKey ? 'active' : ''} ${closed ? 'closed' : ''}`} onClick={() => setSelectedDate(d)}>
              <span className="dow">{dk === todayKey ? 'Today' : dowLabel(d)}</span>
              <span className="dnum">{String(d.getDate()).padStart(2, '0')}</span>
            </div>
          );
        })}
        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => shiftWindow(7)} aria-label="Next week"><ChevronRight size={16} /></button>
        <button className="btn btn-ghost btn-sm" style={{ gap: 6, display: 'flex', alignItems: 'center' }}
          onClick={() => dateInputRef.current && (dateInputRef.current.showPicker ? dateInputRef.current.showPicker() : dateInputRef.current.click())}>
          <Calendar size={14} /> Pick date
        </button>
        <input ref={dateInputRef} type="date" value={dateKey} min={todayKey} onChange={onPickCalendarDate}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} aria-hidden tabIndex={-1} />
      </div>

      <p style={{ margin: '-4px 24px 12px', fontSize: 12, color: 'var(--c-text-mute)' }}>
        Booking for <b className="mono text-gold">{dateKey}</b>
        {session.ecbCoach && <span className="badge badge-green" style={{ marginLeft: 10 }}>ECB Coach ({settings.ecbDiscount || 50}% discount)</span>}
      </p>

      {/* Closed banner */}
      {closureToday && (
        <div className="closed-banner">
          <div className="closed-banner-text">All lanes closed — <b>{closureToday.reason}</b></div>
          {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => reopenDate(closureToday.id)}>Reopen lanes</button>}
        </div>
      )}

      {/* Admin close & range block buttons */}
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 20px 12px', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setRangeModal(true)}>
            <SlidersHorizontal size={14} /> Block Lane / Date Range
          </button>
          {!closureToday && (
            <button className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setCloseModal(true)}>
              <CalendarOff size={14} /> Close all lanes for this date
            </button>
          )}
        </div>
      )}

      {/* Pricing note */}
      <div style={{ padding: '0 20px 8px', fontSize: 12, color: 'var(--c-text-mute)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {session.ecbCoach
          ? <span className="text-green">✓ ECB Coach: £{getSlotPrice().toFixed(2)} per slot ({settings.ecbDiscount || 50}% discount applied)</span>
          : <span>£{getSlotPrice().toFixed(2)} per slot · {settings.memberDiscount > 0 ? `${settings.memberDiscount}% member discount applied` : 'No membership discount'}</span>
        }
      </div>

      {/* Legend */}
      <div className="board-legend" style={{ padding: '8px 20px 12px' }}>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#52B788' }} />Available</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#FFD23F' }} />Selected</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#F4A300' }} />Booked</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#E24B4A' }} />Staff hold</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#52B788', opacity: 0.5, boxShadow: '0 0 0 1.5px #52B788' }} />My booking</span>
      </div>

      {/* Grid */}
      <div className="board-wrap">
        <div className="board-scroll">
          <div className="booking-grid" style={{ '--cols': TIMES.length }}>
            <div className="grid-header">
              <div className="grid-corner grid-th">{sport.unitLabel}</div>
              {TIMES.map(t => <div key={t} className="grid-th mono">{t}</div>)}
            </div>
            {sport.units.map(unit => (
              <div className="grid-row" key={unit}>
                <div className="grid-lane">{unit}</div>
                {TIMES.map(t => {
                  const existing = isBooked(unit, t);
                  const past = isPastSlot(dateKey, t, todayKey, nowHour);
                  const selected = selection.some(s => s.unit === unit && s.time === t);
                  const isMyBooking = existing && myIds.includes(existing.id);
                  let cls = 'grid-cell';
                  if (closureToday) cls += ' closed';
                  else if (past) cls += ' past';
                  else if (existing && existing.type === 'blocked') cls += ' blocked';
                  else if (existing && isMyBooking) cls += ' mine';
                  else if (existing) cls += ' booked';
                  else if (selected) cls += ' selected';
                  else cls += ' available';
                  return (
                    <div key={t} className={cls} onClick={() => toggleCell(unit, t)} title={existing ? `${existing.name}${existing.type === 'blocked' ? ' (Staff hold)' : ''}` : ''}>
                      <span className="dot" />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart bar */}
      {selection.length > 0 && (
        <div className="cart-bar">
          <div>
            <div className="cart-info"><b>{selection.length}</b> slot{selection.length > 1 ? 's' : ''} selected · {sport.name} · {dateKey}</div>
            <div style={{ fontSize: 11.5, color: 'var(--c-text-faint)', marginTop: 2 }}>
              {selection.map(s => `${s.unit} ${s.time}`).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <div className="cart-price">£{totalPrice.toFixed(2)}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-mute)' }}>total</div>
            </div>
            <div className="cart-actions">
              <button className="btn btn-ghost" onClick={() => setSelection([])}>Clear</button>
              <button className="btn btn-primary" onClick={goToCheckout}>Review & Pay →</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage slot modal (admin) */}
      {manageSlot && (
        <div className="modal-backdrop" onClick={() => setManageSlot(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{manageSlot.type === 'blocked' ? 'Staff Hold' : 'Existing Booking'}</div>
            <div className="modal-sub">{manageSlot.unit} · {manageSlot.date} · {manageSlot.time}</div>
            <div className="order-summary">
              <div className="order-line"><span className="lbl">Name</span><span>{manageSlot.name}</span></div>
              {manageSlot.contact && <div className="order-line"><span className="lbl">Contact</span><span>{manageSlot.contact}</span></div>}
              <div className="order-line"><span className="lbl">Type</span><span className={`badge ${manageSlot.type === 'blocked' ? 'badge-red' : 'badge-green'}`}>{manageSlot.type}</span></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setManageSlot(null)}>Close</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => adminRemoveSlot(manageSlot.id)}>
                {manageSlot.type === 'blocked' ? 'Remove hold' : 'Cancel booking'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close lanes modal (single date full closure) */}
      {closeModal && (
        <div className="modal-backdrop" onClick={() => !closeBusy && setCloseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Close All Lanes for Date</div>
            <div className="modal-sub">Closes every net lane on <b style={{ color: 'var(--c-text)' }}>{dateKey}</b> — for a match, event or maintenance.</div>
            <div className="input-group">
              <label className="input-label">Reason for closure</label>
              <div className="input-wrap">
                <Ban size={15} color="var(--c-text-mute)" />
                <input value={closeReason} onChange={e => setCloseReason(e.target.value)} placeholder="e.g. Dorset League Match vs Parley CC" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setCloseModal(false)} disabled={closeBusy}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={closeLanesForDate} disabled={closeBusy}>
                {closeBusy ? 'Closing…' : 'Close all lanes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Range block modal (specific lane across date range) */}
      {rangeModal && (
        <div className="modal-backdrop" onClick={() => !rangeBusy && setRangeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Block Lane / Date Range</div>
            <div className="modal-sub">Reserve specific lanes across a period of time for training, maintenance, or academy.</div>
            
            <div className="input-group">
              <label className="input-label">Select Lane</label>
              <div className="input-wrap">
                <select value={rangeLane} onChange={e => setRangeLane(e.target.value)}>
                  <option value="ALL">All Lanes (1-5 + Bowling Machine)</option>
                  {sport.units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">From Date</label>
                <div className="input-wrap">
                  <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">To Date</label>
                <div className="input-wrap">
                  <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Reason / Event Name</label>
              <div className="input-wrap">
                <Ban size={15} color="var(--c-text-mute)" />
                <input value={rangeReason} onChange={e => setRangeReason(e.target.value)} placeholder="e.g. Pitch Repair / ECB Junior Training" />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setRangeModal(false)} disabled={rangeBusy}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={applyRangeBlock} disabled={rangeBusy}>
                {rangeBusy ? 'Applying…' : 'Apply Hold Range'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
