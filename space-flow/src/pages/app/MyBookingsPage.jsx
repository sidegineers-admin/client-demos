import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, ShieldCheck, Download, X, AlertCircle, Check, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';
import Modal from '../../components/ui/Modal.jsx';

const STATUS_STYLES = {
  confirmed:        { badge: 'badge-emerald', dot: 'var(--sf-emerald)',   label: 'Confirmed' },
  pending_approval: { badge: 'badge-amber',   dot: 'var(--sf-amber)',     label: 'Pending Approval' },
  held:             { badge: 'badge-amber',   dot: 'var(--sf-amber)',     label: 'On Hold' },
  cancelled:        { badge: 'badge-gray',    dot: 'var(--sf-text-mute)', label: 'Cancelled' },
  rejected:         { badge: 'badge-red',     dot: 'var(--sf-red)',       label: 'Rejected' },
};

function fmtDate(dk) {
  if (!dk) return '—';
  const [y,m,d] = dk.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function HoldCountdown({ holdData }) {
  if (!holdData?.enabled || holdData.status !== 'held') return null;
  const diff = holdData.expiresAt - Date.now();
  const days = Math.max(0, Math.floor(diff / 86400000));
  const hrs  = Math.max(0, Math.floor((diff % 86400000) / 3600000));
  if (diff <= 0) return <span className="badge badge-gray">Hold expired</span>;
  return (
    <span className="hold-countdown">
      <ShieldCheck size={11} />
      Hold: {days}d {hrs}h remaining
    </span>
  );
}

export default function MyBookingsPage() {
  const { myBookings, cancelBooking, showToast, facilities } = useApp();
  const navigate = useNavigate();
  const [cancelModal, setCancelModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const sorted = [...myBookings].sort((a, b) => new Date(b.date) - new Date(a.date));
  const filtered = filterStatus === 'all' ? sorted : sorted.filter(b => b.status === filterStatus);

  async function handleCancel() {
    if (!cancelModal) return;
    await cancelBooking(cancelModal.id);
    showToast('Booking cancelled', 'info');
    setCancelModal(null);
  }

  function downloadInvoice(b) {
    // Prototype: generate a simple text invoice
    const lines = [
      'SPACE-FLOW INVOICE',
      '==================',
      `Invoice: ${b.invoiceId || 'PRO-FORMA'}`,
      `Date: ${new Date().toLocaleDateString('en-GB')}`,
      '',
      `Hirer: ${b.hirerName}`,
      `Email: ${b.hirerEmail}`,
      '',
      `Facility: ${b.facilityName}`,
      `Event: ${b.eventType}`,
      `Date: ${fmtDate(b.date)}`,
      `Time: ${String(b.startHour).padStart(2,'0')}:00 – ${String(b.startHour + b.durationHours).padStart(2,'0')}:00`,
      '',
      `Base amount: £${b.baseAmount?.toLocaleString() ?? 0}`,
      ...(b.addOns || []).map(a => `${a.name}: £${a.price.toLocaleString()}`),
      `Total: £${b.totalAmount?.toLocaleString() ?? 0}`,
      '',
      'Thank you for booking with Space-Flow.',
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${b.invoiceId || 'invoice'}.txt`;
    a.click();
    showToast('Invoice downloaded', 'ok');
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Bookings</h1>
        <p className="page-subtitle">View and manage your facility bookings</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {[['all', 'All'], ['confirmed', 'Confirmed'], ['pending_approval', 'Pending'], ['cancelled', 'Cancelled']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`btn btn-sm ${filterStatus === val ? 'btn-primary' : 'btn-ghost'}`}
          >
            {label}
            <span style={{ marginLeft: 4, opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              ({val === 'all' ? sorted.length : sorted.filter(b => b.status === val).length})
            </span>
          </button>
        ))}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/app/book')}>
          + New Booking
        </button>
      </div>

      {/* Booking list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map(b => {
          const ss = STATUS_STYLES[b.status] || STATUS_STYLES.pending_approval;
          const isExp = expanded === b.id;
          const facility = facilities.find(f => f.id === b.facilityId);
          return (
            <div key={b.id} className="booking-card" id={`booking-${b.id}`}
              style={{ flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>
              {/* Card header */}
              <div style={{ display: 'flex', gap: 14, padding: '18px 20px', cursor: 'pointer' }}
                onClick={() => setExpanded(isExp ? null : b.id)}>
                <div className="booking-card-accent" style={{ background: ss.dot, width: 4, minHeight: 40, alignSelf: 'stretch' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)', marginBottom: 4 }}>{b.facilityName}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={`badge ${ss.badge}`}>{ss.label}</span>
                        <span className="badge badge-gray">{b.eventType}</span>
                        <HoldCountdown holdData={b.preAuthHold} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: 'var(--sf-violet-lt)' }}>
                        £{b.totalAmount?.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>
                        {b.paymentMode === 'auto' ? '💳 Card' : '🏦 Invoice'}
                        {b.paymentStatus === 'paid' ? ' · Paid' : b.paymentStatus === 'invoiced' ? ' · Invoiced' : ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12.5, color: 'var(--sf-text-mute)', flexWrap: 'wrap' }}>
                    {facility && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--sf-cyan-lt)', fontWeight: 500 }}>
                        <MapPin size={12} />{facility.locationName || facility.city}
                      </span>
                    )}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={12} />{fmtDate(b.date)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} />{String(b.startHour).padStart(2,'0')}:00 – {String(b.startHour + b.durationHours).padStart(2,'0')}:00</span>
                    {b.attendees > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={12} />{b.attendees} guests</span>}
                  </div>
                </div>
                <div style={{ color: 'var(--sf-text-mute)', alignSelf: 'flex-start', marginTop: 2 }}>
                  {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Expanded details */}
              {isExp && (
                <div style={{ borderTop: '1px solid var(--sf-border)', padding: '16px 20px', background: 'var(--sf-bg-surface)', animation: 'fadeUp 0.2s ease' }}>
                  {b.notes && (
                    <div style={{ marginBottom: 14 }}>
                      <div className="sf-label">Notes</div>
                      <div style={{ fontSize: 13.5, color: 'var(--sf-text-sub)' }}>{b.notes}</div>
                    </div>
                  )}

                  {(b.addOns || []).length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div className="sf-label">Add-ons</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {b.addOns.map(a => (
                          <span key={a.id} className="badge badge-violet">{a.name} · £{a.price}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {b.preAuthHold?.enabled && (
                    <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--sf-amber-dim)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--r-md)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <ShieldCheck size={14} style={{ color: 'var(--sf-amber)' }} />
                        <span>Security hold: <strong>£{b.preAuthHold.amount?.toLocaleString()}</strong> — {b.preAuthHold.status === 'held' ? 'Active on card' : b.preAuthHold.status}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {b.invoiceId && (
                      <button className="btn btn-secondary btn-sm" onClick={() => downloadInvoice(b)}>
                        <Download size={13} /> Download Invoice
                      </button>
                    )}
                    {['confirmed', 'pending_approval'].includes(b.status) && new Date(b.date) > new Date() && (
                      <button className="btn btn-danger btn-sm" onClick={() => setCancelModal(b)}>
                        <X size={13} /> Cancel
                      </button>
                    )}
                    {b.status === 'pending_approval' && (
                      <span style={{ fontSize: 12, color: 'var(--sf-text-mute)', alignSelf: 'center', marginLeft: 4 }}>
                        ⏳ Awaiting venue approval
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--sf-text-mute)' }}>
          <Calendar size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ fontSize: 15, marginBottom: 16 }}>No bookings found</p>
          <button className="btn btn-primary" onClick={() => navigate('/app/book')}>Book a Space</button>
        </div>
      )}

      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title="Cancel Booking">
        <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
          <AlertCircle size={22} style={{ color: 'var(--sf-red)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 15, marginBottom: 8 }}>Are you sure you want to cancel your booking for <strong>{cancelModal?.facilityName}</strong>?</p>
            <p style={{ fontSize: 13.5, color: 'var(--sf-text-mute)' }}>
              Cancellation policy applies. If a security deposit is held, it will be released within 5–7 business days.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-full" onClick={() => setCancelModal(null)}>Keep Booking</button>
          <button className="btn btn-danger btn-full" onClick={handleCancel}>Yes, Cancel</button>
        </div>
      </Modal>
    </div>
  );
}
