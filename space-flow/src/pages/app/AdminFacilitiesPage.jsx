import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Save, X, ChevronDown, ChevronUp, Timer, Zap, ImagePlus, Check, MapPin } from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';
import { uid } from '../../store/storage.js';
import Modal from '../../components/ui/Modal.jsx';

const FACILITY_TYPES = ['Ballroom', 'Conference Room', 'Sports Ground', 'Photography Studio', 'Outdoor Venue', 'Theatre', 'Studio', 'Exhibition Hall', 'Other'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DEFAULT_EVENT_TYPES = ['Meeting', 'Training', 'Workshop', 'Conference', 'Wedding', 'Party', 'Reception', 'Match', 'Practice', 'Exhibition', 'Photoshoot', 'Filming'];

function emptyFacility() {
  return {
    id: uid(),
    name: '', type: 'Conference Room', description: '',
    locationName: 'Central London Hub',
    city: 'London',
    areaDistrict: 'Westminster',
    address: '',
    postcode: '',
    travelHint: '',
    capacity: 50, area: 100,
    baseHourlyRate: 100, minBookingHours: 1, maxBookingHours: 12,
    eventTypes: ['Meeting', 'Training', 'Workshop'],
    amenities: [],
    colorGrad: 'linear-gradient(135deg, #0E7490 0%, #06B6D4 100%)',
    accentColor: '#22D3EE',
    bufferRules: { default: { setup: 30, teardown: 30 } },
    preAuthAmount: 300,
    openHours: { start: 8, end: 20 },
    availableDays: [1,2,3,4,5],
    peakMultiplier: 1.2,
    active: true,
    createdAt: Date.now(),
  };
}

function BufferRuleRow({ eventType, rule, onChange, onDelete }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 140px auto', gap: 10, alignItems: 'center', padding: '10px 14px', background: 'var(--sf-bg-raised)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-md)', marginBottom: 8 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{eventType}</span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--sf-cyan)', marginBottom: 3 }}>Setup: {rule.setup}min</div>
        <input type="range" className="buffer-slider" min={0} max={300} step={15} value={rule.setup}
          onChange={e => onChange({ ...rule, setup: parseInt(e.target.value) })} />
      </div>
      <div>
        <div style={{ fontSize: 10, color: 'var(--sf-amber)', marginBottom: 3 }}>Teardown: {rule.teardown}min</div>
        <input type="range" className="buffer-slider" min={0} max={360} step={15} value={rule.teardown}
          onChange={e => onChange({ ...rule, teardown: parseInt(e.target.value) })} />
      </div>
      {eventType !== 'default' && (
        <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--sf-text-mute)', cursor: 'pointer', padding: 4 }}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function FacilityForm({ facility: init, onSave, onCancel }) {
  const [f, setF] = useState({ ...init });
  const [newEventType, setNewEventType] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [newBufferType, setNewBufferType] = useState('');

  function setField(key, val) { setF(prev => ({ ...prev, [key]: val })); }

  function addEventType(et) {
    if (!et || f.eventTypes.includes(et)) return;
    setF(prev => ({ ...prev, eventTypes: [...prev.eventTypes, et] }));
    setNewEventType('');
  }

  function addBufferRule(et) {
    if (!et || f.bufferRules[et]) return;
    setF(prev => ({ ...prev, bufferRules: { ...prev.bufferRules, [et]: { setup: 30, teardown: 30 } } }));
    setNewBufferType('');
  }

  const valid = f.name.trim().length > 0 && f.baseHourlyRate > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Basic Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="sf-field" style={{ gridColumn: '1 / -1' }}>
          <label className="sf-label">Facility name *</label>
          <input className="sf-input" value={f.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Grand Conference Hall" required />
        </div>
        <div className="sf-field">
          <label className="sf-label">Type *</label>
          <select className="sf-select" value={f.type} onChange={e => setField('type', e.target.value)}>
            {FACILITY_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="sf-field">
          <label className="sf-label">Base hourly rate (£)</label>
          <input className="sf-input" type="number" value={f.baseHourlyRate} onChange={e => setField('baseHourlyRate', parseFloat(e.target.value) || 0)} min={0} />
        </div>
        <div className="sf-field">
          <label className="sf-label">Capacity (persons)</label>
          <input className="sf-input" type="number" value={f.capacity} onChange={e => setField('capacity', parseInt(e.target.value) || 0)} min={1} />
        </div>
        <div className="sf-field">
          <label className="sf-label">Area (m²)</label>
          <input className="sf-input" type="number" value={f.area} onChange={e => setField('area', parseInt(e.target.value) || 0)} min={1} />
        </div>
        <div className="sf-field">
          <label className="sf-label">Min booking (hours)</label>
          <input className="sf-input" type="number" value={f.minBookingHours} onChange={e => setField('minBookingHours', parseInt(e.target.value) || 1)} min={1} />
        </div>
        <div className="sf-field">
          <label className="sf-label">Pre-auth hold (£)</label>
          <input className="sf-input" type="number" value={f.preAuthAmount} onChange={e => setField('preAuthAmount', parseFloat(e.target.value) || 0)} min={0} />
        </div>
        <div className="sf-field" style={{ gridColumn: '1 / -1' }}>
          <label className="sf-label">Description</label>
          <textarea className="sf-textarea" value={f.description} onChange={e => setField('description', e.target.value)} placeholder="Describe the facility…" />
        </div>
      </div>

      {/* Location & Campus */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: 14, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-lg)' }}>
        <div className="sf-field">
          <label className="sf-label">Campus / Location Name *</label>
          <input className="sf-input" value={f.locationName || ''} onChange={e => setField('locationName', e.target.value)} placeholder="e.g. MediaCityUK Creative Village" />
        </div>
        <div className="sf-field">
          <label className="sf-label">City *</label>
          <input className="sf-input" value={f.city || ''} onChange={e => setField('city', e.target.value)} placeholder="e.g. Manchester / London / Birmingham" />
        </div>
        <div className="sf-field" style={{ gridColumn: '1 / -1' }}>
          <label className="sf-label">Full Street Address & Postcode</label>
          <input className="sf-input" value={f.address || ''} onChange={e => setField('address', e.target.value)} placeholder="e.g. Studio Block 4, MediaCityUK, Salford, M50 2EQ" />
        </div>
        <div className="sf-field" style={{ gridColumn: '1 / -1' }}>
          <label className="sf-label">Transit / Directions Hint</label>
          <input className="sf-input" value={f.travelHint || ''} onChange={e => setField('travelHint', e.target.value)} placeholder="e.g. 2 min walk from MediaCityUK Tram stop" />
        </div>
      </div>

      {/* Open hours */}
      <div>
        <div className="sf-label">Open hours</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="sf-field" style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>From</label>
            <input className="sf-input sf-input-sm" type="number" value={f.openHours.start} onChange={e => setF(p => ({ ...p, openHours: { ...p.openHours, start: parseInt(e.target.value) } }))} min={0} max={23} />
          </div>
          <span style={{ color: 'var(--sf-text-mute)', marginTop: 14 }}>–</span>
          <div className="sf-field" style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>To</label>
            <input className="sf-input sf-input-sm" type="number" value={f.openHours.end} onChange={e => setF(p => ({ ...p, openHours: { ...p.openHours, end: parseInt(e.target.value) } }))} min={0} max={24} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {DAYS.map((d, i) => {
            const active = f.availableDays.includes(i);
            return (
              <button key={d} type="button"
                onClick={() => setF(p => ({ ...p, availableDays: active ? p.availableDays.filter(x => x !== i) : [...p.availableDays, i].sort() }))}
                style={{ padding:'6px 10px', borderRadius:'var(--r-sm)', border:`1px solid ${active ? 'var(--sf-violet)':'var(--sf-border)'}`, background: active?'var(--sf-violet-dim)':'transparent', color: active?'var(--sf-violet-lt)':'var(--sf-text-mute)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 160ms' }}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Event types */}
      <div>
        <div className="sf-label">Event types</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {f.eventTypes.map(et => (
            <span key={et} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:'var(--r-pill)', background:'var(--sf-violet-dim)', border:'1px solid rgba(124,58,237,0.3)', fontSize:12, color:'var(--sf-violet-lt)' }}>
              {et}
              <button onClick={() => setF(p => ({ ...p, eventTypes: p.eventTypes.filter(x => x !== et) }))}
                style={{ background:'none', border:'none', color:'inherit', cursor:'pointer', padding:0, display:'flex' }}><X size={10} /></button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="sf-select sf-input-sm" value={newEventType} onChange={e => setNewEventType(e.target.value)} style={{ flex:1 }}>
            <option value="">Add event type…</option>
            {DEFAULT_EVENT_TYPES.filter(t => !f.eventTypes.includes(t)).map(t => <option key={t}>{t}</option>)}
          </select>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addEventType(newEventType)}><Plus size={13} /></button>
        </div>
      </div>

      {/* Buffer rules */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div className="sf-label" style={{ margin: 0 }}>Buffer rules</div>
          <span className="badge badge-cyan" style={{ fontSize: 10 }}>Per event type</span>
        </div>
        {Object.entries(f.bufferRules).map(([et, rule]) => (
          <BufferRuleRow key={et} eventType={et} rule={rule}
            onChange={r => setF(p => ({ ...p, bufferRules: { ...p.bufferRules, [et]: r } }))}
            onDelete={() => setF(p => { const { [et]: _, ...rest } = p.bufferRules; return { ...p, bufferRules: rest }; })} />
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <select className="sf-select sf-input-sm" value={newBufferType} onChange={e => setNewBufferType(e.target.value)} style={{ flex:1 }}>
            <option value="">Add override for event type…</option>
            {f.eventTypes.filter(t => !f.bufferRules[t]).map(t => <option key={t}>{t}</option>)}
          </select>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addBufferRule(newBufferType)}><Plus size={13} /></button>
        </div>
      </div>

      {/* Active toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-lg)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Active / Published</div>
          <div style={{ fontSize: 12.5, color: 'var(--sf-text-mute)' }}>Inactive facilities won't appear in Explore Spaces</div>
        </div>
        <button type="button" onClick={() => setField('active', !f.active)}
          style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', transition: 'all 300ms', background: f.active ? 'var(--sf-emerald)' : 'var(--sf-bg-raised)', position: 'relative' }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: f.active ? 24 : 4, transition: 'left 300ms', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="btn btn-primary" style={{ flex:1 }} disabled={!valid} onClick={() => onSave(f)}>
          <Save size={15} /> Save Facility
        </button>
      </div>
    </div>
  );
}

export default function AdminFacilitiesPage() {
  const { facilities, saveFacility, deleteFacility, showToast, session } = useApp();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [newFacility, setNewFacility] = useState(null);

  if (!session || !['admin','staff'].includes(session.role)) {
    return <div style={{ padding: 40, color: 'var(--sf-text-mute)' }}>Access denied</div>;
  }

  async function handleSave(facility) {
    await saveFacility(facility);
    setEditingId(null);
    setShowForm(false);
    setNewFacility(null);
    showToast(`Facility "${facility.name}" saved`, 'ok');
  }

  async function handleDelete() {
    if (!deleteModal) return;
    await deleteFacility(deleteModal.id);
    showToast(`Facility "${deleteModal.name}" deleted`, 'info');
    setDeleteModal(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Facilities</h1>
          <p className="page-subtitle">Create and manage your venue's bookable spaces</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setNewFacility(emptyFacility()); setShowForm(true); setEditingId(null); }}>
          <Plus size={15} /> Add Facility
        </button>
      </div>

      {/* New Facility Form */}
      {showForm && newFacility && (
        <div className="sf-card" style={{ marginBottom: 24, border: '1px solid var(--sf-border-v)', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 20, color: 'var(--sf-violet-lt)' }}>
            + New Facility
          </div>
          <FacilityForm facility={newFacility} onSave={handleSave} onCancel={() => { setShowForm(false); setNewFacility(null); }} />
        </div>
      )}

      {/* Facility list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {facilities.map(f => (
          <div key={f.id} className="sf-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px' }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--r-lg)', background: f.colorGrad, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>{f.name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-violet">{f.type}</span>
                  {f.locationName && (
                    <span className="badge badge-cyan">
                      <MapPin size={10} /> {f.locationName} ({f.city})
                    </span>
                  )}
                  <span className={`badge ${f.active ? 'badge-emerald' : 'badge-gray'}`}>{f.active ? 'Active' : 'Inactive'}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--sf-text-mute)' }}>£{f.baseHourlyRate}/hr · {f.capacity} cap</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(editingId === f.id ? null : f.id)}>
                  <Edit3 size={13} /> {editingId === f.id ? 'Close' : 'Edit'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteModal(f)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Expanded editor */}
            {editingId === f.id && (
              <div style={{ borderTop: '1px solid var(--sf-border)', padding: '22px', background: 'var(--sf-bg-surface)', animation: 'fadeUp 0.2s ease' }}>
                <FacilityForm facility={f} onSave={handleSave} onCancel={() => setEditingId(null)} />
              </div>
            )}
          </div>
        ))}
      </div>

      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Facility">
        <p style={{ color: 'var(--sf-text-sub)', marginBottom: 20 }}>
          Are you sure you want to delete <strong>{deleteModal?.name}</strong>? This action cannot be undone and existing bookings will remain.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-full" onClick={() => setDeleteModal(null)}>Cancel</button>
          <button className="btn btn-danger btn-full" onClick={handleDelete}>Delete Facility</button>
        </div>
      </Modal>
    </div>
  );
}
