import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Check, Users, Clock, Plus, Minus, Info, Zap, Timer } from 'lucide-react';
import { useApp, calculatePrice, getBufferRules } from '../../store/SpaceFlowContext.jsx';
import { useDemo } from '../../store/DemoContext.jsx';

const ADD_ONS = [
  { id: 'catering', name: 'In-House Catering', desc: 'Full catering service per head', price: 2800, perHead: true, category: 'Food & Drink' },
  { id: 'bar', name: 'Premium Bar Package', desc: 'Unlimited drinks service', price: 800, category: 'Food & Drink' },
  { id: 'coffee', name: 'Tea & Coffee Station', desc: 'All-day refreshments', price: 180, category: 'Food & Drink' },
  { id: 'av', name: 'Full AV Package', desc: 'Microphones, projector, screens', price: 600, category: 'Technology' },
  { id: 'streaming', name: 'Live Streaming Setup', desc: 'Professional stream to any platform', price: 400, category: 'Technology' },
  { id: 'security', name: 'Security Staff', desc: 'Professional security personnel (per shift)', price: 360, category: 'Staffing' },
  { id: 'coord', name: 'Event Coordinator', desc: 'Dedicated on-site coordinator', price: 450, category: 'Staffing' },
  { id: 'flowers', name: 'Floral Decoration', desc: 'Bespoke floral arrangements', price: 1200, category: 'Decor' },
  { id: 'lighting', name: 'Uplighting Package', desc: 'Ambient uplighting in your colours', price: 350, category: 'Decor' },
];

const EVENT_TYPE_MULTIPLIERS = {
  Wedding: 1.5, Gala: 1.4, Exhibition: 1.3, Reception: 1.2, 'Product Launch': 1.25,
  Conference: 1.1, Match: 1.2, Tournament: 1.3, Filming: 1.15, Party: 1.1,
  Meeting: 1.0, Training: 0.95, Workshop: 0.95, Practice: 0.85, Interview: 0.9,
  'Coaching Session': 0.9, 'Community Event': 1.0, Networking: 1.0, Photoshoot: 1.0, 'Brand Shoot': 1.1, 'Content Creation': 0.95,
};

const STEPS = ['Review Selection', 'Event Details', 'Add-ons', 'Summary'];

