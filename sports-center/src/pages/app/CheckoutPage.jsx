import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Lock, Check, ChevronRight, RotateCcw, Zap } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { storage, uid } from '../../store/storage.js';

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(val) {
  const digits = val.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

export default function CheckoutPage() {
  const { session, bookings, setBookings, myIds, setMyIds, settings, showToast } = useApp();
  const navigate = useNavigate();

  const [pending, setPending] = useState(null);
  const [recurring, setRecurring] = useState(false);
  const [recurFreq, setRecurFreq] = useState('weekly');
  const [recurWeeks, setRecurWeeks] = useState(8);

  // Payment form state
  const [cardNum, setCardNum]     = useState('4242 4242 4242 4242');
  const [cardName, setCardName]   = useState(session?.name || 'Tom Richards');
  const [expiry, setExpiry]       = useState('12/28');
  const [cvv, setCvv]             = useState('123');
  const [saveCard, setSaveCard]   = useState(false);
  const [stage, setStage]         = useState('form'); // form | processing | done
  const [errors, setErrors]       = useState({});

  useEffect(() => {
    const raw = sessionStorage.getItem('dcc_pending');
    if (!raw) { navigate('/app/book', { replace: true }); return; }
    try {
      setPending(JSON.parse(raw));
    } catch {
      navigate('/app/book', { replace: true });
    }

    if (session?.name) setCardName(session.name);

    // Pre-fill card if saved
    const saved = localStorage.getItem('dcc_savedcard');
    if (saved) {
      try {
        const sc = JSON.parse(saved);
        setCardNum(sc.num); setCardName(sc.name); setExpiry(sc.expiry);
      } catch {}
    }
  }, [navigate, session]);

  // Declare useMemo unconditionally BEFORE any early return
  const recurDates = useMemo(() => {
    if (!pending || !recurring || !pending.selection?.length) return [];
    const base = new Date(pending.dateKey);
    const interval = recurFreq === 'weekly' ? 7 : 14;
    const out = [];
    for (let i = 1; i < recurWeeks; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i * interval);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }, [recurring, recurFreq, recurWeeks, pending]);

  // ALL HOOKS MUST BE DECLARED BEFORE THIS LINE
  if (!pending) return null;

  const { selection = [], dateKey = '', sportName = 'Cricket', totalPrice = 0 } = pending;
  const isFree = totalPrice === 0;

  function autofillDemoCard() {
    setCardNum('4242 4242 4242 4242');
    setCardName(session?.name || 'Tom Richards');
    setExpiry('12/28');
    setCvv('123');
    setErrors({});
  }

  function validate() {
    const e = {};
    if (isFree) return e;
    const digits = cardNum.replace(/\s/g, '');
    if (digits.length < 12) e.cardNum = 'Enter a valid card number.';
    if (!cardName.trim()) e.cardName = 'Enter the cardholder name.';
    if (!expiry || expiry.length < 4) e.expiry = 'Enter expiry (MM/YY).';
    if (cvv.length < 3) e.cvv = 'Enter CVV.';
    return e;
  }

  async function handlePay(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setStage('processing');
    await new Promise(r => setTimeout(r, 1800)); // simulate processing delay

    try {
      // Build booking entries
      const latest = await storage.get('bookings');
      const current = latest?.value ? JSON.parse(latest.value) : [];
      const recurId = recurring ? uid() : null;

      const userName = session?.name || 'Guest User';
      const userEmail = session?.email || 'member@hurnbridge.cc';

      const makeEntries = (dKey) => selection.map(s => ({
        id: uid(),
        sportId: 'cricket',
        sportName,
        unit: s.unit,
        date: dKey,
        time: s.time,
        name: userName,
        contact: userEmail,
        createdAt: Date.now(),
        type: 'booking',
        createdByRole: session?.role || 'user',
        createdByEmail: userEmail,
        subsidised: !!session?.ecbCoach,
        recurringId: recurId,
        amount: isFree ? 0 : totalPrice / (selection.length || 1),
        paymentRef: 'TXN-' + uid().slice(0, 8).toUpperCase(),
      }));

      let allEntries = makeEntries(dateKey);
      if (recurring) {
        for (const d of recurDates) allEntries = [...allEntries, ...makeEntries(d)];
      }

      const merged = [...current, ...allEntries];
      await storage.set('bookings', JSON.stringify(merged));

      // Save my IDs
      const mineRes = await storage.get('my-booking-ids');
      const mine = mineRes?.value ? JSON.parse(mineRes.value) : [];
      const allIds = allEntries.map(e => e.id);
      await storage.set('my-booking-ids', JSON.stringify([...mine, ...allIds]));
      setMyIds([...myIds, ...allIds]);
      setBookings(merged);

      // Save card if requested
      if (saveCard && !isFree) {
        localStorage.setItem('dcc_savedcard', JSON.stringify({ num: cardNum, name: cardName, expiry }));
      }

      // Store confirmation data
      sessionStorage.setItem('dcc_confirm', JSON.stringify({
        ref: 'DCC-' + allEntries[0].id.slice(0, 6).toUpperCase(),
        selection, dateKey, sportName, totalPrice: isFree ? 0 : totalPrice,
        paymentRef: allEntries[0].paymentRef,
        recurring, recurFreq, recurCount: recurDates.length,
        name: userName,
      }));

      sessionStorage.removeItem('dcc_pending');
      setStage('done');
      showToast('Payment successful!');
      navigate('/app/confirm');
    } catch (err) {
      console.error('Payment error:', err);
      showToast('Payment failed. Try again.', 'error');
      setStage('form');
    }
  }

  // Detect card type from number
  const digits = cardNum.replace(/\s/g, '');
  const cardType = digits.startsWith('4') ? 'Visa' : digits.startsWith('5') ? 'Mastercard' : digits.startsWith('3') ? 'Amex' : 'Card';

  return (
    <div className="checkout-page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="display" style={{ fontSize: 32, marginBottom: 4 }}>Checkout</h1>
        <p style={{ color: 'var(--c-text-mute)', fontSize: 13 }}>{sportName} · {dateKey} · {selection.length} slot{selection.length > 1 ? 's' : ''}</p>
      </div>

      {stage === 'processing' && (
        <div className="payment-processing">
          <div className="processing-ring" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 }}>Processing payment…</div>
            <div style={{ fontSize: 13, color: 'var(--c-text-mute)' }}>Connecting securely to Stripe payment gateway</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: 'var(--c-text-faint)' }}>
            <Lock size={12} /> 256-bit SSL encrypted
          </div>
        </div>
      )}

      {stage === 'form' && (
        <form onSubmit={handlePay}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, alignItems: 'start' }}>
            {/* Left — payment form */}
            <div>
              {/* Card visual */}
              <div className="payment-card-visual" style={{ marginBottom: 20 }}>
                <div className="card-chip" />
                <div className="card-number-display">
                  {digits ? digits.padEnd(16, '·').replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                </div>
                <div className="card-meta">
                  <div>
                    <div>CARDHOLDER</div>
                    <div className="val">{cardName || 'YOUR NAME'}</div>
                  </div>
                  <div>
                    <div>EXPIRES</div>
                    <div className="val">{expiry || 'MM/YY'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>NETWORK</div>
                    <div className="val">{cardType || 'Visa'}</div>
                  </div>
                </div>
              </div>

              {!isFree && (
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost btn-sm" style={{ display: 'flex', gap: 6, color: 'var(--c-gold)', borderColor: 'rgba(255,210,63,0.3)' }} onClick={autofillDemoCard}>
                    <Zap size={13} /> Auto-fill Demo Card
                  </button>
                </div>
              )}

              {session?.ecbCoach && (
                <div style={{ background: 'rgba(91,155,213,0.12)', border: '1px solid rgba(91,155,213,0.3)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                  <div style={{ color: '#5B9BD5', fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>
                    🏅 Verified ECB Coach Discount Applied ({settings.ecbDiscount || 50}% Off)
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-sub)' }}>
                    Coach ID: <span className="mono" style={{ color: 'var(--c-gold)' }}>{session.ecbNumber || 'ECB-VERIFIED'}</span> · Discounted rate calculated.
                  </div>
                </div>
              )}

              {isFree ? (
                <div style={{ background: 'rgba(82,183,136,0.1)', border: '1px solid rgba(82,183,136,0.3)', borderRadius: 10, padding: 18, marginBottom: 20 }}>
                  <div style={{ color: 'var(--c-green)', fontWeight: 700, marginBottom: 4 }}>✓ Free booking — no payment required</div>
                  <div style={{ fontSize: 13, color: 'var(--c-text-mute)' }}>Your complimentary voucher entitles you to zero balance access.</div>
                </div>
              ) : (
                <>
                  <div className="input-group">
                    <label className="input-label">Card number</label>
                    <div className={`input-wrap ${errors.cardNum ? 'error' : ''}`}>
                      <CreditCard size={15} color="var(--c-text-mute)" />
                      <input className="card-input" value={cardNum} onChange={e => setCardNum(formatCardNumber(e.target.value))} placeholder="4242 4242 4242 4242" inputMode="numeric" autoComplete="cc-number" />
                    </div>
                    {errors.cardNum && <div className="input-err">{errors.cardNum}</div>}
                  </div>
                  <div className="input-group">
                    <label className="input-label">Name on card</label>
                    <div className={`input-wrap ${errors.cardName ? 'error' : ''}`}>
                      <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="As it appears on card" autoComplete="cc-name" />
                    </div>
                    {errors.cardName && <div className="input-err">{errors.cardName}</div>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
                    <div className="input-group" style={{ marginBottom: 0, minWidth: 0 }}>
                      <label className="input-label">Expiry</label>
                      <div className={`input-wrap ${errors.expiry ? 'error' : ''}`}>
                        <input className="card-input" value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/YY" maxLength={5} inputMode="numeric" autoComplete="cc-exp" />
                      </div>
                      {errors.expiry && <div className="input-err">{errors.expiry}</div>}
                    </div>
                    <div className="input-group" style={{ marginBottom: 0, minWidth: 0 }}>
                      <label className="input-label">CVV / CVC</label>
                      <div className={`input-wrap ${errors.cvv ? 'error' : ''}`}>
                        <input className="card-input" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="123" inputMode="numeric" autoComplete="cc-csc" type="password" />
                      </div>
                      {errors.cvv && <div className="input-err">{errors.cvv}</div>}
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--c-text-sub)', cursor: 'pointer', marginBottom: 20 }}>
                    <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} />
                    Save card for future bookings
                  </label>
                </>
              )}

              {/* Recurring summary badge (selected on Booking Board) */}
              {recurring && (
                <div style={{ background: 'rgba(255,210,63,0.08)', border: '1px solid rgba(255,210,63,0.3)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
                  <div style={{ color: 'var(--c-gold)', fontWeight: 700, fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <RotateCcw size={15} /> Standing / Recurring Order Active
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-sub)', marginTop: 4 }}>
                    {recurFreq} auto-renewal for {recurWeeks} weeks selected on Booking Board.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, color: 'var(--c-text-faint)', marginBottom: 20 }}>
                <Lock size={13} /> Payments are secured with 256-bit SSL encryption. Card details are never stored on our servers.
              </div>
            </div>

            {/* Right — order summary */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 12 }}>Order Summary</div>
              <div className="order-summary" style={{ marginBottom: 16 }}>
                {selection.map(s => (
                  <div className="order-line" key={s.key}>
                    <span className="lbl">{s.unit} · {s.time}</span>
                    <span className="mono">{isFree ? 'Free' : `£${(totalPrice / (selection.length || 1)).toFixed(2)}`}</span>
                  </div>
                ))}
                {recurring && (
                  <div className="order-line" style={{ color: 'var(--c-gold)', fontSize: 12 }}>
                    <span className="lbl">Recurring ({recurDates.length}×)</span>
                    <span className="mono">{isFree ? 'Free' : `£${(totalPrice * recurDates.length).toFixed(2)}`}</span>
                  </div>
                )}
                <div className="divider" style={{ margin: '8px 0' }} />
                <div className="order-total">
                  <span>Total{recurring ? ` (incl. all sessions)` : ''}</span>
                  <span className="val">{isFree ? 'FREE' : `£${(isFree ? 0 : totalPrice * (recurring ? recurDates.length + 1 : 1)).toFixed(2)}`}</span>
                </div>
              </div>

              <div style={{ fontSize: 12, color: 'var(--c-text-mute)', background: 'rgba(247,245,240,0.04)', border: '1px solid var(--c-border)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: 'var(--c-text-sub)', marginBottom: 4 }}>Booking summary</div>
                <div>Sport: {sportName}</div>
                <div>Date: {dateKey}</div>
                <div>Slots: {selection.map(s => `${s.unit} @ ${s.time}`).join(', ')}</div>
                {recurring && <div style={{ color: 'var(--c-gold)', marginTop: 4 }}>↻ {recurFreq} for {recurWeeks} weeks</div>}
              </div>

              <button id="demo-pay-submit-btn" type="submit" className="btn btn-primary w-full btn-lg" style={{ display: 'flex', gap: 8 }}>
                {isFree ? <><Check size={16} /> Confirm free booking</> : <><Lock size={15} /> Pay {`£${(isFree ? 0 : totalPrice * (recurring ? recurDates.length + 1 : 1)).toFixed(2)}`} securely</>}
              </button>
              <button type="button" className="btn btn-ghost w-full btn-sm" style={{ marginTop: 10 }} onClick={() => navigate('/app/book')}>← Back to booking board</button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
