import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Clock, ShieldCheck, ChevronDown, ChevronUp, MessageSquare, User, Calendar, Download, Plus } from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';
import { useDemo } from '../../store/DemoContext.jsx';
import Modal from '../../components/ui/Modal.jsx';
import AdminDirectBookingModal from '../../components/modals/AdminDirectBookingModal.jsx';

const STATUS_STYLES = {
  confirmed:        { badge: 'badge-emerald', label: 'Confirmed' },
  pending_approval: { badge: 'badge-amber',   label: 'Pending Approval' },
  held:             { badge: 'badge-amber',   label: 'On Hold' },
  cancelled:        { badge: 'badge-gray',    label: 'Cancelled' },
  rejected:         { badge: 'badge-red',     label: 'Rejected' },
};

function fmtDate(dk) {
  if (!dk) return '—';
  const [y,m,d] = dk.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}

function fmtTime(b) {
  return `${String(b.startHour).padStart(2,'0')}:00 – ${String(b.startHour + b.durationHours).padStart(2,'0')}:00`;
}

export default function AdminBookingsPage() {
  const navigate = useNavigate();
  const { bookings, approveBooking, rejectBooking, updateBooking, showToast, session } = useApp();
  const { demoTriggers, setDemoTriggers } = useDemo();
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectMsg, setRejectMsg] = useState('');
  const [approving, setApproving] = useState(null);
  const [holdModal, setHoldModal] = useState(null);
  const [directBookingOpen, setDirectBookingOpen] = useState(false);

  // Demo trigger: filter to pending
  useEffect(() => {
    if (demoTriggers.filterPending) {
      setFilterStatus('pending_approval');
      setDemoTriggers(t => ({ ...t, filterPending: null }));
    }
    if (demoTriggers.approveBooking) {
      const bid = demoTriggers.approveBooking;
      setExpanded(bid);
      setDemoTriggers(t => ({ ...t, approveBooking: null }));
      setTimeout(async () => {
        await approveBooking(bid);
        showToast('✅ Booking approved!', 'ok');
      }, 800);
    }
  }, [demoTriggers]);

  if (!session || !['admin','staff'].includes(session.role)) {
    return <div style={{ padding: 40, color: 'var(--sf-text-mute)' }}>Access denied</div>;
  }

  const sorted = [...bookings].sort((a, b) => {
    // Pending first
    const pri = { pending_approval: 0, held: 1, confirmed: 2, cancelled: 3, rejected: 3 };
    if ((pri[a.status]??9) !== (pri[b.status]??9)) return (pri[a.status]??9) - (pri[b.status]??9);
    return new Date(a.date) - new Date(b.date);
  });

  const filtered = sorted.filter(b => {
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (search && !b.hirerName?.toLowerCase().includes(search.toLowerCase()) && !b.facilityName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = bookings.filter(b => b.status === 'pending_approval').length;

  async function handleApprove(id) {
    setApproving(id);
    await new Promise(r => setTimeout(r, 700));
    await approveBooking(id);
    showToast('✅ Booking approved & hirer notified', 'ok');
    setApproving(null);
  }

  async function handleReject() {
    if (!rejectModal) return;
    await rejectBooking(rejectModal.id);
    showToast('Booking rejected', 'warn');
    setRejectModal(null);
    setRejectMsg('');
  }

  async function handleReleaseHold(b) {
    await updateBooking(b.id, { preAuthHold: { ...b.preAuthHold, status: 'released' } });
    showToast('Security hold released', 'ok');
    setHoldModal(null);
  }

  async function handleChargeHold(b) {
    await updateBooking(b.id, { preAuthHold: { ...b.preAuthHold, status: 'charged' } });
    showToast('Security hold charged to hirer\'s card', 'warn');
    setHoldModal(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Booking Management</h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>Review, approve and manage all bookings</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/app/admin-calendar')}>
            <Calendar size={14} /> Operations Calendar
          </button>
          <button className="btn btn-primary" onClick={() => setDirectBookingOpen(true)}>
            <Plus size={14} /> Direct Booking
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total bookings', val: bookings.length, col: 'var(--sf-violet-lt)' },
          { label: 'Pending approval', val: pendingCount, col: 'var(--sf-amber)', pulse: pendingCount > 0 },
          { label: 'Confirmed', val: bookings.filter(b => b.status === 'confirmed').length, col: 'var(--sf-emerald)' },
          { label: 'Active holds', val: bookings.filter(b => b.preAuthHold?.status === 'held').length, col: 'var(--sf-cyan)' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ animation: s.pulse ? 'slot-pulse 2s ease-in-out infinite' : 'none', borderColor: s.pulse ? 'rgba(245,158,11,0.3)' : undefined }}>
            <div className="stat-card-value" style={{ fontSize: 28, color: s.col }}>{s.val}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {[['all','All'],['pending_approval','Pending'],['confirmed','Confirmed'],['cancelled','Cancelled/Rejected']].map(([v,l]) => (
          <button key={v} className={`btn btn-sm ${filterStatus===v?'btn-primary':'btn-ghost'}`} onClick={() => setFilterStatus(v)}>{l}{v==='pending_approval' && pendingCount>0 && <span style={{ marginLeft:4, background:'var(--sf-amber)', color:'#000', borderRadius:10, padding:'0 5px', fontSize:10, fontWeight:800 }}>{pendingCount}</span>}</button>
        ))}
        <input className="sf-input sf-input-sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hirer or facility…" style={{ marginLeft:'auto', width:220 }} />
      </div>

      {/* Booking list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(b => {
          const ss = STATUS_STYLES[b.status] || STATUS_STYLES.pending_approval;
          const isExp = expanded === b.id;
          const isPending = b.status === 'pending_approval';
          const hasHold = b.preAuthHold?.enabled && b.preAuthHold?.status === 'held';
          return (
            <div key={b.id} id={`bk-${b.id}-card`}
              className={`booking-pending-card`}
              style={{ background: 'var(--sf-bg-card)', border: `1px solid ${isPending ? 'rgba(245,158,11,0.3)' : 'var(--sf-border)'}`, borderRadius: 'var(--r-xl)', overflow: 'hidden', transition: 'border-color 160ms' }}>

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', cursor: 'pointer' }} onClick={() => setExpanded(isExp ? null : b.id)}>
                {isPending && <div style={{ width: 4, alignSelf: 'stretch', background: 'var(--sf-amber)', borderRadius: 2, flexShrink: 0, animation: 'slot-pulse 2s ease-in-out infinite' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span className={`badge ${ss.badge}`}>{ss.label}</span>
                    <span className="badge badge-gray">{b.eventType}</span>
                    {hasHold && <span className="badge badge-cyan"><ShieldCheck size={10} /> Hold: £{b.preAuthHold.amount}</span>}
                  </div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, marginBottom:4 }}>{b.facilityName}</div>
                  <div style={{ display:'flex', gap:12, fontSize:12, color:'var(--sf-text-mute)', flexWrap:'wrap' }}>
                    <span><User size={11} style={{ verticalAlign:'middle' }} /> {b.hirerName}</span>
                    <span><Calendar size={11} style={{ verticalAlign:'middle' }} /> {fmtDate(b.date)}</span>
                    <span><Clock size={11} style={{ verticalAlign:'middle' }} /> {fmtTime(b)}</span>
                  </div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'var(--font-mono)', fontSize:18, fontWeight:700, color:'var(--sf-violet-lt)' }}>£{b.totalAmount?.toLocaleString()}</div>
                  <div style={{ fontSize:11, color:'var(--sf-text-mute)' }}>{b.paymentMode === 'auto' ? 'Card' : 'Invoice'}</div>
                </div>
                {isExp ? <ChevronUp size={16} style={{ color:'var(--sf-text-mute)' }} /> : <ChevronDown size={16} style={{ color:'var(--sf-text-mute)' }} />}
              </div>

              {/* Expanded */}
              {isExp && (
                <div style={{ borderTop:'1px solid var(--sf-border)', padding:'18px 20px', background:'var(--sf-bg-surface)', animation:'fadeUp 0.2s ease' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16, fontSize:13 }}>
                    {[
                      ['Hirer email', b.hirerEmail],
                      ['Phone', b.hirerPhone || '—'],
                      ['Attendees', b.attendees || '—'],
                      ['Created', b.createdAt ? new Date(b.createdAt).toLocaleDateString('en-GB') : '—'],
                    ].map(([k,v]) => (
                      <div key={k}>
                        <div style={{ color:'var(--sf-text-mute)', marginBottom:2 }}>{k}</div>
                        <div style={{ fontWeight:500 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {b.notes && (
                    <div style={{ marginBottom:14, padding:'10px 14px', background:'var(--sf-bg-raised)', borderRadius:'var(--r-md)', fontSize:13, color:'var(--sf-text-sub)' }}>
                      <strong>Notes:</strong> {b.notes}
                    </div>
                  )}
                  {(b.addOns||[]).length > 0 && (
                    <div style={{ marginBottom:14 }}>
                      <div className="sf-label">Add-ons</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {b.addOns.map(a => <span key={a.id} className="badge badge-violet">{a.name} · £{a.price}</span>)}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {isPending && (
                      <>
                        <button className="btn btn-success" disabled={!!approving} onClick={() => handleApprove(b.id)}>
                          {approving === b.id ? 'Approving…' : <><Check size={14} /> Approve</>}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setRejectModal(b)}>
                          <X size={13} /> Reject
                        </button>
                      </>
                    )}
                    {hasHold && (
                      <button className="btn btn-amber btn-sm" onClick={() => setHoldModal(b)}>
                        <ShieldCheck size={13} /> Manage Hold (£{b.preAuthHold.amount})
                      </button>
                    )}
                    {b.invoiceId && (
                      <button className="btn btn-ghost btn-sm">
                        <Download size={13} /> Invoice
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--sf-text-mute)' }}>
            <Calendar size={36} style={{ opacity:0.3, marginBottom:10 }} />
            <p>No bookings found</p>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Booking">
        <p style={{ color:'var(--sf-text-sub)', marginBottom:16, fontSize:14 }}>
          Rejecting booking for <strong>{rejectModal?.hirerName}</strong> — {rejectModal?.facilityName}
        </p>
        <div className="sf-field" style={{ marginBottom:20 }}>
          <label className="sf-label">Reason (optional — sent to hirer)</label>
          <textarea className="sf-textarea" value={rejectMsg} onChange={e => setRejectMsg(e.target.value)} placeholder="e.g. Date no longer available due to a prior commitment…" style={{ minHeight:80 }} />
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost btn-full" onClick={() => setRejectModal(null)}>Cancel</button>
          <button className="btn btn-danger btn-full" onClick={handleReject}><X size={14} /> Reject Booking</button>
        </div>
      </Modal>

      {/* Hold Modal */}
      <Modal open={!!holdModal} onClose={() => setHoldModal(null)} title="Manage Security Hold">
        <div style={{ padding:'14px 16px', background:'var(--sf-amber-dim)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'var(--r-lg)', marginBottom:20 }}>
          <div style={{ fontWeight:700, color:'var(--sf-amber-lt)', marginBottom:4 }}>
            £{holdModal?.preAuthHold?.amount?.toLocaleString()} hold on card
          </div>
          <div style={{ fontSize:13, color:'var(--sf-text-sub)' }}>{holdModal?.hirerName} · {holdModal?.facilityName}</div>
        </div>
        <p style={{ fontSize:13.5, color:'var(--sf-text-sub)', marginBottom:20 }}>
          Choose what to do with the security deposit:
        </p>
        <div style={{ display:'flex', gap:10, flexDirection:'column' }}>
          <button className="btn btn-success btn-full" onClick={() => handleReleaseHold(holdModal)}>
            <Check size={14} /> Release Hold — No charges apply
          </button>
          <button className="btn btn-danger btn-full" onClick={() => handleChargeHold(holdModal)}>
            <ShieldCheck size={14} /> Charge Hold — Deduct £{holdModal?.preAuthHold?.amount} from card
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => setHoldModal(null)}>Cancel</button>
        </div>
      </Modal>

      <AdminDirectBookingModal
        open={directBookingOpen}
        onClose={() => setDirectBookingOpen(false)}
      />
    </div>
  );
}