export default function BookingFlowPage() {
  const { pendingBooking, setPendingBooking, session, settings, showToast } = useApp();
  const { demoTriggers, setDemoTriggers } = useDemo();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [eventType, setEventType] = useState('');
  const [attendees, setAttendees] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAddOns, setSelectedAddOns] = useState([]);

  useEffect(() => {
    if (!pendingBooking) navigate('/app/book');
  }, [pendingBooking]);

  // Demo triggers
  useEffect(() => {
    if (demoTriggers.setEventType) { setEventType(demoTriggers.setEventType); setDemoTriggers(t => ({ ...t, setEventType: null })); }
    if (demoTriggers.setAttendees) { setAttendees(String(demoTriggers.setAttendees)); setDemoTriggers(t => ({ ...t, setAttendees: null })); }
    if (demoTriggers.addAddOns) {
      setSelectedAddOns([ADD_ONS.find(a => a.id === 'catering'), ADD_ONS.find(a => a.id === 'av')].filter(Boolean));
      setStep(2);
      setDemoTriggers(t => ({ ...t, addAddOns: null }));
    }
  }, [demoTriggers]);

  const facility = pendingBooking?.facility;
  const bufferRules = facility && eventType ? getBufferRules(facility, eventType) : { setup: facility?.bufferRules?.default?.setup ?? 60, teardown: facility?.bufferRules?.default?.teardown ?? 60 };

  const pricing = useMemo(() => {
    if (!facility || !pendingBooking) return null;
    return calculatePrice(facility, {
      durationHours: pendingBooking.durationHours,
      eventType,
      date: pendingBooking.date,
      addOns: selectedAddOns,
      settings,
    });
  }, [facility, pendingBooking, eventType, selectedAddOns, settings]);

  if (!pendingBooking || !facility) return null;

  function toggleAddOn(addon) {
    setSelectedAddOns(s => s.some(a => a.id === addon.id) ? s.filter(a => a.id !== addon.id) : [...s, addon]);
  }

  function proceedToCheckout() {
    if (!eventType || !attendees) { showToast('Please fill in event type and attendees', 'warn'); return; }
    setPendingBooking(b => ({ ...b, eventType, attendees: parseInt(attendees), notes, addOns: selectedAddOns, pricing }));
    navigate('/app/checkout');
  }

  const grouped = ADD_ONS.reduce((acc, a) => { if (!acc[a.category]) acc[a.category] = []; acc[a.category].push(a); return acc; }, {});

  const fmtDate = (dk) => {
    const [y,m,d] = dk.split('-').map(Number);
    return new Date(y,m-1,d).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Book {facility.name}</h1>
        <p className="page-subtitle">{fmtDate(pendingBooking.date)} · {String(pendingBooking.startHour).padStart(2,'0')}:00 – {String(pendingBooking.startHour + pendingBooking.durationHours).padStart(2,'0')}:00</p>
      </div>

      {/* Stepper */}
      <div className="wizard-stepper">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div className="wizard-step" style={{ flex: i < STEPS.length - 1 ? '1 1 0%' : 'none' }}>
              <div className={`wizard-step-num ${i < step ? 'done' : i === step ? 'active' : 'inactive'}`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`wizard-step-label ${i === step ? 'active' : 'inactive'}`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`wizard-connector ${i < step ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ─── Step 0: Review Selection ─── */}
      {step === 0 && (
        <div className="sf-card" style={{ animation: 'fadeUp 0.3s ease' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-display)' }}>Review your selection</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: 'Facility', value: facility.name },
              { label: 'Location & Campus', value: `${facility.locationName || facility.city} (${facility.city})` },
              { label: 'Address', value: facility.address || `${facility.name}, ${facility.city}` },
              { label: 'Type', value: facility.type },
              { label: 'Date', value: fmtDate(pendingBooking.date) },
              { label: 'Time', value: `${String(pendingBooking.startHour).padStart(2,'0')}:00 – ${String(pendingBooking.startHour + pendingBooking.durationHours).padStart(2,'0')}:00` },
              { label: 'Duration', value: `${pendingBooking.durationHours} hour${pendingBooking.durationHours > 1 ? 's' : ''}` },
              { label: 'Capacity', value: `${facility.capacity.toLocaleString()} max` },
            ].map(row => (
              <div key={row.label}>
                <div className="sf-label">{row.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--sf-text)' }}>{row.value}</div>
              </div>
            ))}
          </div>

          {/* Buffer info preview */}
          <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--sf-cyan-dim)', border: '1px solid var(--sf-border-c)', borderRadius: 'var(--r-lg)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--sf-cyan-lt)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={14} /> Buffer times are calculated automatically
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--sf-text-sub)', lineHeight: 1.6 }}>
              Based on the event type you select, buffer slots will be reserved before and after your booking at no extra charge. Adjacent slots will appear as "buffer" in the availability grid.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/app/book')}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(1)}>Continue to Event Details <ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* ─── Step 1: Event Details ─── */}
      {step === 1 && (
        <div className="sf-card" style={{ animation: 'fadeUp 0.3s ease' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-display)' }}>Event details</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="sf-field" id="event-type-section">
              <label className="sf-label">Event type *</label>
              <select id="event-type-select" className="sf-select sf-select" value={eventType} onChange={e => setEventType(e.target.value)} required>
                <option value="">Select event type…</option>
                {facility.eventTypes.map(t => (
                  <option key={t} value={t}>{t} {EVENT_TYPE_MULTIPLIERS[t] && EVENT_TYPE_MULTIPLIERS[t] !== 1 ? `(${EVENT_TYPE_MULTIPLIERS[t] > 1 ? '+' : ''}${Math.round((EVENT_TYPE_MULTIPLIERS[t]-1)*100)}%)` : ''}</option>
                ))}
              </select>

              {/* Quick Event Type Chips for Fast Mobile Tap */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {facility.eventTypes.map(t => {
                  const isSel = eventType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEventType(t)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--r-pill)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        border: isSel ? '1px solid var(--sf-violet)' : '1px solid var(--sf-border)',
                        background: isSel ? 'var(--sf-violet-dim)' : 'transparent',
                        color: isSel ? 'var(--sf-violet-lt)' : 'var(--sf-text-sub)',
                        cursor: 'pointer'
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic buffer preview */}
            {eventType && (
              <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}>
                  <Zap size={13} style={{ color: 'var(--sf-cyan)' }} />
                  <span style={{ color: 'var(--sf-text-mute)' }}>Buffer for {eventType}:</span>
                </div>
                <span className="buffer-badge buffer-badge-setup">{bufferRules.setup}min setup</span>
                <span className="buffer-badge buffer-badge-teardown">{bufferRules.teardown}min teardown</span>
              </div>
            )}

            <div className="sf-field">
              <label className="sf-label">Number of attendees *</label>
              <div style={{ position: 'relative' }}>
                <Users size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--sf-text-mute)' }} />
                <input className="sf-input" type="number" value={attendees} onChange={e => setAttendees(e.target.value)} placeholder="Expected number of guests" min={1} max={facility.capacity} style={{ paddingLeft: 36 }} required />
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--sf-text-mute)' }}>Maximum capacity: {facility.capacity.toLocaleString()}</span>
            </div>

            <div className="sf-field">
              <label className="sf-label">Special requirements</label>
              <textarea className="sf-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requests, setup instructions, accessibility needs…" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => setStep(0)}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { if (!eventType || !attendees) { showToast('Please fill in all required fields', 'warn'); return; } setStep(2); }}>
              Continue to Add-ons <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Add-ons ─── */}
      {step === 2 && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div className="sf-card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, fontFamily: 'var(--font-display)' }}>Enhance your event</h3>
            <p style={{ fontSize: 13.5, color: 'var(--sf-text-mute)' }}>All add-ons are optional. Prices shown are per booking.</p>
          </div>

          <div id="addons-section">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sf-text-mute)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>{cat}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                  {items.map(addon => {
                    const isSelected = selectedAddOns.some(a => a.id === addon.id);
                    return (
                      <div key={addon.id}
                        onClick={() => toggleAddOn(addon)}
                        style={{ padding: '14px 16px', borderRadius: 'var(--r-lg)', border: `1px solid ${isSelected ? 'var(--sf-violet)' : 'var(--sf-border)'}`, background: isSelected ? 'var(--sf-violet-dim)' : 'var(--sf-bg-card)', cursor: 'pointer', transition: 'all 160ms' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: isSelected ? 'var(--sf-violet-lt)' : 'var(--sf-text)', marginBottom: 3 }}>{addon.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--sf-text-mute)', lineHeight: 1.5 }}>{addon.desc}</div>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {isSelected
                              ? <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--sf-violet-grad)', display:'flex', alignItems:'center', justifyContent:'center' }}><Check size={11} color="#fff" /></div>
                              : <div style={{ width:20, height:20, borderRadius:'50%', border:'1px solid var(--sf-border-hi)' }} />
                            }
                          </div>
                        </div>
                        <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--sf-violet-lt)' : 'var(--sf-emerald)' }}>
                          £{addon.price.toLocaleString()}
                          {addon.perHead && <span style={{ fontSize: 10, fontWeight: 400 }}> base</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedAddOns.length > 0 && (
            <div style={{ padding: '12px 16px', background: 'var(--sf-emerald-dim)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--r-lg)', marginBottom: 16, fontSize: 13.5, color: 'var(--sf-emerald-lt)' }}>
              {selectedAddOns.length} add-on{selectedAddOns.length > 1 ? 's' : ''} selected — +£{selectedAddOns.reduce((s, a) => s + a.price, 0).toLocaleString()}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)}>Review Summary <ChevronRight size={15} /></button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Summary ─── */}
      {step === 3 && pricing && (
        <div style={{ animation: 'fadeUp 0.3s ease' }}>
          <div className="sf-card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-display)' }}>Booking summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div className="price-line">
                <span style={{ color: 'var(--sf-text-sub)' }}>Base rate ({pendingBooking.durationHours}h × £{facility.baseHourlyRate})</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>£{(facility.baseHourlyRate * pendingBooking.durationHours).toLocaleString()}</span>
              </div>
              {eventType && EVENT_TYPE_MULTIPLIERS[eventType] && EVENT_TYPE_MULTIPLIERS[eventType] !== 1 && (
                <div className="price-line">
                  <span style={{ color: 'var(--sf-text-sub)' }}>{eventType} rate multiplier</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--sf-amber)' }}>×{EVENT_TYPE_MULTIPLIERS[eventType]}</span>
                </div>
              )}
              {selectedAddOns.map(a => (
                <div key={a.id} className="price-line">
                  <span style={{ color: 'var(--sf-text-sub)' }}>{a.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>£{a.price.toLocaleString()}</span>
                </div>
              ))}
              {pricing.discount > 0 && (
                <div className="price-line">
                  <span style={{ color: 'var(--sf-emerald)' }}>Discount ({Math.round(pricing.discount * 100)}%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--sf-emerald)' }}>-£{Math.round(pricing.base * pricing.discount).toLocaleString()}</span>
                </div>
              )}
              {pricing.tax > 0 && (
                <div className="price-line">
                  <span style={{ color: 'var(--sf-text-sub)' }}>VAT ({settings.taxRate}%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>£{pricing.tax.toLocaleString()}</span>
                </div>
              )}
              <div className="price-total">
                <span>Total</span>
                <span style={{ fontFamily: 'var(--font-mono)', background: 'linear-gradient(135deg, #A78BFA, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  £{pricing.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Buffer summary */}
          <div style={{ padding: '14px 16px', background: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-lg)', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Zap size={18} style={{ color: 'var(--sf-cyan)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Buffer time included</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="buffer-badge buffer-badge-setup">{bufferRules.setup}min setup</span>
                <span className="buffer-badge buffer-badge-teardown">{bufferRules.teardown}min teardown</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--sf-text-mute)', textAlign: 'right' }}>No extra charge</div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={proceedToCheckout}>
              Proceed to Payment <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
