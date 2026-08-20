import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, CalendarOff, Ban, SlidersHorizontal, LayoutGrid, ListFilter, Clock, Check, Zap, Filter, RotateCcw } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { useDemo } from '../../store/DemoContext.jsx';
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
  const { session, bookings, setBookings, closedDates, setClosedDates, myIds, settings, showToast, SPORTS, TIMES } = useApp();
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

  // Mobile UX view state
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? 'list' : 'grid'); // 'list' | 'grid'
  const [filterLane, setFilterLane] = useState('ALL'); // 'ALL' | specific lane
  const [filterTimeOfDay, setFilterTimeOfDay] = useState('ALL'); // 'ALL' | 'morning' | 'afternoon' | 'evening'

  // Range block modal state
  const [rangeModal, setRangeModal] = useState(false);
  const [rangeLane, setRangeLane]   = useState('Lane 1');
  const [rangeFrom, setRangeFrom]   = useState(toDateKey(new Date()));
  const [rangeTo, setRangeTo]       = useState(toDateKey(new Date()));
  const [rangeReason, setRangeReason] = useState('');
  const [rangeBusy, setRangeBusy]   = useState(false);

  const { demoPreselectSlot, demoSetRecurring, demoOpenRangeModal } = useDemo() || {};

  React.useEffect(() => {
    if (demoPreselectSlot) {
      setSelection([{ key: 'Lane 1|11:00', unit: 'Lane 1', time: '11:00' }]);
    }
  }, [demoPreselectSlot]);

  React.useEffect(() => {
    if (demoSetRecurring) {
      setRecurring(true);
    }
  }, [demoSetRecurring]);

  React.useEffect(() => {
    if (demoOpenRangeModal) {
      setRangeModal(true);
    }
  }, [demoOpenRangeModal]);

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

  // Recurring standing order state on booking board
  const [recurring, setRecurring]   = useState(false);
  const [recurFreq, setRecurFreq]   = useState('weekly');
  const [recurWeeks, setRecurWeeks] = useState(8);

  const totalPrice = selection.length * getSlotPrice();

  function goToCheckout() {
    if (!selection.length) return;
    const finalTotal = totalPrice * (recurring ? recurWeeks : 1);
    sessionStorage.setItem('dcc_pending', JSON.stringify({
      selection,
      dateKey,
      sportId: sport.id,
      sportName: sport.name,
      totalPrice: finalTotal,
      recurring,
      recurFreq,
      recurWeeks,
    }));
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
    } catch {
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

  // Filter slots for Mobile Slot Cards View
  const listSlots = useMemo(() => {
    const list = [];
    const unitsToInclude = filterLane === 'ALL' ? sport.units : [filterLane];
    
    unitsToInclude.forEach(unit => {
      TIMES.forEach(t => {
        const h = parseInt(t.split(':')[0], 10);
        if (filterTimeOfDay === 'morning' && (h < 7 || h >= 12)) return;
        if (filterTimeOfDay === 'afternoon' && (h < 12 || h >= 17)) return;
        if (filterTimeOfDay === 'evening' && h < 17) return;

        const existing = isBooked(unit, t);
        const past = isPastSlot(dateKey, t, todayKey, nowHour);
        const selected = selection.some(s => s.unit === unit && s.time === t);
        const isMine = existing && myIds.includes(existing.id);

        list.push({
          unit,
          time: t,
          existing,
          past,
          selected,
          isMine,
        });
      });
    });

    // Sort by time, then by unit
    return list.sort((a, b) => a.time.localeCompare(b.time) || a.unit.localeCompare(b.unit));
  }, [filterLane, filterTimeOfDay, dateKey, bookings, selection, myIds]);

  return (
    <>
      {/* Top Controls & View Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 8px', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="display" style={{ fontSize: 28, lineHeight: 1 }}>Book Net Lane</h1>
          <div style={{ fontSize: 12, color: 'var(--c-text-mute)', marginTop: 4 }}>
            Dorset Cricket Centre · {dateKey}
          </div>
        </div>

        {/* Desktop vs Mobile View Switcher */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(247,245,240,0.06)', padding: 3, borderRadius: 8, border: '1px solid var(--c-border)' }}>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 10px', fontSize: 12 }}
            onClick={() => setViewMode('list')}
          >
            <ListFilter size={14} /> Mobile List View
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '5px 10px', fontSize: 12 }}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={14} /> Full Grid Matrix
          </button>
        </div>
      </div>

      {/* Date Strip */}
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

      {/* Closed banner */}
      {closureToday && (
        <div className="closed-banner">
          <div className="closed-banner-text">All lanes closed — <b>{closureToday.reason}</b></div>
          {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => reopenDate(closureToday.id)}>Reopen lanes</button>}
        </div>
      )}

      {/* Admin actions */}
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '0 20px 12px', flexWrap: 'wrap' }}>
          <button id="demo-block-range-btn" className="btn btn-ghost btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setRangeModal(true)}>
            <SlidersHorizontal size={14} /> Block Lane / Date Range
          </button>
          {!closureToday && (
            <button className="btn btn-danger btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setCloseModal(true)}>
              <CalendarOff size={14} /> Close all lanes for this date
            </button>
          )}
        </div>
      )}

      {/* Pricing Note */}
      <div style={{ padding: '0 20px 10px', fontSize: 12, color: 'var(--c-text-mute)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {session?.ecbCoach
          ? <span id="demo-ecb-badge" className="text-green">✓ ECB Coach: £{getSlotPrice().toFixed(2)} per slot ({settings.ecbDiscount || 50}% discount applied)</span>
          : <span>Rate: <b className="text-gold">£{getSlotPrice().toFixed(2)}</b> per slot · {settings.memberDiscount > 0 ? `${settings.memberDiscount}% member discount applied` : 'Standard rate'}</span>
        }
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MOBILE LIST VIEW (Tap-Friendly Cards)                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div style={{ padding: '0 20px 120px' }}>
          {/* Mobile Lane Filter Tabs */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
            <button
              onClick={() => setFilterLane('ALL')}
              className={`btn btn-sm ${filterLane === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 20, padding: '5px 14px', fontSize: 12.5 }}
            >
              All Units (6)
            </button>
            {sport.units.map(u => (
              <button
                key={u}
                onClick={() => setFilterLane(u)}
                className={`btn btn-sm ${filterLane === u ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 20, padding: '5px 14px', fontSize: 12.5, whitespace: 'nowrap' }}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Time of Day Filter Pills */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Hours (7am-9pm)' },
              { id: 'morning', label: '🌅 Morning (7am-12pm)' },
              { id: 'afternoon', label: '☀️ Afternoon (12pm-5pm)' },
              { id: 'evening', label: '🌙 Evening (5pm-9pm)' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterTimeOfDay(t.id)}
                style={{
                  background: filterTimeOfDay === t.id ? 'rgba(255,210,63,0.15)' : 'rgba(247,245,240,0.04)',
                  color: filterTimeOfDay === t.id ? 'var(--c-gold)' : 'var(--c-text-mute)',
                  border: '1px solid ' + (filterTimeOfDay === t.id ? 'rgba(255,210,63,0.4)' : 'var(--c-border)'),
                  fontSize: 12, padding: '4px 10px', borderRadius: 6, cursor: 'pointer'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Slot Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
            {listSlots.map(s => {
              const endTime = `${String(parseInt(s.time) + 1).padStart(2, '0')}:00`;
              
              let bg = 'var(--c-bg-card)';
              let border = '1px solid var(--c-border-hi)';
              let statusText = 'Available';
              let statusColor = 'var(--c-green)';
              let disabled = false;

              if (closureToday) {
                bg = 'rgba(226,74,74,0.05)'; border = '1px solid rgba(226,74,74,0.3)';
                statusText = 'Closed'; statusColor = 'var(--c-red)'; disabled = true;
              } else if (s.past) {
                bg = 'rgba(247,245,240,0.02)'; border = '1px solid rgba(247,245,240,0.05)';
                statusText = 'Past'; statusColor = 'var(--c-text-faint)'; disabled = true;
              } else if (s.existing && s.existing.type === 'blocked') {
                bg = 'rgba(226,74,74,0.08)'; border = '1px solid rgba(226,74,74,0.4)';
                statusText = 'Staff Hold'; statusColor = 'var(--c-red)';
              } else if (s.existing && s.isMine) {
                bg = 'rgba(82,183,136,0.12)'; border = '1.5px solid var(--c-green)';
                statusText = 'My Booking'; statusColor = 'var(--c-green)';
              } else if (s.existing) {
                bg = 'rgba(244,163,0,0.08)'; border = '1px solid rgba(244,163,0,0.3)';
                statusText = 'Booked'; statusColor = 'var(--c-amber)';
              } else if (s.selected) {
                bg = 'rgba(255,210,63,0.18)'; border = '2px solid var(--c-gold)';
                statusText = 'Selected ✓'; statusColor = 'var(--c-gold)';
              }

              return (
                <div
                  key={`${s.unit}-${s.time}`}
                  id={s.unit === 'Lane 1' && s.time === '11:00' ? 'demo-slot-lane1-11' : undefined}
                  onClick={() => toggleCell(s.unit, s.time)}
                  style={{
                    background: bg,
                    border,
                    borderRadius: 10,
                    padding: '12px 14px',
                    cursor: disabled && !isAdmin ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.45 : 1,
                    transition: 'all 120ms ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    minHeight: 84,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>
                      {s.time} <span style={{ fontSize: 11, color: 'var(--c-text-faint)', fontWeight: 400 }}>- {endTime}</span>
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: statusColor }}>
                      {statusText}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-sub)' }}>
                      {s.unit}
                    </span>
                    {!s.existing && !s.past && !closureToday && (
                      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-gold)' }}>
                        £{getSlotPrice().toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {listSlots.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--c-text-mute)' }}>
              No slots match your selected filters.
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* FULL MATRIX GRID VIEW (Desktop / Macro View)                */}
      {/* ──────────────────────────────────────────────────────────── */}
      {viewMode === 'grid' && (
        <>
          <div className="board-legend" style={{ padding: '8px 20px 12px' }}>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#52B788' }} />Available</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#FFD23F' }} />Selected</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#F4A300' }} />Booked</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#E24B4A' }} />Staff hold</span>
            <span className="legend-item"><span className="legend-dot" style={{ background: '#52B788', opacity: 0.5, boxShadow: '0 0 0 1.5px #52B788' }} />My booking</span>
          </div>

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
                        <div key={t} id={unit === 'Lane 1' && t === '11:00' ? 'demo-slot-lane1-11' : undefined} className={cls} onClick={() => toggleCell(unit, t)} title={existing ? `${existing.name}${existing.type === 'blocked' ? ' (Staff hold)' : ''}` : ''}>
                          <span className="dot" />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cart bar */}
      {selection.length > 0 && (
        <div className="cart-bar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: '14px 20px' }}>
          {/* Top row: selection info & price */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="cart-info">
                <b>{selection.length}</b> slot{selection.length > 1 ? 's' : ''} selected · {sport.name} · {dateKey}
                {recurring && <span className="badge badge-gold" style={{ marginLeft: 8 }}>↻ {recurFreq} ({recurWeeks} wks)</span>}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--c-text-faint)', marginTop: 2 }}>
                {selection.map(s => `${s.unit} ${s.time}`).join(' · ')}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="cart-price">£{(totalPrice * (recurring ? recurWeeks : 1)).toFixed(2)}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-mute)' }}>{recurring ? `total (${recurWeeks} sessions)` : 'total'}</div>
              </div>
              <div className="cart-actions">
                <button className="btn btn-ghost" onClick={() => setSelection([])}>Clear</button>
                <button id="demo-cart-pay-btn" className="btn btn-primary" onClick={goToCheckout}>Review & Pay →</button>
              </div>
            </div>
          </div>

          {/* Bottom row: Recurring / Standing Order Toggle */}
          <div style={{ background: 'rgba(255,210,63,0.06)', border: '1px solid rgba(255,210,63,0.25)', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: 'var(--c-gold)', cursor: 'pointer' }}>
              <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
              <RotateCcw size={14} /> Make this a standing / recurring order
            </label>

            {recurring && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--c-text-mute)' }}>Frequency:</span>
                  <select value={recurFreq} onChange={e => setRecurFreq(e.target.value)} style={{ background: 'var(--c-bg-card)', color: 'var(--c-gold)', border: '1px solid var(--c-border)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: 'var(--c-text-mute)' }}>Duration:</span>
                  <select value={recurWeeks} onChange={e => setRecurWeeks(Number(e.target.value))} style={{ background: 'var(--c-bg-card)', color: 'var(--c-gold)', border: '1px solid var(--c-border)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>
                    <option value={4}>4 Weeks</option>
                    <option value={8}>8 Weeks</option>
                    <option value={12}>12 Weeks</option>
                  </select>
                </div>
              </div>
            )}
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
              <button id="demo-range-submit-btn" className="btn btn-primary" style={{ flex: 1 }} onClick={applyRangeBlock} disabled={rangeBusy}>
                {rangeBusy ? 'Applying…' : 'Apply Hold Range'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
