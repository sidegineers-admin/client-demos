import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Mail, Phone, ShieldCheck, Wrench, Sparkles, AlertCircle, X, Check, FileText, MapPin, ChevronRight, ChevronLeft, Zap } from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';
import Modal from '../ui/Modal.jsx';

export default function AdminDirectBookingModal({ open, onClose, initialFacilityId, initialDate, initialStartHour }) {
  const { facilities, createBooking, showToast, calculatePrice, getBufferRules, settings } = useApp();

  const [step, setStep] = useState(0); // 0 = Space & Schedule, 1 = Client & Settlement
  const [facilityId, setFacilityId] = useState(initialFacilityId || (facilities[0]?.id || ''));
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [startHour, setStartHour] = useState(initialStartHour ?? 10);
  const [durationHours, setDurationHours] = useState(3);
  const [eventType, setEventType] = useState('Meeting');
  const [attendees, setAttendees] = useState(25);

  // Hirer info
  const [hirerName, setHirerName] = useState('Walk-in Client');
  const [hirerEmail, setHirerEmail] = useState('client@example.com');
  const [hirerPhone, setHirerPhone] = useState('07700900999');
  const [notes, setNotes] = useState('');

  // Payment & Buffers
  const [paymentMode, setPaymentMode] = useState('auto'); // auto | manual | complimentary
  const [paymentStatus, setPaymentStatus] = useState('paid'); // paid | invoiced | pending | waived
  const [enablePreAuth, setEnablePreAuth] = useState(false);
  const [preAuthAmount, setPreAuthAmount] = useState(250);
  const [autoApprove, setAutoApprove] = useState(true);

  // Custom buffer override
  const [overrideBuffers, setOverrideBuffers] = useState(false);
  const [customSetupMins, setCustomSetupMins] = useState(30);
  const [customTeardownMins, setCustomTeardownMins] = useState(30);

  // Price override
  const [overridePrice, setOverridePrice] = useState(false);
  const [customPrice, setCustomPrice] = useState(0);

  const selectedFacility = facilities.find(f => f.id === facilityId) || facilities[0];

  useEffect(() => {
    if (initialFacilityId) setFacilityId(initialFacilityId);
    if (initialDate) setDate(initialDate);
    if (initialStartHour !== undefined && initialStartHour !== null) setStartHour(initialStartHour);
  }, [initialFacilityId, initialDate, initialStartHour]);

  useEffect(() => {
    if (selectedFacility) {
      if (selectedFacility.preAuthAmount) setPreAuthAmount(selectedFacility.preAuthAmount);
      if (selectedFacility.eventTypes?.length) {
        if (!isMaintenance && !selectedFacility.eventTypes.includes(eventType)) {
          setEventType(selectedFacility.eventTypes[0]);
        }
      }
    }
  }, [facilityId, selectedFacility, isMaintenance]);

  // Buffer calculation
  const bufferRules = selectedFacility ? getBufferRules(selectedFacility, eventType) : { setup: 30, teardown: 30 };
  const effectiveSetup = overrideBuffers ? customSetupMins : (isMaintenance ? 0 : bufferRules.setup);
  const effectiveTeardown = overrideBuffers ? customTeardownMins : (isMaintenance ? 0 : bufferRules.teardown);

  // Price calculation
  const calculated = selectedFacility ? calculatePrice(selectedFacility, {
    durationHours,
    eventType: isMaintenance ? 'Maintenance' : eventType,
    date,
    settings: settings || {}
  }) : { subtotal: 0, tax: 0, total: 0 };

  const finalTotal = isMaintenance ? 0 : (overridePrice ? parseFloat(customPrice) || 0 : calculated.total);

  // Quick Preset Handlers
  function applyPreset(presetType) {
    if (presetType === 'walkin') {
      setIsMaintenance(false);
      setHirerName('Walk-in Customer');
      setHirerEmail('walkin@venue.internal');
      setPaymentMode('auto');
      setPaymentStatus('paid');
      setAutoApprove(true);
      showToast('Applied Walk-in Preset (Card / Paid)', 'info', 2000);
    } else if (presetType === 'phone') {
      setIsMaintenance(false);
      setHirerName('Phone Reservation');
      setHirerEmail('phone-booking@venue.internal');
      setPaymentMode('manual');
      setPaymentStatus('invoiced');
      setAutoApprove(true);
      showToast('Applied Phone Reservation (Invoiced)', 'info', 2000);
    } else if (presetType === 'clean') {
      setIsMaintenance(true);
      setDurationHours(2);
      setNotes('Facility deep sanitisation and floor polish.');
      showToast('Applied Deep Clean Block', 'info', 2000);
    } else if (presetType === 'hvac') {
      setIsMaintenance(true);
      setDurationHours(3);
      setNotes('HVAC, filters & electrical maintenance.');
      showToast('Applied HVAC Service Block', 'info', 2000);
    }
  }

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    if (!selectedFacility) return;

    const bookingData = {
      facilityId: selectedFacility.id,
      facilityName: selectedFacility.name,
      date,
      startHour: parseInt(startHour),
      durationHours: parseInt(durationHours),
      eventType: isMaintenance ? 'Maintenance / Service' : eventType,
      hirerName: isMaintenance ? 'Internal Facilities Team' : (hirerName || 'Direct Booking'),
      hirerEmail: isMaintenance ? 'facilities@spaceflow.internal' : (hirerEmail || 'admin@spaceflow.com'),
      hirerPhone: isMaintenance ? '' : hirerPhone,
      attendees: isMaintenance ? 0 : (parseInt(attendees) || 1),
      notes: notes || (isMaintenance ? 'Facility maintenance/service block.' : 'Direct booking created by Admin.'),
      addOns: [],
      status: autoApprove ? 'confirmed' : 'pending_approval',
      paymentMode: isMaintenance ? 'complimentary' : paymentMode,
      paymentStatus: isMaintenance ? 'waived' : paymentStatus,
      isMaintenance,
      preAuthHold: {
        enabled: enablePreAuth && !isMaintenance,
        amount: enablePreAuth ? preAuthAmount : 0,
        status: enablePreAuth ? 'held' : 'none',
        expiresAt: enablePreAuth ? Date.now() + 86400000 * 7 : null
      },
      bufferOverride: overrideBuffers ? { setup: customSetupMins, teardown: customTeardownMins } : null,
      baseAmount: calculated.base || 0,
      addOnTotal: 0,
      discount: 0,
      totalAmount: finalTotal,
      invoiceId: paymentMode === 'manual' ? `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` : null,
      confirmedAt: autoApprove ? Date.now() : null,
      userId: 'admin',
    };

    await createBooking(bookingData);
    showToast(isMaintenance ? '🔧 Maintenance block scheduled' : '✅ Direct booking confirmed!', 'ok');
    setStep(0);
    onClose();
  }

  const durationPresets = [1, 2, 3, 4, 6, 8];

  return (
    <Modal
      open={open}
      onClose={() => { setStep(0); onClose(); }}
      title={isMaintenance ? "Schedule Maintenance Block" : "Create Direct Booking"}
      subtitle={selectedFacility ? `${selectedFacility.name} · ${selectedFacility.locationName || selectedFacility.city}` : 'Fast venue reservation'}
      size="lg"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Top Segmented Mode Bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: 'var(--sf-bg-surface)', padding: 4, borderRadius: 'var(--r-lg)', border: '1px solid var(--sf-border)' }}>
          <button
            type="button"
            className={`btn btn-full ${!isMaintenance ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: 13, padding: '7px 10px', gap: 6 }}
            onClick={() => { setIsMaintenance(false); setEventType('Meeting'); }}
          >
            <User size={14} /> Client / Event Booking
          </button>
          <button
            type="button"
            className={`btn btn-full ${isMaintenance ? 'btn-amber' : 'btn-ghost'}`}
            style={{ fontSize: 13, padding: '7px 10px', gap: 6 }}
            onClick={() => { setIsMaintenance(true); setEventType('Maintenance / Service'); }}
          >
            <Wrench size={14} /> Maintenance Block
          </button>
        </div>

        {/* Quick Presets Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--sf-text-mute)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
            Presets:
          </span>
          {!isMaintenance ? (
            <>
              <button type="button" onClick={() => applyPreset('walkin')} className="badge badge-cyan" style={{ cursor: 'pointer', border: 'none', padding: '4px 10px', fontSize: 11.5 }}>
                ⚡ Walk-in (Paid Card)
              </button>
              <button type="button" onClick={() => applyPreset('phone')} className="badge badge-violet" style={{ cursor: 'pointer', border: 'none', padding: '4px 10px', fontSize: 11.5 }}>
                📞 Phone (Invoiced)
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => applyPreset('clean')} className="badge badge-amber" style={{ cursor: 'pointer', border: 'none', padding: '4px 10px', fontSize: 11.5 }}>
                🧹 Deep Clean (2h)
              </button>
              <button type="button" onClick={() => applyPreset('hvac')} className="badge badge-gray" style={{ cursor: 'pointer', border: 'none', padding: '4px 10px', fontSize: 11.5 }}>
                ⚙️ HVAC Service (3h)
              </button>
            </>
          )}
        </div>

        {/* Multi-step Header for Client Bookings */}
        {!isMaintenance && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--sf-border)', marginBottom: 18, gap: 16 }}>
            <button
              type="button"
              onClick={() => setStep(0)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0 10px 0',
                borderBottom: step === 0 ? '2px solid var(--sf-violet)' : '2px solid transparent',
                color: step === 0 ? 'var(--sf-violet-lt)' : 'var(--sf-text-mute)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: step === 0 ? 'var(--sf-violet)' : 'var(--sf-bg-surface)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>1</span>
              Space & Time
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0 10px 0',
                borderBottom: step === 1 ? '2px solid var(--sf-violet)' : '2px solid transparent',
                color: step === 1 ? 'var(--sf-violet-lt)' : 'var(--sf-text-mute)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: step === 1 ? 'var(--sf-violet)' : 'var(--sf-bg-surface)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>2</span>
              Client & Settlement
            </button>
          </div>
        )}

        {/* STEP 0: Space & Schedule (Always shown for Maintenance) */}
        {(step === 0 || isMaintenance) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Facility Selector */}
            <div className="sf-field">
              <label className="sf-label">Select Facility / Space *</label>
              <select
                className="sf-select"
                value={facilityId}
                onChange={e => setFacilityId(e.target.value)}
                required
              >
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {f.locationName || f.city} ({f.type})
                  </option>
                ))}
              </select>
              {selectedFacility && (
                <div style={{ fontSize: 11.5, color: 'var(--sf-cyan-lt)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <MapPin size={12} /> {selectedFacility.address || `${selectedFacility.locationName}, ${selectedFacility.city}`}
                </div>
              )}
            </div>

            {/* Date and Time Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div className="sf-field">
                <label className="sf-label">Booking Date *</label>
                <input
                  type="date"
                  className="sf-input"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="sf-field">
                <label className="sf-label">Start Time *</label>
                <select
                  className="sf-select"
                  value={startHour}
                  onChange={e => setStartHour(parseInt(e.target.value))}
                >
                  {Array.from({ length: 16 }, (_, i) => i + 7).map(h => (
                    <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>

              <div className="sf-field">
                <label className="sf-label">Duration *</label>
                <select
                  className="sf-select"
                  value={durationHours}
                  onChange={e => setDurationHours(parseInt(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(hrs => (
                    <option key={hrs} value={hrs}>{hrs} {hrs === 1 ? 'hour' : 'hours'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Duration Preset Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>Quick Duration:</span>
              {durationPresets.map(hrs => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => setDurationHours(hrs)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--r-sm)',
                    fontSize: 12,
                    fontWeight: 600,
                    border: durationHours === hrs ? '1px solid var(--sf-violet)' : '1px solid var(--sf-border)',
                    background: durationHours === hrs ? 'var(--sf-violet-dim)' : 'transparent',
                    color: durationHours === hrs ? 'var(--sf-violet-lt)' : 'var(--sf-text-sub)',
                    cursor: 'pointer'
                  }}
                >
                  {hrs}h
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--sf-text-sub)', fontFamily: 'var(--font-mono)' }}>
                Ends: {String(startHour + durationHours).padStart(2, '0')}:00
              </span>
            </div>

            {/* Turnaround Buffer Protection Card */}
            <div style={{ padding: '12px 14px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--sf-violet-lt)' }}>
                  <Clock size={13} /> Turnaround Buffer Protection
                </div>
                <button
                  type="button"
                  onClick={() => setOverrideBuffers(o => !o)}
                  style={{ background: 'none', border: 'none', color: 'var(--sf-cyan-lt)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {overrideBuffers ? 'Use auto buffer rules' : 'Override buffers'}
                </button>
              </div>

              {!overrideBuffers ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--sf-text-sub)', flexWrap: 'wrap' }}>
                  <span>Setup: <strong style={{ color: 'var(--sf-cyan-lt)' }}>{effectiveSetup} min</strong></span>
                  <span>•</span>
                  <span>Teardown: <strong style={{ color: 'var(--sf-amber-lt)' }}>{effectiveTeardown} min</strong></span>
                  <span style={{ color: 'var(--sf-text-mute)', marginLeft: 'auto' }}>
                    Total slot blocked: {(durationHours * 60 + effectiveSetup + effectiveTeardown) / 60}h
                  </span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--sf-cyan-lt)', display: 'block', marginBottom: 2 }}>Setup (mins)</label>
                    <input
                      type="number"
                      className="sf-input sf-input-sm"
                      step="15"
                      min="0"
                      max="180"
                      value={customSetupMins}
                      onChange={e => setCustomSetupMins(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--sf-amber-lt)', display: 'block', marginBottom: 2 }}>Teardown (mins)</label>
                    <input
                      type="number"
                      className="sf-input sf-input-sm"
                      step="15"
                      min="0"
                      max="180"
                      value={customTeardownMins}
                      onChange={e => setCustomTeardownMins(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Maintenance Specific Description */}
            {isMaintenance && (
              <div className="sf-field">
                <label className="sf-label">Maintenance Notes & Instructions *</label>
                <textarea
                  className="sf-textarea"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Floor polishing, deep HVAC filter replacement, pitch aeration..."
                  rows={3}
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Client & Settlement (Only for Client Bookings) */}
        {!isMaintenance && step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Event Type & Attendees */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="sf-field">
                <label className="sf-label">Event Type *</label>
                <select
                  className="sf-select"
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                >
                  {(selectedFacility?.eventTypes || ['Meeting', 'Conference', 'Party', 'Wedding', 'Match']).map(et => (
                    <option key={et} value={et}>{et}</option>
                  ))}
                </select>
              </div>

              <div className="sf-field">
                <label className="sf-label">Expected Attendees</label>
                <input
                  type="number"
                  className="sf-input"
                  value={attendees}
                  min="1"
                  max={selectedFacility?.capacity || 1000}
                  onChange={e => setAttendees(e.target.value)}
                />
              </div>
            </div>

            {/* Hirer Contact Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <div className="sf-field">
                <label className="sf-label">Client Name *</label>
                <input
                  className="sf-input"
                  value={hirerName}
                  onChange={e => setHirerName(e.target.value)}
                  placeholder="Acme Corp / Jane Doe"
                  required
                />
              </div>
              <div className="sf-field">
                <label className="sf-label">Client Email *</label>
                <input
                  type="email"
                  className="sf-input"
                  value={hirerEmail}
                  onChange={e => setHirerEmail(e.target.value)}
                  placeholder="client@example.com"
                  required
                />
              </div>
              <div className="sf-field">
                <label className="sf-label">Phone</label>
                <input
                  className="sf-input"
                  value={hirerPhone}
                  onChange={e => setHirerPhone(e.target.value)}
                  placeholder="07700 900000"
                />
              </div>
            </div>

            {/* Pricing & Settlement Card */}
            <div style={{ padding: 14, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span className="sf-label" style={{ margin: 0 }}>Fee & Settlement</span>
                <button
                  type="button"
                  onClick={() => setOverridePrice(o => !o)}
                  style={{ background: 'none', border: 'none', color: 'var(--sf-cyan-lt)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {overridePrice ? 'Auto calculate' : 'Override fee'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  {!overridePrice ? (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700, color: 'var(--sf-violet-lt)' }}>
                      £{calculated.total?.toLocaleString()}
                      <span style={{ fontSize: 12, color: 'var(--sf-text-mute)', fontWeight: 400, marginLeft: 6 }}>(inc. VAT)</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--sf-text-mute)', fontWeight: 600 }}>£</span>
                      <input
                        type="number"
                        className="sf-input sf-input-sm"
                        style={{ width: 120 }}
                        value={customPrice}
                        onChange={e => setCustomPrice(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="sf-select sf-input-sm"
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                  >
                    <option value="auto">Card on file</option>
                    <option value="manual">Send invoice</option>
                    <option value="complimentary">Free / Comp</option>
                  </select>
                  <select
                    className="sf-select sf-input-sm"
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value)}
                  >
                    <option value="paid">Paid</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Approval & Security checkboxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 10, borderTop: '1px solid var(--sf-border)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoApprove}
                    onChange={e => setAutoApprove(e.target.checked)}
                  />
                  <span>Auto-confirm booking</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enablePreAuth}
                    onChange={e => setEnablePreAuth(e.target.checked)}
                  />
                  <span>Hold £{preAuthAmount} security pre-auth</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="sf-field">
              <label className="sf-label">Notes (Optional)</label>
              <input
                className="sf-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. VIP client requested AV projector setup..."
              />
            </div>
          </div>
        )}

        {/* Sticky Modal Action Footer */}
        <div className="sf-modal-footer" style={{ marginTop: 'auto', paddingTop: 16 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (!isMaintenance && step === 1) {
                setStep(0);
              } else {
                setStep(0);
                onClose();
              }
            }}
          >
            {!isMaintenance && step === 1 ? <><ChevronLeft size={14} /> Back to Schedule</> : 'Cancel'}
          </button>

          {!isMaintenance && step === 0 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(1)}
            >
              Next: Client Details <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="submit"
              className={`btn ${isMaintenance ? 'btn-amber' : 'btn-primary'}`}
            >
              {isMaintenance ? (
                <><Wrench size={14} /> Schedule Maintenance Block</>
              ) : (
                <><Check size={14} /> Confirm & Reserve Space</>
              )}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
