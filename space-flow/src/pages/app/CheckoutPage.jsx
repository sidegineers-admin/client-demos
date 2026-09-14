import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Building2, ShieldCheck, Clock, AlertTriangle, Check, Lock, ChevronRight, Info } from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';
import { useDemo } from '../../store/DemoContext.jsx';
import { uid } from '../../store/storage.js';

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

export default function CheckoutPage() {
  const { pendingBooking, setPendingBooking, session, settings, createBooking, showToast } = useApp();
  const { demoTriggers, setDemoTriggers } = useDemo();
  const navigate = useNavigate();

  const [paymentMode, setPaymentMode] = useState('auto'); // 'auto' | 'manual'
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [preAuthEnabled, setPreAuthEnabled] = useState(false);
  const [preAuthAmount, setPreAuthAmount] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!pendingBooking) navigate('/app/book');
    else setPreAuthAmount(pendingBooking.facility?.preAuthAmount ?? 500);
  }, [pendingBooking]);

  // Demo trigger: enable pre-auth
  useEffect(() => {
    if (demoTriggers.enablePreAuth) {
      setPreAuthEnabled(true);
      setDemoTriggers(t => ({ ...t, enablePreAuth: null }));
    }
  }, [demoTriggers.enablePreAuth]);

  if (!pendingBooking) return null;
  const { facility, pricing, date, startHour, durationHours, eventType, attendees, addOns = [], notes } = pendingBooking;

  const confirmationMode = settings.confirmationMode ?? 'manual';

  async function handleSubmit(e) {
    e.preventDefault();
    if (paymentMode === 'auto') {
      if (!cardNumber || !cardExpiry || !cardCvc || !cardName) {
        showToast('Please fill in all card details', 'warn'); return;
      }
    }

    setBusy(true);
    await new Promise(r => setTimeout(r, 1800)); // simulate API

    const bookingData = {
      facilityId: facility.id,
      facilityName: facility.name,
      date,
      startHour,
      durationHours,
      eventType: eventType || 'General',
      hirerName: session.name,
      hirerEmail: session.email,
      hirerPhone: '',
      attendees: parseInt(attendees) || 0,
      notes,
      addOns,
      status: confirmationMode === 'auto' ? 'confirmed' : 'pending_approval',
      paymentMode,
      paymentStatus: paymentMode === 'auto' ? 'paid' : 'pending',
      preAuthHold: preAuthEnabled
        ? { enabled: true, amount: preAuthAmount, expiresAt: Date.now() + 86400000 * (settings.defaultPreAuthDays ?? 7), status: 'held' }
        : { enabled: false },
      baseAmount: pricing?.base ?? 0,
      addOnTotal: pricing?.addOnTotal ?? 0,
      discount: pricing?.discount ?? 0,
      totalAmount: pricing?.total ?? 0,
      invoiceId: paymentMode === 'manual' ? `INV-2026-${String(Date.now()).slice(-4)}` : null,
      confirmedAt: confirmationMode === 'auto' ? Date.now() : null,
    };

    await createBooking(bookingData);
    setPendingBooking({ ...pendingBooking, status: bookingData.status, preAuthEnabled });
    navigate('/app/confirm');
    setBusy(false);
  }

  const p = pricing;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Payment & Confirmation</h1>
        <p className="page-subtitle">{facility.name} · {eventType}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* ─── Invoice Preview ─── */}
          <div className="invoice-preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--sf-border)' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, #A78BFA, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Space·Flow</div>
                <div style={{ fontSize: 12, color: 'var(--sf-text-mute)' }}>Pro-Forma Invoice</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--sf-text-mute)' }}>
                <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
                <div>Ref: SF-{uid().slice(0, 8).toUpperCase()}</div>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--sf-text-mute)', marginBottom: 2 }}>Bill to</div>
              <div style={{ fontWeight: 600 }}>{session.name}</div>
              <div style={{ fontSize: 13, color: 'var(--sf-text-mute)' }}>{session.email}</div>
            </div>
            <div className="invoice-row">
              <span style={{ color: 'var(--sf-text-sub)' }}>Facility</span>
              <span style={{ fontWeight: 600 }}>{facility.name}</span>
            </div>
            <div className="invoice-row">
              <span style={{ color: 'var(--sf-text-sub)' }}>Location</span>
              <span>{facility.locationName || facility.city} ({facility.city})</span>
            </div>
            {facility.address && (
              <div className="invoice-row">
                <span style={{ color: 'var(--sf-text-sub)' }}>Address</span>
                <span style={{ fontSize: 12 }}>{facility.address}</span>
              </div>
            )}
            <div className="invoice-row">
              <span style={{ color: 'var(--sf-text-sub)' }}>Event type</span>
              <span>{eventType || '—'}</span>
            </div>
            <div className="invoice-row">
              <span style={{ color: 'var(--sf-text-sub)' }}>Duration</span>
              <span>{durationHours} hours</span>
            </div>
            <div className="invoice-row">
              <span style={{ color: 'var(--sf-text-sub)' }}>Base rate</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>£{(p?.base ?? 0).toLocaleString()}</span>
            </div>
            {(addOns || []).map(a => (
              <div key={a.id} className="invoice-row">
                <span style={{ color: 'var(--sf-text-sub)' }}>{a.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>£{a.price.toLocaleString()}</span>
              </div>
            ))}
            {p?.tax > 0 && (
              <div className="invoice-row">
                <span style={{ color: 'var(--sf-text-sub)' }}>VAT ({settings.taxRate}%)</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>£{p.tax.toLocaleString()}</span>
              </div>
            )}
            <div className="invoice-row invoice-total">
              <span>Total</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--sf-violet-lt)', fontSize: 18 }}>£{(p?.total ?? 0).toLocaleString()}</span>
            </div>
          </div>

          {/* ─── Payment Mode ─── */}
          <div className="sf-card sf-card-sm">
            <div className="sf-label" style={{ marginBottom: 12 }}>Payment method</div>
            <div className="payment-mode-toggle" style={{ marginBottom: paymentMode === 'auto' ? 20 : 0 }}>
              <button type="button" className={`payment-mode-btn ${paymentMode === 'auto' ? 'active' : ''}`} onClick={() => setPaymentMode('auto')}>
                <CreditCard size={15} style={{ margin: '0 auto 4px', display: 'block' }} /> Card Payment
              </button>
              <button type="button" className={`payment-mode-btn ${paymentMode === 'manual' ? 'active' : ''}`} onClick={() => setPaymentMode('manual')}>
                <Building2 size={15} style={{ margin: '0 auto 4px', display: 'block' }} /> Bank Transfer
              </button>
            </div>

            {paymentMode === 'auto' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp 0.2s ease' }}>
                <div className="sf-field">
                  <label className="sf-label">Card number</label>
                  <input
                    className="card-input-field"
                    value={cardNumber}
                    onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div className="sf-field">
                    <label className="sf-label">Name on card</label>
                    <input className="sf-input" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Jane Smith" />
                  </div>
                  <div className="sf-field">
                    <label className="sf-label">Expiry</label>
                    <input className="sf-input sf-input mono" value={cardExpiry} onChange={e => { let v = e.target.value.replace(/\D/g,'').slice(0,4); if (v.length>2) v=v.slice(0,2)+'/'+v.slice(2); setCardExpiry(v); }} placeholder="MM/YY" maxLength={5} style={{ fontFamily:'var(--font-mono)' }} />
                  </div>
                  <div className="sf-field">
                    <label className="sf-label">CVC</label>
                    <input className="sf-input" value={cardCvc} onChange={e => setCardCvc(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="123" style={{ fontFamily:'var(--font-mono)' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--sf-text-mute)' }}>
                  <Lock size={12} /> This is a prototype — no real payment is taken
                </div>
              </div>
            )}

            {paymentMode === 'manual' && (
              <div style={{ padding: '14px 16px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-lg)', marginTop: 16, animation: 'fadeUp 0.2s ease' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Bank transfer details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 13 }}>
                  {[['Account name', 'The Grand Space Ltd'],['Sort code', '20-45-68'],['Account number', '71234567'],['Reference', `SF-${uid().slice(0,6).toUpperCase()}`]].map(([k,v]) => (
                    <React.Fragment key={k}>
                      <span style={{ color: 'var(--sf-text-mute)' }}>{k}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--sf-text)' }}>{v}</span>
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--sf-text-mute)' }}>Invoice will be emailed after booking confirmation.</div>
              </div>
            )}
          </div>

          {/* ─── Pre-Auth Hold ─── */}
          <div className="pre-auth-card" id="pre-auth-section">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <ShieldCheck size={18} style={{ color: 'var(--sf-amber)' }} />
                  <span style={{ fontWeight: 700, color: 'var(--sf-amber-lt)', fontSize: 15 }}>Security Deposit Hold</span>
                  <span className="badge badge-amber" style={{ fontSize: 10 }}>Optional</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--sf-text-sub)', lineHeight: 1.6, marginBottom: 12 }}>
                  A pre-authorisation hold of <strong style={{ color: 'var(--sf-amber-lt)' }}>£{preAuthAmount.toLocaleString()}</strong> will be placed on your card as a refundable security deposit. It will be released automatically within {settings.defaultPreAuthDays ?? 7} days of your event, or sooner if you cancel.
                </p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, color: 'var(--sf-text-mute)' }}>
                  <Clock size={13} />
                  <span>Hold expires {settings.defaultPreAuthDays ?? 7} days after your event · Charged only in case of damage</span>
                </div>
              </div>
              <div style={{ flexShrink: 0 }}>
                <button type="button"
                  onClick={() => setPreAuthEnabled(s => !s)}
                  style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', transition: 'all 300ms',
                    background: preAuthEnabled ? 'var(--sf-amber)' : 'var(--sf-bg-raised)',
                    position: 'relative' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                    left: preAuthEnabled ? 24 : 4, transition: 'left 300ms', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                </button>
              </div>
            </div>
            {preAuthEnabled && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={14} style={{ color: 'var(--sf-amber)' }} />
                <span style={{ fontSize: 13, color: 'var(--sf-amber-lt)' }}>£{preAuthAmount.toLocaleString()} hold will be captured on your card — not charged immediately</span>
              </div>
            )}
          </div>

          {/* ─── Confirmation Mode Notice ─── */}
          {confirmationMode === 'manual' && (
            <div style={{ padding: '14px 16px', background: 'var(--sf-violet-dim)', border: '1px solid var(--sf-border-v)', borderRadius: 'var(--r-lg)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Info size={16} style={{ color: 'var(--sf-violet-lt)', marginTop: 2, flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: 'var(--sf-text-sub)' }}>
                <strong style={{ color: 'var(--sf-violet-lt)' }}>Manual approval required.</strong> Your booking request will be reviewed by venue staff. You'll receive confirmation within 24 hours.
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={busy} style={{ fontSize: 16 }}>
            {busy ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block' }} />
                Processing…
              </span>
            ) : (
              <><ShieldCheck size={17} /> {paymentMode === 'manual' ? 'Submit Booking Request' : 'Confirm & Pay'} · £{(p?.total ?? 0).toLocaleString()}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
