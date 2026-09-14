import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, ChevronLeft, ChevronRight, Users, Clock, 
  Maximize2, Check, X, Calendar, Info, Zap, Timer, MapPin, Building2, 
  ArrowUpDown, Filter, Sparkles, Navigation, Layers, Compass, CheckCircle2
} from 'lucide-react';
import { useApp, getSlotStateFull, getBufferRules } from '../../store/SpaceFlowContext.jsx';
import { useDemo } from '../../store/DemoContext.jsx';
import Modal from '../../components/ui/Modal.jsx';

function toDateKey(d) { return d.toISOString().slice(0, 10); }
function startOfToday() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function fmtDate(d) { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
function dowShort(d) { return d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(); }

const FACILITY_TYPES = ['All Types', 'Ballroom', 'Conference Room', 'Sports Ground', 'Photography Studio', 'Exhibition Hall', 'Outdoor Venue'];
const CAPACITIES = ['Any Capacity', '0–30 (Small)', '31–100 (Medium)', '101–500 (Large)', '500+ (Grand/Arena)'];

const LOCATION_OPTIONS = [
  { id: 'all', label: 'All Locations (UK Nationwide)', city: 'All' },
  { id: 'London', label: 'Greater London (3 Hubs)', city: 'London' },
  { id: 'Central London Hub', label: 'London — Central (Westminster)', city: 'London' },
  { id: 'City Tech Campus', label: 'London — City Tech (Shoreditch)', city: 'London' },
  { id: 'Olympic Park Sports Hub', label: 'London — Olympic Park (Stratford)', city: 'London' },
  { id: 'MediaCityUK Creative Village', label: 'Manchester — MediaCityUK (Salford Quays)', city: 'Manchester' },
  { id: 'Birmingham Skyline Lofts', label: 'Birmingham — Skyline (Colmore Row)', city: 'Birmingham' },
  { id: 'Bristol Harbourside Docks', label: 'Bristol — Harbourside (Wapping Wharf)', city: 'Bristol' },
  { id: 'Surrey Sports & Country Grounds', label: 'Surrey — Sports & Country Grounds (Guildford)', city: 'Guildford' },
];

const STATE_COLORS = {
  available: { bg: 'var(--slot-available)', border: 'var(--slot-available-bd)', text: 'var(--sf-emerald-lt)', dot: 'var(--sf-emerald)' },
  setup:     { bg: 'var(--slot-setup)',     border: 'var(--slot-setup-bd)',     text: 'var(--sf-cyan-lt)',    dot: 'var(--sf-cyan)' },
  teardown:  { bg: 'var(--slot-teardown)',  border: 'var(--slot-teardown-bd)',  text: 'var(--sf-amber-lt)',   dot: 'var(--sf-amber)' },
  booked:    { bg: 'var(--slot-booked)',    border: 'var(--slot-booked-bd)',    text: 'var(--sf-violet-lt)',  dot: 'var(--sf-violet)' },
  held:      { bg: 'var(--slot-held)',      border: 'var(--slot-held-bd)',      text: 'var(--sf-amber-lt)',   dot: 'var(--sf-amber)' },
  pending:   { bg: 'var(--slot-pending)',   border: 'var(--slot-pending-bd)',   text: 'var(--sf-amber-lt)',   dot: 'var(--sf-amber)' },
  blocked:   { bg: 'var(--slot-blocked)',   border: 'var(--slot-blocked-bd)',   text: 'var(--sf-text-mute)',  dot: 'var(--sf-text-mute)' },
  selected:  { bg: 'var(--slot-selected)',  border: 'var(--slot-selected-bd)',  text: 'var(--sf-violet-lt)',  dot: 'var(--sf-violet-lt)' },
};

const SLOT_LABELS = {
  available: (price) => `£${price}/hr — available`,
  setup:     (bk) => `Setup buffer (${bk?.eventType || ''})`,
  teardown:  (bk) => `Teardown buffer (${bk?.eventType || ''})`,
  booked:    (bk) => bk?.hirerName || 'Booked',
  held:      (bk) => `Hold — ${bk?.hirerName || ''}`,
  pending:   (bk) => `Pending — ${bk?.hirerName || ''}`,
  blocked:   () => 'Unavailable',
};

export default function ExploreSpacesPage() {
  const { facilities, bookings, settings, session, setPendingBooking } = useApp();
  const { demoTriggers, setDemoTriggers } = useDemo();
  const navigate = useNavigate();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [capFilter, setCapFilter] = useState('Any Capacity');
  const [sortBy, setSortBy] = useState('recommended');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map' | 'list'

  // Booking & Selection State
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [weekStart, setWeekStart] = useState(startOfToday());
  const [selection, setSelection] = useState([]); // array of hours

  const dateKey = toDateKey(selectedDate);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Quick Booking Modal State
  const [quickBookFacility, setQuickBookFacility] = useState(null);
  const [qbDate, setQbDate] = useState(() => toDateKey(new Date()));
  const [qbTimePreset, setQbTimePreset] = useState('morning'); // 'morning' | 'afternoon' | 'evening' | 'custom'
  const [qbStartHour, setQbStartHour] = useState(10);
  const [qbDuration, setQbDuration] = useState(4);

  const qbEffStart = qbTimePreset === 'morning' ? 9 : qbTimePreset === 'afternoon' ? 13 : qbTimePreset === 'evening' ? 18 : qbStartHour;
  const qbEffDuration = qbTimePreset === 'custom' ? qbDuration : 4;
  const qbEndHour = qbEffStart + qbEffDuration;

  const qbHasConflict = useMemo(() => {
    if (!quickBookFacility) return false;
    for (let h = qbEffStart; h < qbEndHour; h++) {
      const stateObj = getSlotStateFull(quickBookFacility, qbDate, h, bookings);
      if (stateObj.state !== 'available') return true;
    }
    return false;
  }, [quickBookFacility, qbDate, qbEffStart, qbEndHour, bookings]);

  function handleQuickBookProceed() {
    if (!quickBookFacility) return;
    const hours = Array.from({ length: qbEffDuration }, (_, i) => qbEffStart + i);
    setPendingBooking({
      facilityId: quickBookFacility.id,
      facility: quickBookFacility,
      date: qbDate,
      startHour: qbEffStart,
      durationHours: qbEffDuration,
      selectedHours: hours,
    });
    setQuickBookFacility(null);
    navigate('/app/book-flow');
  }

  // Demo trigger: auto-select facility
  useEffect(() => {
    if (demoTriggers.selectFacility) {
      const fac = facilities.find(f => f.id === demoTriggers.selectFacility);
      if (fac) { setSelectedFacility(fac); setDemoTriggers(t => ({ ...t, selectFacility: null })); }
    }
  }, [demoTriggers.selectFacility, facilities]);

  // Filtering Logic
  const filtered = useMemo(() => {
    let list = facilities.filter(f => {
      if (!f.active) return false;

      // Location Filter
      if (locationFilter !== 'all') {
        if (locationFilter === 'London') {
          if (f.city !== 'London') return false;
        } else if (f.locationName !== locationFilter && f.city !== locationFilter) {
          return false;
        }
      }

      // Facility Type
      if (typeFilter !== 'All Types' && f.type !== typeFilter) return false;

      // Capacity
      if (capFilter.startsWith('0–30') && f.capacity > 30) return false;
      if (capFilter.startsWith('31–100') && (f.capacity < 31 || f.capacity > 100)) return false;
      if (capFilter.startsWith('101–500') && (f.capacity < 101 || f.capacity > 500)) return false;
      if (capFilter.startsWith('500+') && f.capacity <= 500) return false;

      // Search Query across name, location, address, city, description, amenities
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = f.name?.toLowerCase().includes(q);
        const matchType = f.type?.toLowerCase().includes(q);
        const matchLoc = f.locationName?.toLowerCase().includes(q);
        const matchCity = f.city?.toLowerCase().includes(q);
        const matchAddr = f.address?.toLowerCase().includes(q);
        const matchDesc = f.description?.toLowerCase().includes(q);
        const matchAmenity = (f.amenities || []).some(a => a.toLowerCase().includes(q));
        if (!matchName && !matchType && !matchLoc && !matchCity && !matchAddr && !matchDesc && !matchAmenity) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.baseHourlyRate - b.baseHourlyRate);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.baseHourlyRate - a.baseHourlyRate);
    } else if (sortBy === 'capacity-desc') {
      list.sort((a, b) => b.capacity - a.capacity);
    }

    return list;
  }, [facilities, search, locationFilter, typeFilter, capFilter, sortBy]);

  function getHourSlots(facility) {
    const open = facility.openHours?.start ?? 8;
    const close = facility.openHours?.end ?? 22;
    return Array.from({ length: close - open }, (_, i) => open + i);
  }

  function toggleHour(h, stateObj) {
    if (!['available', 'selected'].includes(stateObj.state)) return;
    setSelection(s => s.includes(h) ? s.filter(x => x !== h) : [...s, h].sort((a, b) => a - b));
  }

  function proceedToBooking() {
    if (!selectedFacility || selection.length === 0) return;
    const minHour = Math.min(...selection);
    setPendingBooking({
      facilityId: selectedFacility.id,
      facility: selectedFacility,
      date: dateKey,
      startHour: minHour,
      durationHours: selection.length,
      selectedHours: selection,
    });
    navigate('/app/book-flow');
  }

  function getAvailStrip(facility) {
    const hours = getHourSlots(facility);
    return hours.slice(0, 12).map(h => {
      const s = getSlotStateFull(facility, toDateKey(new Date()), h, bookings);
      return s.state;
    });
  }

  const DOT_COL = { 
    available: 'var(--sf-emerald)', 
    booked: 'var(--sf-violet)', 
    held: 'var(--sf-amber)', 
    pending: 'var(--sf-amber)', 
    setup: 'var(--sf-cyan)', 
    teardown: 'var(--sf-amber-lt)', 
    blocked: 'var(--sf-text-faint)', 
    selected: 'var(--sf-violet-lt)' 
  };

  // Unique cities count
  const citiesCount = new Set(facilities.map(f => f.city || 'London')).size;

  const hasActiveFilters = search || locationFilter !== 'all' || typeFilter !== 'All Types' || capFilter !== 'Any Capacity';

  function resetFilters() {
    setSearch('');
    setLocationFilter('all');
    setTypeFilter('All Types');
    setCapFilter('Any Capacity');
    setSortBy('recommended');
  }

  return (
    <div>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="page-title" style={{ margin: 0 }}>Explore Spaces</h1>
            <span className="badge badge-cyan" style={{ fontSize: 11 }}>
              <Navigation size={10} /> Multi-Location SaaS
            </span>
          </div>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Book halls, pitches, boardrooms & studios across {citiesCount} regional UK hubs
          </p>
        </div>

        {/* View Mode Toggle: Grid | Interactive Map | List */}
        <div style={{ display: 'flex', background: 'var(--sf-bg-surface)', padding: 3, borderRadius: 'var(--r-md)', border: '1px solid var(--sf-border)' }}>
          <button
            className={`btn btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12.5 }}
            onClick={() => setViewMode('grid')}
          >
            Grid
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'map' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12.5 }}
            onClick={() => setViewMode('map')}
          >
            <Compass size={13} /> Campus Map
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12.5 }}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
        </div>
      </div>

      {/* ─── Search & Multi-Facet Filters Bar ─── */}
      <div className="sf-card sf-card-sm" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, alignItems: 'center' }}>
          {/* Text Search */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--sf-text-mute)', pointerEvents: 'none' }} />
            <input
              className="sf-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search space, city, or feature…"
              style={{ paddingLeft: 38 }}
            />
          </div>

          {/* Location Selector */}
          <div style={{ position: 'relative' }}>
            <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--sf-cyan-lt)', pointerEvents: 'none', zIndex: 1 }} />
            <select
              className="sf-select"
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              style={{ paddingLeft: 34 }}
            >
              {LOCATION_OPTIONS.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.label}</option>
              ))}
            </select>
          </div>

          {/* Facility Type Selector */}
          <div style={{ position: 'relative' }}>
            <Building2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--sf-violet-lt)', pointerEvents: 'none', zIndex: 1 }} />
            <select
              className="sf-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              style={{ paddingLeft: 34 }}
            >
              {FACILITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Capacity Selector */}
          <div style={{ position: 'relative' }}>
            <Users size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--sf-amber-lt)', pointerEvents: 'none', zIndex: 1 }} />
            <select
              className="sf-select"
              value={capFilter}
              onChange={e => setCapFilter(e.target.value)}
              style={{ paddingLeft: 34 }}
            >
              {CAPACITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Sort Selector */}
          <div style={{ position: 'relative' }}>
            <ArrowUpDown size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--sf-text-mute)', pointerEvents: 'none', zIndex: 1 }} />
            <select
              className="sf-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ paddingLeft: 34 }}
            >
              <option value="recommended">Sort: Recommended</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="capacity-desc">Capacity: Largest First</option>
            </select>
          </div>
        </div>

        {/* Quick Location Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, overflowX: 'auto', paddingBottom: 2 }}>
          <span style={{ fontSize: 11.5, color: 'var(--sf-text-mute)', fontWeight: 600, whiteSpace: 'nowrap' }}>Popular Hubs:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'London', label: 'London Hubs' },
            { id: 'MediaCityUK Creative Village', label: 'Manchester MediaCity' },
            { id: 'Birmingham Skyline Lofts', label: 'Birmingham Colmore' },
            { id: 'Bristol Harbourside Docks', label: 'Bristol Harbourside' },
            { id: 'Surrey Sports & Country Grounds', label: 'Surrey Grounds' },
          ].map(p => (
            <button
              key={p.id}
              className={`badge ${locationFilter === p.id ? 'badge-cyan' : 'badge-gray'}`}
              style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 11, whiteSpace: 'nowrap' }}
              onClick={() => setLocationFilter(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Active Filter Badges & Results Count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--sf-border)', fontSize: 12, color: 'var(--sf-text-mute)', flexWrap: 'wrap' }}>
          <div>
            Showing <strong style={{ color: 'var(--sf-text)' }}>{filtered.length}</strong> spaces across <strong style={{ color: 'var(--sf-cyan-lt)' }}>{citiesCount} locations</strong>
          </div>

          {hasActiveFilters && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {locationFilter !== 'all' && (
                <span className="badge badge-cyan" style={{ fontSize: 11 }}>
                  📍 {LOCATION_OPTIONS.find(l => l.id === locationFilter)?.label.split('(')[0] || locationFilter}
                  <X size={11} style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setLocationFilter('all')} />
                </span>
              )}
              {typeFilter !== 'All Types' && (
                <span className="badge badge-violet" style={{ fontSize: 11 }}>
                  🏛️ {typeFilter}
                  <X size={11} style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setTypeFilter('All Types')} />
                </span>
              )}
              {capFilter !== 'Any Capacity' && (
                <span className="badge badge-amber" style={{ fontSize: 11 }}>
                  👥 {capFilter.split(' ')[0]}
                  <X size={11} style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setCapFilter('Any Capacity')} />
                </span>
              )}
              {search && (
                <span className="badge badge-gray" style={{ fontSize: 11 }}>
                  🔍 "{search}"
                  <X size={11} style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => setSearch('')} />
                </span>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={resetFilters}
                style={{ fontSize: 11, padding: '2px 8px', height: 'auto', textDecoration: 'underline' }}
              >
                Reset all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── VIEW 2: INTERACTIVE CAMPUS MAP ─── */}
      {viewMode === 'map' && (
        <div className="sf-card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700 }}>
                Interactive Regional Hubs Map
              </div>
              <div style={{ fontSize: 12, color: 'var(--sf-text-mute)' }}>
                Click on any location node to view available spaces in that area
              </div>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: 11 }}>
              {facilities.length} Spaces Mapped
            </span>
          </div>

          {/* Styled UK Hubs Canvas */}
          <div style={{ position: 'relative', width: '100%', height: 340, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(15,23,42,0.95) 0%, rgba(8,10,24,1) 100%)', borderRadius: 'var(--r-lg)', border: '1px solid var(--sf-border)', overflow: 'hidden' }}>
            {/* Background Grid Lines */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            {/* Hub Pins */}
            {[
              { id: 'Central London Hub', name: 'Central London', loc: 'Westminster', x: '58%', y: '68%', count: facilities.filter(f => f.locationName === 'Central London Hub').length, col: '#A78BFA' },
              { id: 'City Tech Campus', name: 'London Tech', loc: 'Shoreditch', x: '62%', y: '66%', count: facilities.filter(f => f.locationName === 'City Tech Campus').length, col: '#22D3EE' },
              { id: 'Olympic Park Sports Hub', name: 'Olympic Park', loc: 'Stratford', x: '65%', y: '64%', count: facilities.filter(f => f.locationName === 'Olympic Park Sports Hub').length, col: '#10B981' },
              { id: 'MediaCityUK Creative Village', name: 'Manchester', loc: 'Salford Quays', x: '46%', y: '40%', count: facilities.filter(f => f.locationName === 'MediaCityUK Creative Village').length, col: '#FB923C' },
              { id: 'Birmingham Skyline Lofts', name: 'Birmingham', loc: 'Colmore Row', x: '49%', y: '54%', count: facilities.filter(f => f.locationName === 'Birmingham Skyline Lofts').length, col: '#818CF8' },
              { id: 'Bristol Harbourside Docks', name: 'Bristol', loc: 'Harbourside', x: '38%', y: '70%', count: facilities.filter(f => f.locationName === 'Bristol Harbourside Docks').length, col: '#6366F1' },
              { id: 'Surrey Sports & Country Grounds', name: 'Surrey', loc: 'Guildford', x: '54%', y: '75%', count: facilities.filter(f => f.locationName === 'Surrey Sports & Country Grounds').length, col: '#4ADE80' },
            ].map(hub => {
              const isSelected = locationFilter === hub.id;
              return (
                <div
                  key={hub.id}
                  onClick={() => setLocationFilter(isSelected ? 'all' : hub.id)}
                  style={{
                    position: 'absolute',
                    left: hub.x,
                    top: hub.y,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    zIndex: isSelected ? 20 : 10,
                    transition: 'all 0.2s',
                  }}
                  title={`Click to filter by ${hub.name}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: isSelected ? 'rgba(6,182,212,0.25)' : 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', border: `1.5px solid ${isSelected ? 'var(--sf-cyan)' : hub.col}`, padding: '4px 10px', borderRadius: 20, boxShadow: isSelected ? '0 0 16px var(--sf-cyan)' : '0 2px 8px rgba(0,0,0,0.5)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: hub.col, boxShadow: `0 0 8px ${hub.col}` }} />
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: isSelected ? '#fff' : 'var(--sf-text)' }}>{hub.name}</span>
                    <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.12)', padding: '1px 5px', borderRadius: 10, color: 'var(--sf-text-sub)' }}>{hub.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Legend ─── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--sf-text-mute)' }}>
        <span style={{ fontWeight: 600, color: 'var(--sf-text)' }}>Live Availability:</span>
        {[['available', 'Available'], ['setup', 'Setup Buffer'], ['teardown', 'Teardown Buffer'], ['booked', 'Booked'], ['held', 'On Hold'], ['blocked', 'Blocked']].map(([s, l]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: STATE_COLORS[s]?.bg, border: `1px solid ${STATE_COLORS[s]?.border}` }} />
            {l}
          </div>
        ))}
      </div>

      {/* ─── VIEW 1: FACILITY CARDS GRID ─── */}
      {viewMode !== 'list' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map(facility => {
            const isSelected = selectedFacility?.id === facility.id;
            const strip = getAvailStrip(facility);
            const rules = getBufferRules(facility, 'default');

            return (
              <div
                key={facility.id}
                id={`facility-${facility.id}`}
                className={`facility-card ${isSelected ? 'selected' : ''}`}
                onClick={() => { setSelectedFacility(isSelected ? null : facility); setSelection([]); }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s, border-color 0.15s',
                  borderColor: isSelected ? 'var(--sf-violet)' : undefined
                }}
              >
                {/* Card Thumbnail */}
                <div className="facility-thumb" style={{ background: facility.colorGrad, minHeight: 140 }}>
                  <div className="facility-thumb-overlay" />
                  
                  {/* Top Badges: Type & Location */}
                  <div className="facility-thumb-tags" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-violet" style={{ fontSize: 10 }}>{facility.type}</span>
                    {facility.city && (
                      <span className="badge badge-cyan" style={{ fontSize: 10, background: 'rgba(6,182,212,0.3)', backdropFilter: 'blur(4px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <MapPin size={9} /> {facility.city}
                      </span>
                    )}
                  </div>

                  {/* Hourly Rate */}
                  <div style={{ position: 'absolute', top: 10, right: 12, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', padding: '3px 8px', borderRadius: 'var(--r-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                      £{facility.baseHourlyRate}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--sf-text-mute)' }}>/hr</span>
                    </span>
                  </div>
                </div>

                <div className="facility-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Location & Address Tag */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--sf-cyan-lt)', fontWeight: 600, marginBottom: 4 }}>
                    <MapPin size={12} />
                    <span>{facility.locationName || facility.city || 'Central Location'}</span>
                    {facility.areaDistrict && <span style={{ color: 'var(--sf-text-mute)', fontWeight: 400 }}>· {facility.areaDistrict}</span>}
                  </div>

                  <div className="facility-name" style={{ fontSize: 17, marginBottom: 6 }}>
                    {facility.name}
                  </div>

                  {facility.travelHint && (
                    <div style={{ fontSize: 11, color: 'var(--sf-text-mute)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Navigation size={10} style={{ color: 'var(--sf-violet-lt)' }} /> {facility.travelHint}
                    </div>
                  )}

                  {/* Facility Metadata */}
                  <div className="facility-meta" style={{ marginBottom: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={12} /> {facility.capacity.toLocaleString()} cap
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Maximize2 size={12} /> {facility.area}m²
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> min {facility.minBookingHours}h
                    </span>
                  </div>

                  {/* Buffer Protection Banner */}
                  <div style={{ padding: '6px 10px', background: 'rgba(124,58,237,0.08)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(124,58,237,0.2)', marginBottom: 12, fontSize: 11, color: 'var(--sf-violet-lt)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Timer size={12} />
                    <span>Buffers: <strong>{rules.setup}m</strong> setup · <strong>{rules.teardown}m</strong> teardown</span>
                  </div>

                  {/* Amenities Chips (Top 3) */}
                  {(facility.amenities || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
                      {facility.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} style={{ fontSize: 10.5, padding: '2px 7px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 4, color: 'var(--sf-text-sub)' }}>
                          {amenity}
                        </span>
                      ))}
                      {facility.amenities.length > 3 && (
                        <span style={{ fontSize: 10.5, padding: '2px 6px', color: 'var(--sf-text-mute)' }}>
                          +{facility.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Availability Strip */}
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--sf-text-mute)', marginBottom: 4 }}>
                      <span>Today's availability:</span>
                      <span style={{ color: 'var(--sf-emerald-lt)', fontWeight: 600 }}>Real-time</span>
                    </div>
                    <div className="facility-avail-strip" style={{ marginBottom: 12 }}>
                      {strip.map((s, i) => (
                        <div
                          key={i}
                          className="facility-avail-dot"
                          title={`${(facility.openHours?.start ?? 8) + i}:00 — ${s}`}
                          style={{ background: DOT_COL[s] || 'var(--sf-text-faint)', opacity: s === 'blocked' ? 0.3 : 1 }}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ padding: '7px 8px', fontSize: 12, justifyContent: 'center' }}
                        onClick={e => {
                          e.stopPropagation();
                          setQuickBookFacility(facility);
                          setQbDate(dateKey);
                        }}
                      >
                        <Zap size={13} /> Quick Book
                      </button>
                      <button
                        className={`btn btn-sm ${isSelected ? 'btn-danger' : 'btn-secondary'}`}
                        style={{ padding: '7px 8px', fontSize: 12, justifyContent: 'center' }}
                        onClick={e => { e.stopPropagation(); setSelectedFacility(isSelected ? null : facility); setSelection([]); }}
                      >
                        {isSelected ? <><X size={13} /> Close</> : <><Calendar size={13} /> Schedule</>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ─── Expanded Availability Drawer ─── */}
                {isSelected && (
                  <div style={{ borderTop: '1px solid var(--sf-border)', padding: 16, background: 'var(--sf-bg-surface)' }} onClick={e => e.stopPropagation()}>
                    {/* Full Venue Location Header */}
                    <div style={{ padding: '8px 12px', background: 'var(--sf-bg-raised)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-md)', marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: 'var(--sf-text-mute)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Venue Address</div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sf-text)' }}>{facility.address || `${facility.name}, ${facility.city}`}</div>
                      <div style={{ fontSize: 11, color: 'var(--sf-cyan-lt)', marginTop: 2 }}>{facility.travelHint}</div>
                    </div>

                    {/* Date navigator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(d => addDays(d, -7))}><ChevronLeft size={14} /></button>
                      <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
                        {weekDates.map(d => {
                          const dk = toDateKey(d);
                          const isToday = dk === toDateKey(new Date());
                          const isSel = dk === dateKey;
                          return (
                            <button
                              key={dk}
                              onClick={() => { setSelectedDate(d); setSelection([]); }}
                              style={{
                                flex: 1,
                                maxWidth: 42,
                                padding: '5px 2px',
                                borderRadius: 6,
                                border: `1px solid ${isSel ? 'var(--sf-violet)' : 'var(--sf-border)'}`,
                                background: isSel ? 'var(--sf-violet-grad)' : isToday ? 'var(--sf-violet-dim)' : 'transparent',
                                color: isSel ? '#fff' : isToday ? 'var(--sf-violet-lt)' : 'var(--sf-text-mute)',
                                fontSize: 9,
                                cursor: 'pointer',
                                transition: 'all 160ms'
                              }}
                            >
                              <div>{dowShort(d)}</div>
                              <div style={{ fontWeight: 700, fontSize: 11, marginTop: 1 }}>{d.getDate()}</div>
                            </button>
                          );
                        })}
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(d => addDays(d, 7))}><ChevronRight size={14} /></button>
                    </div>

                    <div style={{ fontSize: 11.5, color: 'var(--sf-text-mute)', marginBottom: 10, textAlign: 'center' }}>
                      {fmtDate(selectedDate)}
                      {selection.length > 0 && <span style={{ marginLeft: 8, color: 'var(--sf-violet-lt)', fontWeight: 600 }}>· {selection.length} slot{selection.length > 1 ? 's' : ''} selected</span>}
                    </div>

                    {/* Hourly slot grid */}
                    <div className="avail-grid" id="avail-grid-main">
                      <div className="avail-time-col">
                        {getHourSlots(facility).map(h => (
                          <div key={h} className="avail-time-cell">{String(h).padStart(2,'0')}:00</div>
                        ))}
                      </div>
                      <div className="avail-slot-col">
                        {getHourSlots(facility).map(h => {
                          const stateObj = getSlotStateFull(facility, dateKey, h, bookings);
                          const isHourSelected = selection.includes(h);
                          const effectiveState = isHourSelected ? 'selected' : stateObj.state;
                          const cols = STATE_COLORS[effectiveState] || STATE_COLORS.available;
                          const canSelect = stateObj.state === 'available' || isHourSelected;
                          const label = isHourSelected ? 'Selected ✓' : (SLOT_LABELS[stateObj.state]?.(stateObj.booking || facility.baseHourlyRate) || '—');

                          return (
                            <div
                              key={h}
                              className={`avail-slot ${effectiveState}`}
                              onClick={() => canSelect && toggleHour(h, stateObj)}
                            >
                              <div className="avail-slot-icon" style={{ background: cols.dot }} />
                              <span className="avail-slot-label" style={{ color: cols.text }}>{label}</span>
                              {stateObj.state === 'available' && !isHourSelected && (
                                <span className="avail-slot-price">£{facility.baseHourlyRate}</span>
                              )}
                              {stateObj.bufferMins && (
                                <span className="buffer-badge" style={{ fontSize: 9, padding: '1px 6px', background: stateObj.state === 'setup' ? 'var(--sf-cyan-dim)' : 'var(--sf-amber-dim)', color: stateObj.state === 'setup' ? 'var(--sf-cyan-lt)' : 'var(--sf-amber-lt)', border: 'none' }}>
                                  {stateObj.bufferMins}min
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selection summary & Booking CTA */}
                    {selection.length > 0 && (
                      <div style={{ marginTop: 14, padding: '12px 14px', background: 'var(--sf-violet-dim)', border: '1px solid var(--sf-border-v)', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--sf-violet-lt)', fontSize: 14 }}>
                            {selection.length}h selected · Est. £{(selection.length * facility.baseHourlyRate).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--sf-text-mute)', marginTop: 2 }}>
                            {String(Math.min(...selection)).padStart(2,'0')}:00 – {String(Math.max(...selection)+1).padStart(2,'0')}:00 · Turnaround buffers protected
                          </div>
                        </div>
                        <button className="btn btn-primary" onClick={proceedToBooking}>
                          Book This Space <ChevronRight size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── VIEW 3: COMPACT TABLE LIST ─── */
        <div className="sf-card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--sf-bg-surface)', borderBottom: '1px solid var(--sf-border)', color: 'var(--sf-text-mute)', fontSize: 11.5 }}>
                <th style={{ padding: '12px 16px' }}>Space & Venue</th>
                <th style={{ padding: '12px 16px' }}>Location & Campus</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>Capacity</th>
                <th style={{ padding: '12px 16px' }}>Rate</th>
                <th style={{ padding: '12px 16px' }}>Turnaround Buffers</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const rules = getBufferRules(f, 'default');
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--sf-text)' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>{f.area}m² · min {f.minBookingHours}h</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: 'var(--sf-cyan-lt)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={11} /> {f.locationName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>{f.city} · {f.postcode}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-violet" style={{ fontSize: 10.5 }}>{f.type}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{f.capacity.toLocaleString()} guests</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--sf-violet-lt)' }}>
                      £{f.baseHourlyRate}/hr
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--sf-text-sub)' }}>
                      {rules.setup}m / {rules.teardown}m
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => { setQuickBookFacility(f); setQbDate(dateKey); }}
                        >
                          <Zap size={13} /> Quick Book
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => { setSelectedFacility(f); setViewMode('grid'); }}
                        >
                          Schedule
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--sf-text-mute)' }}>
          <Search size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--sf-text)' }}>No spaces match your filters</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>Try clearing location or capacity filters to explore other venues.</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={resetFilters}>
            Clear All Filters
          </button>
        </div>
      )}

      {/* ─── HIRER QUICK BOOKING MODAL (STREAMLINED & MOBILE OPTIMIZED) ─── */}
      {quickBookFacility && (
        <Modal
          open={!!quickBookFacility}
          onClose={() => setQuickBookFacility(null)}
          title={`Quick Book: ${quickBookFacility.name}`}
          subtitle={`${quickBookFacility.locationName || quickBookFacility.city} · £${quickBookFacility.baseHourlyRate}/hr · Cap: ${quickBookFacility.capacity.toLocaleString()}`}
          size="lg"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Venue Brief Card */}
            <div style={{ padding: '12px 14px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--sf-text)' }}>{quickBookFacility.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--sf-text-sub)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <MapPin size={11} /> {quickBookFacility.address || `${quickBookFacility.locationName}, ${quickBookFacility.city}`}
                </div>
              </div>
              <span className="badge badge-violet" style={{ fontSize: 11 }}>
                {quickBookFacility.type}
              </span>
            </div>

            {/* Date Selection & Quick Date Pills */}
            <div className="sf-field">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <label className="sf-label" style={{ margin: 0 }}>1. Select Date *</label>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    type="button"
                    className="badge badge-cyan"
                    style={{ cursor: 'pointer', border: 'none', padding: '3px 8px', fontSize: 11 }}
                    onClick={() => setQbDate(toDateKey(new Date()))}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="badge badge-violet"
                    style={{ cursor: 'pointer', border: 'none', padding: '3px 8px', fontSize: 11 }}
                    onClick={() => setQbDate(toDateKey(addDays(new Date(), 1)))}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    className="badge badge-amber"
                    style={{ cursor: 'pointer', border: 'none', padding: '3px 8px', fontSize: 11 }}
                    onClick={() => {
                      const sat = addDays(new Date(), (6 - new Date().getDay() + 7) % 7 || 7);
                      setQbDate(toDateKey(sat));
                    }}
                  >
                    This Saturday
                  </button>
                </div>
              </div>
              <input
                type="date"
                className="sf-input"
                value={qbDate}
                min={toDateKey(new Date())}
                onChange={e => setQbDate(e.target.value)}
                required
              />
            </div>

            {/* Time Slot Presets (Mobile Friendly Large Touch Targets) */}
            <div className="sf-field">
              <label className="sf-label">2. Select Time Window</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                {[
                  { id: 'morning', label: 'Morning', time: '09:00 – 13:00', icon: '🌅', hrs: 4 },
                  { id: 'afternoon', label: 'Afternoon', time: '13:00 – 17:00', icon: '☀️', hrs: 4 },
                  { id: 'evening', label: 'Evening', time: '18:00 – 22:00', icon: '🌙', hrs: 4 },
                  { id: 'custom', label: 'Custom Hours', time: `${String(qbStartHour).padStart(2,'0')}:00 + ${qbDuration}h`, icon: '⏱️', hrs: qbDuration },
                ].map(p => {
                  const isSel = qbTimePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setQbTimePreset(p.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--r-md)',
                        border: isSel ? '1.5px solid var(--sf-violet)' : '1px solid var(--sf-border)',
                        background: isSel ? 'var(--sf-violet-dim)' : 'var(--sf-bg-surface)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 150ms'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: isSel ? 'var(--sf-violet-lt)' : 'var(--sf-text)' }}>
                        <span>{p.icon}</span> {p.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--sf-text-mute)', marginTop: 2 }}>{p.time}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Time Config (shown if Custom selected) */}
            {qbTimePreset === 'custom' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: 'var(--sf-bg-surface)', borderRadius: 'var(--r-md)', border: '1px solid var(--sf-border)' }}>
                <div className="sf-field">
                  <label className="sf-label" style={{ fontSize: 11 }}>Start Time</label>
                  <select
                    className="sf-select sf-input-sm"
                    value={qbStartHour}
                    onChange={e => setQbStartHour(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 16 }, (_, i) => i + 7).map(h => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </div>
                <div className="sf-field">
                  <label className="sf-label" style={{ fontSize: 11 }}>Duration</label>
                  <select
                    className="sf-select sf-input-sm"
                    value={qbDuration}
                    onChange={e => setQbDuration(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(hrs => (
                      <option key={hrs} value={hrs}>{hrs} {hrs === 1 ? 'hour' : 'hours'}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Availability & Buffer Status Feedback Card */}
            <div style={{ padding: '12px 14px', borderRadius: 'var(--r-md)', border: qbHasConflict ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)', background: qbHasConflict ? 'rgba(239,68,68,0.06)' : 'rgba(16,185,129,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: qbHasConflict ? 'var(--sf-red-lt)' : 'var(--sf-emerald-lt)' }}>
                  {qbHasConflict ? (
                    <><AlertCircle size={14} /> Conflicting booking during this time slot</>
                  ) : (
                    <><CheckCircle2 size={14} /> Available: {String(qbEffStart).padStart(2,'0')}:00 – {String(qbEndHour).padStart(2,'0')}:00</>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--sf-text-mute)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Zap size={11} style={{ color: 'var(--sf-cyan)' }} /> Turnaround buffers protected
                </div>
              </div>
            </div>

            {/* Pricing Summary */}
            <div style={{ padding: '12px 14px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="sf-label" style={{ margin: 0, fontSize: 11 }}>Estimated Hire Cost</span>
                <div style={{ fontSize: 11.5, color: 'var(--sf-text-mute)' }}>
                  {qbEffDuration} hrs × £{quickBookFacility.baseHourlyRate}/hr
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--sf-violet-lt)' }}>
                £{(qbEffDuration * quickBookFacility.baseHourlyRate).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Sticky Modal Action Footer */}
          <div className="sf-modal-footer" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setQuickBookFacility(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={qbHasConflict}
              onClick={handleQuickBookProceed}
            >
              Proceed to Event Details <ChevronRight size={14} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
