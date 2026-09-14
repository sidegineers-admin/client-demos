import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, 
  Filter, ShieldCheck, User, Wrench, Check, X, Download, AlertCircle,
  Eye, CheckCircle2, Building2, Sparkles, Layers, MapPin
} from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';
import { useDemo } from '../../store/DemoContext.jsx';
import Modal from '../../components/ui/Modal.jsx';
import AdminDirectBookingModal from '../../components/modals/AdminDirectBookingModal.jsx';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 to 22:00

const STATUS_CONFIG = {
  confirmed:        { label: 'Confirmed', badge: 'badge-emerald', color: 'var(--sf-emerald)', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' },
  pending_approval: { label: 'Pending Approval', badge: 'badge-amber', color: 'var(--sf-amber)', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.5)' },
  held:             { label: 'On Hold', badge: 'badge-cyan', color: 'var(--sf-cyan)', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.4)' },
  cancelled:        { label: 'Cancelled', badge: 'badge-gray', color: 'var(--sf-text-mute)', bg: 'rgba(71,85,105,0.15)', border: 'rgba(71,85,105,0.3)' },
  maintenance:      { label: 'Maintenance Block', badge: 'badge-gray', color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)' },
};

function toDateKey(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateKey(dk) {
  const [y, m, d] = dk.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function AdminCalendarPage() {
  const { facilities, bookings, getBufferRules, approveBooking, rejectBooking, cancelBooking, updateBooking, showToast, session } = useApp();
  const { demoTriggers, setDemoTriggers } = useDemo();

  // Calendar State
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedFacilityId, setSelectedFacilityId] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMonthDate, setSelectedMonthDate] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    setSelectedMonthDate(toDateKey(currentDate));
  }, [currentDate]);

  // Direct Booking Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [modalSlotParams, setModalSlotParams] = useState({ facilityId: '', date: '', startHour: 10 });

  useEffect(() => {
    if (demoTriggers?.switchView) {
      setViewMode(demoTriggers.switchView);
      setDemoTriggers(t => ({ ...t, switchView: null }));
    }
    if (demoTriggers?.openDirectBooking) {
      setBookingModalOpen(true);
      setDemoTriggers(t => ({ ...t, openDirectBooking: null }));
    }
  }, [demoTriggers]);

  // Detail Modal for Inspection
  const [inspectBooking, setInspectBooking] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [holdModalOpen, setHoldModalOpen] = useState(false);

  const currentDateKey = toDateKey(currentDate);

  // Date Navigation Helpers
  function handlePrev() {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (viewMode === 'day') next.setDate(next.getDate() - 1);
      else if (viewMode === 'week') next.setDate(next.getDate() - 7);
      else if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
      return next;
    });
  }

  function handleNext() {
    setCurrentDate(prev => {
      const next = new Date(prev);
      if (viewMode === 'day') next.setDate(next.getDate() + 1);
      else if (viewMode === 'week') next.setDate(next.getDate() + 7);
      else if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
      return next;
    });
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  // Unique locations list
  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(facilities.map(f => f.locationName).filter(Boolean)));
  }, [facilities]);

  // Filter facilities
  const displayedFacilities = useMemo(() => {
    return facilities.filter(f => {
      if (selectedLocation !== 'all' && f.locationName !== selectedLocation && f.city !== selectedLocation) return false;
      if (selectedFacilityId !== 'all' && f.id !== selectedFacilityId) return false;
      return true;
    });
  }, [facilities, selectedLocation, selectedFacilityId]);

  // Filter bookings
  const relevantBookings = useMemo(() => {
    return bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      const fac = facilities.find(f => f.id === b.facilityId);
      if (selectedLocation !== 'all' && fac && fac.locationName !== selectedLocation && fac.city !== selectedLocation) return false;
      if (selectedFacilityId !== 'all' && b.facilityId !== selectedFacilityId) return false;
      if (filterStatus === 'pending' && b.status !== 'pending_approval') return false;
      if (filterStatus === 'confirmed' && b.status !== 'confirmed') return false;
      if (filterStatus === 'maintenance' && !b.isMaintenance) return false;
      return true;
    });
  }, [bookings, facilities, selectedLocation, selectedFacilityId, filterStatus]);

  // Open Direct Booking Modal with slot prefill
  function handleSlotClick(facId, dateStr, hour) {
    setModalSlotParams({
      facilityId: facId,
      date: dateStr,
      startHour: hour
    });
    setBookingModalOpen(true);
  }

  // Header Title Formatter
  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const dayIndex = (startOfWeek.getDay() + 6) % 7; // Monday = 0
      startOfWeek.setDate(startOfWeek.getDate() - dayIndex);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return `${startOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${endOfWeek.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }, [currentDate, viewMode]);

  /* ── Week Days Generator ── */
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    const dayIndex = (startOfWeek.getDay() + 6) % 7;
    startOfWeek.setDate(startOfWeek.getDate() - dayIndex);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push({
        date: d,
        dateKey: toDateKey(d),
        dayName: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: toDateKey(d) === toDateKey(new Date())
      });
    }
    return days;
  }, [currentDate]);

  /* ── Month Grid Generator ── */
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayIndex = (firstDay.getDay() + 6) % 7; // Mon = 0
    const totalDays = lastDay.getDate();

    const cells = [];
    // Prev month padding
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, dateKey: toDateKey(d), currentMonth: false, dayNum: d.getDate() });
    }
    // Current month
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      cells.push({
        date: d,
        dateKey: toDateKey(d),
        currentMonth: true,
        dayNum: i,
        isToday: toDateKey(d) === toDateKey(new Date())
      });
    }
    // Next month padding to fill complete weeks (35 or 42 cells)
    const remaining = 35 - cells.length > 0 ? 35 - cells.length : 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({ date: d, dateKey: toDateKey(d), currentMonth: false, dayNum: d.getDate() });
    }
    return cells;
  }, [currentDate]);

  // Actions on inspected booking
  async function handleApprove(bId) {
    await approveBooking(bId);
    showToast('✅ Booking approved & confirmation dispatched', 'ok');
    setInspectBooking(null);
  }

  async function handleRejectConfirm() {
    if (!inspectBooking) return;
    await rejectBooking(inspectBooking.id);
    showToast('Booking rejected', 'warn');
    setRejectModalOpen(false);
    setInspectBooking(null);
  }

  async function handleReleaseHold(b) {
    await updateBooking(b.id, { preAuthHold: { ...b.preAuthHold, status: 'released' } });
    showToast('Pre-auth security hold released', 'ok');
    setHoldModalOpen(false);
    setInspectBooking(null);
  }

  async function handleChargeHold(b) {
    await updateBooking(b.id, { preAuthHold: { ...b.preAuthHold, status: 'charged' } });
    showToast('Security deposit charged to card', 'warn');
    setHoldModalOpen(false);
    setInspectBooking(null);
  }

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Top Header */}
      <div className="cal-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Operations Calendar</h1>
            <span className="badge badge-violet" style={{ fontSize: 11 }}>Live Buffers</span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Day, week & month views with automated setup/teardown turnaround buffers
          </p>
        </div>

        <div className="cal-header-action" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setModalSlotParams({
                facilityId: facilities[0]?.id || '',
                date: currentDateKey,
                startHour: 10
              });
              setBookingModalOpen(true);
            }}
          >
            <Plus size={15} /> Direct Booking / Hold
          </button>
        </div>
      </div>

      {/* Control Bar: View Modes, Navigation, Filters */}
      <div className="sf-card sf-card-sm cal-controls-card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        {/* View Switcher: Day | Week | Month */}
        <div className="cal-view-switcher" style={{ display: 'flex', background: 'var(--sf-bg-surface)', padding: 3, borderRadius: 'var(--r-md)', border: '1px solid var(--sf-border)' }}>
          {['day', 'week', 'month'].map(mode => (
            <button
              key={mode}
              className={`btn btn-sm ${viewMode === mode ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '6px 14px', fontSize: 13, textTransform: 'capitalize' }}
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Date Navigation */}
        <div className="cal-date-nav" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handlePrev} title="Previous">
            <ChevronLeft size={16} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleToday} style={{ fontWeight: 600 }}>
            Today
          </button>
          <button className="btn btn-ghost btn-sm" onClick={handleNext} title="Next">
            <ChevronRight size={16} />
          </button>
          <span className="cal-date-nav-title" style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginLeft: 8, minWidth: 190 }}>
            {headerTitle}
          </span>
        </div>

        {/* Filters: Location, Facility & Status */}
        <div className="cal-filters" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={14} style={{ color: 'var(--sf-cyan-lt)' }} />
            <select
              className="sf-select sf-input-sm"
              value={selectedLocation}
              onChange={e => { setSelectedLocation(e.target.value); setSelectedFacilityId('all'); }}
              style={{ width: 160 }}
            >
              <option value="all">All Locations ({uniqueLocations.length})</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={14} style={{ color: 'var(--sf-text-mute)' }} />
            <select
              className="sf-select sf-input-sm"
              value={selectedFacilityId}
              onChange={e => setSelectedFacilityId(e.target.value)}
              style={{ width: 160 }}
            >
              <option value="all">All Spaces ({facilities.length})</option>
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} style={{ color: 'var(--sf-text-mute)' }} />
            <select
              className="sf-select sf-input-sm"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ width: 150 }}
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed Only</option>
              <option value="pending">Pending Approval</option>
              <option value="maintenance">Maintenance Blocks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Legend Banner */}
      <div className="cal-legend-bar" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 14px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-md)', marginBottom: 18, fontSize: 12, color: 'var(--sf-text-sub)', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: 'var(--sf-text)' }}>Legend:</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--sf-emerald)' }} /> Confirmed Event
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--sf-amber)' }} /> Pending Approval
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#94A3B8' }} /> Maintenance Block
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 10, borderRadius: 2, background: 'repeating-linear-gradient(45deg, rgba(124,58,237,0.4), rgba(124,58,237,0.4) 4px, rgba(124,58,237,0.1) 4px, rgba(124,58,237,0.1) 8px)' }} /> Setup Buffer
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 10, borderRadius: 2, background: 'repeating-linear-gradient(45deg, rgba(245,158,11,0.4), rgba(245,158,11,0.4) 4px, rgba(245,158,11,0.1) 4px, rgba(245,158,11,0.1) 8px)' }} /> Teardown Buffer
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--sf-cyan)' }} /> Pre-Auth Hold Active
        </span>
      </div>

      {/* ─── VIEW 1: DAY TIMELINE VIEW ─── */}
      {viewMode === 'day' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Facility Selector Tabs (Mobile & Quick-Switch) */}
          <div className="cal-facility-tabs">
            <button
              className={`cal-facility-pill ${selectedFacilityId === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedFacilityId('all')}
            >
              All Spaces ({facilities.length})
            </button>
            {facilities.map(f => (
              <button
                key={f.id}
                className={`cal-facility-pill ${selectedFacilityId === f.id ? 'active' : ''}`}
                onClick={() => setSelectedFacilityId(f.id)}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.accentColor || 'var(--sf-violet)' }} />
                {f.name}
              </button>
            ))}
          </div>

          <div className="sf-card" style={{ padding: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: displayedFacilities.length === 1 ? '100%' : Math.max(340, 70 + displayedFacilities.length * 160) }}>
              {/* Header: Facility Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: `65px repeat(${displayedFacilities.length}, minmax(${displayedFacilities.length === 1 ? '1fr' : '150px'}, 1fr))`, borderBottom: '1px solid var(--sf-border)', background: 'var(--sf-bg-surface)' }}>
                <div style={{ position: 'sticky', left: 0, zIndex: 20, padding: '14px 8px', fontSize: 11.5, fontWeight: 700, color: 'var(--sf-text-mute)', textAlign: 'center', borderRight: '1px solid var(--sf-border)', background: 'var(--sf-bg-surface)' }}>
                  Time
                </div>
                {displayedFacilities.map(fac => (
                  <div key={fac.id} style={{ padding: '12px 14px', borderRight: '1px solid var(--sf-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: fac.accentColor || 'var(--sf-violet)', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fac.name}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--sf-text-mute)', marginTop: 2 }}>
                      Cap: {fac.capacity} · £{fac.baseHourlyRate}/hr
                    </div>
                  </div>
                ))}
              </div>

            {/* Hour Rows */}
            <div style={{ position: 'relative' }}>
              {HOURS.map(hour => {
                return (
                  <div key={hour} style={{ display: 'grid', gridTemplateColumns: `65px repeat(${displayedFacilities.length}, minmax(${displayedFacilities.length === 1 ? '1fr' : '150px'}, 1fr))`, minHeight: 64, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Hour Column */}
                    <div style={{ position: 'sticky', left: 0, zIndex: 15, padding: '8px 6px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sf-text-mute)', textAlign: 'center', borderRight: '1px solid var(--sf-border)', background: 'var(--sf-bg-surface)' }}>
                      {String(hour).padStart(2, '0')}:00
                    </div>

                    {/* Facility Slots */}
                    {displayedFacilities.map(fac => {
                      // Find bookings on this day for this facility
                      const dayBookings = relevantBookings.filter(b => b.facilityId === fac.id && b.date === currentDateKey);

                      // Check if hour is an event start or within duration
                      const currentBooking = dayBookings.find(b => hour >= b.startHour && hour < b.startHour + b.durationHours);
                      const isEventStart = currentBooking && currentBooking.startHour === hour;

                      // Check buffers if not an event
                      let isSetupBuffer = false;
                      let isTeardownBuffer = false;
                      let bufferBooking = null;

                      if (!currentBooking) {
                        for (const b of dayBookings) {
                          const rules = b.bufferOverride || getBufferRules(fac, b.eventType);
                          const setupH = Math.ceil((rules.setup || 0) / 60);
                          const teardownH = Math.ceil((rules.teardown || 0) / 60);

                          if (setupH > 0 && hour >= b.startHour - setupH && hour < b.startHour) {
                            isSetupBuffer = true;
                            bufferBooking = b;
                            break;
                          }
                          if (teardownH > 0 && hour >= b.startHour + b.durationHours && hour < b.startHour + b.durationHours + teardownH) {
                            isTeardownBuffer = true;
                            bufferBooking = b;
                            break;
                          }
                        }
                      }

                      return (
                        <div
                          key={fac.id}
                          style={{
                            position: 'relative',
                            borderRight: '1px solid var(--sf-border)',
                            background: isSetupBuffer
                              ? 'repeating-linear-gradient(45deg, rgba(124,58,237,0.12), rgba(124,58,237,0.12) 8px, rgba(124,58,237,0.04) 8px, rgba(124,58,237,0.04) 16px)'
                              : isTeardownBuffer
                              ? 'repeating-linear-gradient(45deg, rgba(245,158,11,0.12), rgba(245,158,11,0.12) 8px, rgba(245,158,11,0.04) 8px, rgba(245,158,11,0.04) 16px)'
                              : 'transparent',
                            transition: 'background 0.15s',
                            cursor: (!currentBooking && !isSetupBuffer && !isTeardownBuffer) ? 'pointer' : 'default'
                          }}
                          onClick={() => {
                            if (!currentBooking && !isSetupBuffer && !isTeardownBuffer) {
                              handleSlotClick(fac.id, currentDateKey, hour);
                            }
                          }}
                          className={(!currentBooking && !isSetupBuffer && !isTeardownBuffer) ? 'calendar-empty-slot' : ''}
                        >
                          {/* SETUP BUFFER DISPLAY */}
                          {isSetupBuffer && (
                            <div
                              onClick={() => bufferBooking && setInspectBooking(bufferBooking)}
                              style={{ height: '100%', padding: '6px 10px', fontSize: 11, color: 'var(--sf-violet-lt)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                              title={`Setup buffer for ${bufferBooking?.hirerName}`}
                            >
                              <Clock size={11} />
                              <span style={{ fontWeight: 600 }}>Setup Buffer</span>
                              <span style={{ fontSize: 10, opacity: 0.8 }}>({bufferBooking?.eventType})</span>
                            </div>
                          )}

                          {/* TEARDOWN BUFFER DISPLAY */}
                          {isTeardownBuffer && (
                            <div
                              onClick={() => bufferBooking && setInspectBooking(bufferBooking)}
                              style={{ height: '100%', padding: '6px 10px', fontSize: 11, color: 'var(--sf-amber-lt)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                              title={`Teardown buffer for ${bufferBooking?.hirerName}`}
                            >
                              <Clock size={11} />
                              <span style={{ fontWeight: 600 }}>Teardown Buffer</span>
                              <span style={{ fontSize: 10, opacity: 0.8 }}>({bufferBooking?.eventType})</span>
                            </div>
                          )}

                          {/* EVENT BLOCK (Rendered once at startHour, spanning the duration) */}
                          {isEventStart && (
                            <div
                              onClick={(e) => { e.stopPropagation(); setInspectBooking(currentBooking); }}
                              style={{
                                position: 'absolute',
                                top: 2,
                                left: 4,
                                right: 4,
                                height: `calc(${currentBooking.durationHours * 64}px - 4px)`,
                                zIndex: 10,
                                borderRadius: 'var(--r-md)',
                                background: currentBooking.isMaintenance
                                  ? STATUS_CONFIG.maintenance.bg
                                  : (STATUS_CONFIG[currentBooking.status]?.bg || 'rgba(124,58,237,0.2)'),
                                border: `1px solid ${currentBooking.isMaintenance ? STATUS_CONFIG.maintenance.border : (STATUS_CONFIG[currentBooking.status]?.border || 'var(--sf-violet)')}`,
                                padding: '10px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                                overflow: 'hidden',
                                transition: 'transform 0.15s, box-shadow 0.15s',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                  <span className={`badge ${currentBooking.isMaintenance ? 'badge-gray' : (STATUS_CONFIG[currentBooking.status]?.badge || 'badge-violet')}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                                    {currentBooking.isMaintenance ? '🔧 Maintenance' : (STATUS_CONFIG[currentBooking.status]?.label || currentBooking.status)}
                                  </span>
                                  <span className="badge badge-gray" style={{ fontSize: 10, padding: '1px 6px' }}>
                                    {currentBooking.eventType}
                                  </span>
                                  {currentBooking.preAuthHold?.enabled && currentBooking.preAuthHold?.status === 'held' && (
                                    <span className="badge badge-cyan" style={{ fontSize: 10, padding: '1px 6px' }}>
                                      <ShieldCheck size={9} /> Hold
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 2 }}>
                                  {currentBooking.hirerName}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--sf-text-sub)' }}>
                                  {String(currentBooking.startHour).padStart(2, '0')}:00 – {String(currentBooking.startHour + currentBooking.durationHours).padStart(2, '0')}:00 ({currentBooking.durationHours}h)
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--sf-text-mute)' }}>
                                <span>{currentBooking.attendees > 0 ? `${currentBooking.attendees} attendees` : ''}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--sf-violet-lt)' }}>
                                  {currentBooking.totalAmount > 0 ? `£${currentBooking.totalAmount.toLocaleString()}` : 'Free'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Empty Slot Hover Hint */}
                          {!currentBooking && !isSetupBuffer && !isTeardownBuffer && (
                            <div className="slot-add-indicator" style={{ display: 'none', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--sf-text-mute)', fontSize: 11 }}>
                              <Plus size={12} /> Click to reserve
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* ─── VIEW 2: WEEK VIEW ─── */}
      {viewMode === 'week' && (
        <div>
          {/* Weekly Summary Bar */}
          <div className="cal-week-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, marginBottom: 18 }}>
            {[
              {
                label: 'Week Bookings',
                val: relevantBookings.filter(b => weekDays.some(w => w.dateKey === b.date)).length,
                col: 'var(--sf-violet-lt)'
              },
              {
                label: 'Booked Hours',
                val: `${relevantBookings.filter(b => weekDays.some(w => w.dateKey === b.date)).reduce((acc, b) => acc + b.durationHours, 0)} hrs`,
                col: 'var(--sf-emerald)'
              },
              {
                label: 'Turnaround Buffers',
                val: `${relevantBookings.filter(b => weekDays.some(w => w.dateKey === b.date)).length * 2} hrs protected`,
                col: 'var(--sf-amber)'
              },
              {
                label: 'Scheduled Value',
                val: `£${relevantBookings.filter(b => weekDays.some(w => w.dateKey === b.date)).reduce((acc, b) => acc + (b.totalAmount || 0), 0).toLocaleString()}`,
                col: 'var(--sf-cyan)'
              }
            ].map(s => (
              <div key={s.label} className="stat-card" style={{ padding: '14px 18px' }}>
                <div className="stat-card-value" style={{ fontSize: 22, color: s.col }}>{s.val}</div>
                <div className="stat-card-label" style={{ fontSize: 11.5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* 7 Days Columns */}
          <div className="cal-week-columns" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {weekDays.map(day => {
              const dayBookings = relevantBookings.filter(b => b.date === day.dateKey);

              return (
                <div
                  key={day.dateKey}
                  style={{
                    background: day.isToday ? 'rgba(124,58,237,0.06)' : 'var(--sf-bg-card)',
                    border: `1px solid ${day.isToday ? 'var(--sf-violet)' : 'var(--sf-border)'}`,
                    borderRadius: 'var(--r-xl)',
                    minHeight: 480,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}
                >
                  {/* Column Header */}
                  <div style={{ padding: '12px 10px', textAlign: 'center', borderBottom: '1px solid var(--sf-border)', background: day.isToday ? 'var(--sf-violet-dim)' : 'var(--sf-bg-surface)' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: day.isToday ? 'var(--sf-violet-lt)' : 'var(--sf-text-mute)', textTransform: 'uppercase' }}>
                      {day.dayName}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: day.isToday ? '#fff' : 'var(--sf-text)' }}>
                      {day.dayNum}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--sf-text-mute)', marginTop: 2 }}>
                      {dayBookings.length} {dayBookings.length === 1 ? 'event' : 'events'}
                    </div>
                  </div>

                  {/* Booking Cards in Day Column */}
                  <div style={{ padding: 8, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dayBookings.map(b => {
                      const ss = STATUS_CONFIG[b.status] || STATUS_CONFIG.confirmed;
                      return (
                        <div
                          key={b.id}
                          onClick={() => setInspectBooking(b)}
                          style={{
                            background: b.isMaintenance ? STATUS_CONFIG.maintenance.bg : ss.bg,
                            border: `1px solid ${b.isMaintenance ? STATUS_CONFIG.maintenance.border : ss.border}`,
                            borderRadius: 'var(--r-md)',
                            padding: '10px 10px',
                            cursor: 'pointer',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span className={`badge ${b.isMaintenance ? 'badge-gray' : ss.badge}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                              {b.isMaintenance ? 'Maintenance' : ss.label}
                            </span>
                            <span style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--sf-text-mute)' }}>
                              {String(b.startHour).padStart(2, '0')}:00
                            </span>
                          </div>

                          <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--sf-text)', marginBottom: 2 }}>
                            {b.facilityName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--sf-text-sub)', marginBottom: 4 }}>
                            {b.hirerName}
                          </div>

                          {/* Turnaround Buffer Pill */}
                          <div style={{ fontSize: 9.5, color: 'var(--sf-violet-lt)', background: 'rgba(124,58,237,0.15)', padding: '2px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={8} /> Buffers active
                          </div>
                        </div>
                      );
                    })}

                    {/* Quick Add Slot */}
                    <button
                      className="btn btn-ghost btn-sm btn-full"
                      style={{ marginTop: 'auto', border: '1px dashed var(--sf-border)', fontSize: 11, padding: '6px' }}
                      onClick={() => handleSlotClick(selectedFacilityId !== 'all' ? selectedFacilityId : (facilities[0]?.id || ''), day.dateKey, 10)}
                    >
                      <Plus size={12} /> Book Space
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── VIEW 3: MONTH VIEW ─── */}
      {viewMode === 'month' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="sf-card" style={{ padding: 14 }}>
            {/* Day Names Header */}
            <div className="cal-month-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, textAlign: 'center', marginBottom: 8 }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-text-mute)', textTransform: 'uppercase', padding: '6px 0' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="cal-month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {monthDays.map(cell => {
                const dayBookings = relevantBookings.filter(b => b.date === cell.dateKey);
                const isSelected = selectedMonthDate === cell.dateKey;

                return (
                  <div
                    key={cell.dateKey}
                    className="cal-month-cell"
                    style={{
                      minHeight: 105,
                      background: isSelected
                        ? 'rgba(124,58,237,0.18)'
                        : cell.isToday
                        ? 'rgba(124,58,237,0.08)'
                        : (cell.currentMonth ? 'var(--sf-bg-surface)' : 'rgba(0,0,0,0.2)'),
                      border: `1px solid ${isSelected ? 'var(--sf-violet)' : cell.isToday ? 'rgba(124,58,237,0.5)' : 'var(--sf-border)'}`,
                      borderRadius: 'var(--r-md)',
                      padding: '8px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      opacity: cell.currentMonth ? 1 : 0.45,
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s'
                    }}
                    onClick={() => {
                      setSelectedMonthDate(cell.dateKey);
                      setCurrentDate(cell.date);
                      if (window.innerWidth > 640) {
                        setViewMode('day');
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span
                        className="cal-month-cell-daynum"
                        style={{
                          fontSize: 12,
                          fontWeight: (cell.isToday || isSelected) ? 800 : 600,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: isSelected ? 'var(--sf-violet)' : (cell.isToday ? 'rgba(124,58,237,0.6)' : 'transparent'),
                          color: (cell.isToday || isSelected) ? '#fff' : 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {cell.dayNum}
                      </span>
                      {dayBookings.length > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--sf-text-mute)', fontWeight: 600 }}>
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Mobile Dot Indicators */}
                    <div className="cal-month-dot-row">
                      {dayBookings.slice(0, 3).map(b => (
                        <span
                          key={b.id}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: b.isMaintenance ? '#94A3B8' : (STATUS_CONFIG[b.status]?.color || 'var(--sf-violet)')
                          }}
                        />
                      ))}
                      {dayBookings.length > 3 && (
                        <span style={{ fontSize: 9, color: 'var(--sf-text-mute)', lineHeight: 1 }}>+</span>
                      )}
                    </div>

                    {/* Desktop Booking Chips */}
                    <div className="cal-month-event-chip" style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                      {dayBookings.slice(0, 3).map(b => (
                        <div
                          key={b.id}
                          onClick={(e) => { e.stopPropagation(); setInspectBooking(b); }}
                          style={{
                            fontSize: 10,
                            padding: '2px 5px',
                            borderRadius: 3,
                            background: b.isMaintenance ? 'rgba(148,163,184,0.25)' : (STATUS_CONFIG[b.status]?.bg || 'rgba(124,58,237,0.2)'),
                            color: b.isMaintenance ? '#CBD5E1' : (STATUS_CONFIG[b.status]?.color || 'var(--sf-violet-lt)'),
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 500
                          }}
                          title={`${b.facilityName} - ${b.hirerName} (${b.eventType})`}
                        >
                          {String(b.startHour).padStart(2, '0')}:00 {b.facilityName.split(' ')[0]}
                        </div>
                      ))}
                      {dayBookings.length > 3 && (
                        <div style={{ fontSize: 9.5, color: 'var(--sf-text-mute)', textAlign: 'center' }}>
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Day Agenda Panel (renders below month grid on small screens) */}
          <div className="cal-month-agenda-mobile sf-card" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--sf-text-mute)', textTransform: 'uppercase', fontWeight: 600 }}>Selected Day Schedule</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--sf-text)' }}>
                  {parseDateKey(selectedMonthDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleSlotClick(selectedFacilityId !== 'all' ? selectedFacilityId : (facilities[0]?.id || ''), selectedMonthDate, 10)}
                style={{ fontSize: 12, padding: '5px 10px', gap: 4 }}
              >
                <Plus size={13} /> Book Space
              </button>
            </div>

            {(() => {
              const selectedDateBookings = relevantBookings.filter(b => b.date === selectedMonthDate);
              if (selectedDateBookings.length === 0) {
                return (
                  <div style={{ padding: '16px 12px', textAlign: 'center', background: 'var(--sf-bg-surface)', borderRadius: 'var(--r-md)', border: '1px dashed var(--sf-border)' }}>
                    <CalendarIcon size={20} style={{ color: 'var(--sf-text-mute)', margin: '0 auto 6px', display: 'block' }} />
                    <div style={{ fontSize: 12.5, color: 'var(--sf-text-sub)', fontWeight: 500 }}>No bookings scheduled for this date</div>
                    <div style={{ fontSize: 11, color: 'var(--sf-text-mute)', marginTop: 2 }}>All facility slots are open for reservations</div>
                  </div>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedDateBookings.map(b => {
                    const ss = STATUS_CONFIG[b.status] || STATUS_CONFIG.confirmed;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setInspectBooking(b)}
                        style={{
                          background: b.isMaintenance ? STATUS_CONFIG.maintenance.bg : ss.bg,
                          border: `1px solid ${b.isMaintenance ? STATUS_CONFIG.maintenance.border : ss.border}`,
                          borderRadius: 'var(--r-md)',
                          padding: '10px 12px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span className={`badge ${b.isMaintenance ? 'badge-gray' : ss.badge}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                            {b.isMaintenance ? 'Maintenance' : ss.label}
                          </span>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--sf-text-mute)' }}>
                            {String(b.startHour).padStart(2, '0')}:00 – {String(b.startHour + b.durationHours).padStart(2, '0')}:00 ({b.durationHours}h)
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--sf-text)', marginBottom: 2 }}>
                          {b.facilityName} · {b.hirerName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--sf-text-sub)' }}>
                          <span>{b.eventType}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--sf-violet-lt)' }}>
                            {b.totalAmount > 0 ? `£${b.totalAmount.toLocaleString()}` : 'Free'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Direct Booking / Hold Modal */}
      <AdminDirectBookingModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialFacilityId={modalSlotParams.facilityId}
        initialDate={modalSlotParams.date}
        initialStartHour={modalSlotParams.startHour}
      />

      {/* Booking Inspection Modal */}
      <Modal open={!!inspectBooking} onClose={() => setInspectBooking(null)} title="Booking & Buffer Inspector" size="lg">
        {inspectBooking && (
          <div>
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className={`badge ${inspectBooking.isMaintenance ? 'badge-gray' : (STATUS_CONFIG[inspectBooking.status]?.badge || 'badge-violet')}`}>
                    {inspectBooking.isMaintenance ? 'Maintenance Block' : (STATUS_CONFIG[inspectBooking.status]?.label || inspectBooking.status)}
                  </span>
                  <span className="badge badge-gray">{inspectBooking.eventType}</span>
                  {inspectBooking.preAuthHold?.enabled && inspectBooking.preAuthHold?.status === 'held' && (
                    <span className="badge badge-cyan"><ShieldCheck size={10} /> Hold Active (£{inspectBooking.preAuthHold.amount})</span>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
                  {inspectBooking.facilityName}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 800, color: 'var(--sf-violet-lt)' }}>
                  £{inspectBooking.totalAmount?.toLocaleString()}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>
                  {inspectBooking.paymentMode === 'auto' ? 'Paid via Card' : (inspectBooking.paymentMode === 'manual' ? 'Invoiced' : 'Complimentary')}
                </div>
              </div>
            </div>

            {/* Time & Turnaround Buffer Breakdown */}
            <div style={{ padding: 14, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-lg)', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-text-mute)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} /> Schedule & Buffer Timeline
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, fontSize: 13 }}>
                <div>
                  <div style={{ color: 'var(--sf-text-mute)', fontSize: 11 }}>Date</div>
                  <div style={{ fontWeight: 600 }}>{inspectBooking.date}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--sf-text-mute)', fontSize: 11 }}>Event Time</div>
                  <div style={{ fontWeight: 600 }}>{String(inspectBooking.startHour).padStart(2, '0')}:00 – {String(inspectBooking.startHour + inspectBooking.durationHours).padStart(2, '0')}:00 ({inspectBooking.durationHours}h)</div>
                </div>
                <div>
                  <div style={{ color: 'var(--sf-violet-lt)', fontSize: 11 }}>Setup Buffer</div>
                  <div style={{ fontWeight: 600, color: 'var(--sf-violet-lt)' }}>
                    {inspectBooking.bufferOverride?.setup ?? (getBufferRules(facilities.find(f => f.id === inspectBooking.facilityId), inspectBooking.eventType)?.setup ?? 30)} mins
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--sf-amber-lt)', fontSize: 11 }}>Teardown Buffer</div>
                  <div style={{ fontWeight: 600, color: 'var(--sf-amber-lt)' }}>
                    {inspectBooking.bufferOverride?.teardown ?? (getBufferRules(facilities.find(f => f.id === inspectBooking.facilityId), inspectBooking.eventType)?.teardown ?? 30)} mins
                  </div>
                </div>
              </div>
            </div>

            {/* Hirer & Contact Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
              <div style={{ padding: 12, background: 'var(--sf-bg-raised)', borderRadius: 'var(--r-md)' }}>
                <div style={{ color: 'var(--sf-text-mute)', fontSize: 11, marginBottom: 2 }}>Hirer / Organizer</div>
                <div style={{ fontWeight: 600 }}>{inspectBooking.hirerName}</div>
                <div style={{ color: 'var(--sf-text-sub)', fontSize: 12 }}>{inspectBooking.hirerEmail}</div>
                {inspectBooking.hirerPhone && <div style={{ color: 'var(--sf-text-sub)', fontSize: 12 }}>{inspectBooking.hirerPhone}</div>}
              </div>
              <div style={{ padding: 12, background: 'var(--sf-bg-raised)', borderRadius: 'var(--r-md)' }}>
                <div style={{ color: 'var(--sf-text-mute)', fontSize: 11, marginBottom: 2 }}>Event Info</div>
                <div><strong>Attendees:</strong> {inspectBooking.attendees || '—'}</div>
                <div><strong>Booking ID:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{inspectBooking.id}</span></div>
                {inspectBooking.invoiceId && <div><strong>Invoice:</strong> <span style={{ fontFamily: 'var(--font-mono)' }}>{inspectBooking.invoiceId}</span></div>}
              </div>
            </div>

            {inspectBooking.notes && (
              <div style={{ padding: '10px 12px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-md)', marginBottom: 18, fontSize: 12.5, color: 'var(--sf-text-sub)' }}>
                <strong>Notes:</strong> {inspectBooking.notes}
              </div>
            )}

            {/* Actions Toolbar */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {inspectBooking.status === 'pending_approval' && (
                <>
                  <button className="btn btn-success" onClick={() => handleApprove(inspectBooking.id)}>
                    <Check size={14} /> Approve Booking
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => setRejectModalOpen(true)}>
                    <X size={13} /> Reject
                  </button>
                </>
              )}

              {inspectBooking.preAuthHold?.enabled && inspectBooking.preAuthHold?.status === 'held' && (
                <button className="btn btn-amber btn-sm" onClick={() => setHoldModalOpen(true)}>
                  <ShieldCheck size={13} /> Manage Hold (£{inspectBooking.preAuthHold.amount})
                </button>
              )}

              {inspectBooking.status === 'confirmed' && !inspectBooking.isMaintenance && (
                <button className="btn btn-danger btn-sm" onClick={async () => {
                  await cancelBooking(inspectBooking.id);
                  showToast('Booking cancelled', 'warn');
                  setInspectBooking(null);
                }}>
                  Cancel Booking
                </button>
              )}

              <button className="btn btn-ghost" onClick={() => setInspectBooking(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Booking">
        <p style={{ color: 'var(--sf-text-sub)', marginBottom: 16 }}>
          Are you sure you want to reject this booking for <strong>{inspectBooking?.hirerName}</strong>?
        </p>
        <div className="sf-field" style={{ marginBottom: 16 }}>
          <label className="sf-label">Reason for Rejection (sent to hirer)</label>
          <textarea
            className="sf-textarea"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="e.g. Space reserved for official fixture / maintenance..."
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-full" onClick={() => setRejectModalOpen(false)}>Cancel</button>
          <button className="btn btn-danger btn-full" onClick={handleRejectConfirm}>Reject Booking</button>
        </div>
      </Modal>

      {/* Hold Modal */}
      <Modal open={holdModalOpen} onClose={() => setHoldModalOpen(false)} title="Manage Pre-Auth Security Hold">
        <div style={{ padding: 14, background: 'var(--sf-amber-dim)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--r-lg)', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: 'var(--sf-amber-lt)', marginBottom: 4 }}>
            £{inspectBooking?.preAuthHold?.amount?.toLocaleString()} hold on card
          </div>
          <div style={{ fontSize: 13, color: 'var(--sf-text-sub)' }}>
            {inspectBooking?.hirerName} · {inspectBooking?.facilityName}
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--sf-text-sub)', marginBottom: 18 }}>
          What would you like to do with the security deposit?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-success btn-full" onClick={() => handleReleaseHold(inspectBooking)}>
            <Check size={14} /> Release Hold — No charges apply
          </button>
          <button className="btn btn-danger btn-full" onClick={() => handleChargeHold(inspectBooking)}>
            <ShieldCheck size={14} /> Charge Hold — Deduct £{inspectBooking?.preAuthHold?.amount} from card
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => setHoldModalOpen(false)}>
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
