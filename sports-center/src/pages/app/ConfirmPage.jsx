import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Calendar, Download, ArrowRight, RotateCcw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ConfirmPage() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('dcc_confirm');
    if (!raw) { navigate('/app/book', { replace: true }); return; }
    setConfirm(JSON.parse(raw));
  }, [navigate]);

  if (!confirm) return null;
  const { ref, selection, dateKey, sportName, totalPrice, paymentRef, recurring, recurFreq, recurCount, name } = confirm;

  function downloadIcs() {
    const dt = new Date(dateKey + 'T' + selection[0].time + ':00');
    const end = new Date(dt.getTime() + 60 * 60 * 1000);
    const fmt = d => d.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dorset Cricket Centre//EN',
      'BEGIN:VEVENT',
      'UID:' + ref + '@hurnbridgecc.co.uk',
      'DTSTAMP:' + fmt(new Date()),
      'DTSTART:' + fmt(dt),
      'DTEND:' + fmt(end),
      'SUMMARY:Cricket Net — ' + selection[0].unit,
      'DESCRIPTION:Booking ref ' + ref + ' · ' + name,
      'LOCATION:Hurn Bridge Sports Club\\, Parley Ln\\, Christchurch',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `cricket-${ref}.ics` });
    a.click();
  }

  return (
    <div className="confirm-page">
      <div className="confirm-icon-ring">
        <Check size={36} strokeWidth={2.5} color="#52B788" />
      </div>

      <h1 className="display" style={{ fontSize: 40, marginBottom: 8 }}>
        <span className="text-gold">All booked!</span>
      </h1>
      <p style={{ color: 'var(--c-text-sub)', fontSize: 15, marginBottom: 8 }}>
        Your {sportName} session{selection.length > 1 ? 's are' : ' is'} confirmed, {name.split(' ')[0]}.
      </p>
      {totalPrice > 0
        ? <p style={{ color: 'var(--c-text-mute)', fontSize: 13 }}>Payment of <b className="text-gold mono">£{totalPrice.toFixed(2)}</b> taken — ref <span className="mono">{paymentRef}</span></p>
        : <p style={{ color: 'var(--c-green)', fontSize: 13, fontWeight: 600 }}>Free booking — no charge.</p>
      }

      <div className="booking-ref" style={{ margin: '20px 0 8px' }}>{ref}</div>
      <div style={{ fontSize: 12, color: 'var(--c-text-mute)', marginBottom: 8 }}>Booking reference</div>

      <div id="demo-qr-wrap" className="qr-wrap">
        <QRCodeSVG value={ref} size={140} bgColor="#ffffff" fgColor="#0B3D2E" />
      </div>
      <div style={{ fontSize: 12, color: 'var(--c-text-mute)', marginBottom: 24 }}>Show this QR at the centre</div>

      <div className="order-summary" style={{ textAlign: 'left', marginBottom: 20 }}>
        <div className="order-line"><span className="lbl">Sport</span><span>{sportName}</span></div>
        <div className="order-line"><span className="lbl">Date</span><span className="mono">{dateKey}</span></div>
        {selection.map(s => (
          <div className="order-line" key={s.key}>
            <span className="lbl">{s.unit}</span>
            <span className="mono">{s.time} – {String(parseInt(s.time) + 1).padStart(2, '0')}:00</span>
          </div>
        ))}
        {recurring && (
          <div className="order-line">
            <span className="lbl">Recurring</span>
            <span style={{ color: 'var(--c-gold)' }}>↻ {recurFreq} · {recurCount} more sessions</span>
          </div>
        )}
      </div>

      {recurring && (
        <div style={{ background: 'rgba(255,210,63,0.08)', border: '1px solid rgba(255,210,63,0.25)', borderRadius: 10, padding: 14, marginBottom: 20, fontSize: 13, color: 'var(--c-text-sub)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <RotateCcw size={14} style={{ color: 'var(--c-gold)' }} />
            <b style={{ color: 'var(--c-gold)' }}>Standing booking active</b>
          </div>
          Your lane is reserved {recurFreq} for {recurCount} additional sessions. Manage these in <b>My Bookings</b>.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-ghost w-full" style={{ display: 'flex', gap: 8 }} onClick={downloadIcs}>
          <Download size={15} /> Add to calendar (.ics)
        </button>
        <button className="btn btn-ghost w-full" style={{ display: 'flex', gap: 8 }} onClick={() => navigate('/app/my-bookings')}>
          <Calendar size={15} /> View my bookings
        </button>
        <button className="btn btn-primary w-full" style={{ display: 'flex', gap: 8 }} onClick={() => navigate('/app/book')}>
          Book another slot <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
