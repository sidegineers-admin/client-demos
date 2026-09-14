import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Cpu, Download, RotateCcw, Zap, Users, Info, Check, ShieldAlert } from 'lucide-react';
import { useDemo } from '../../store/DemoContext.jsx';
import { useApp } from '../../store/SpaceFlowContext.jsx';
import { storage } from '../../store/storage.js';

/* ─── SVG Layout Renderers ─── */

function TheatreLayout({ w, h, capacity }) {
  const rows = Math.min(10, Math.ceil(capacity / 20));
  const seatsPerRow = Math.min(20, Math.ceil(capacity / rows));
  const rowSpacing = (h * 0.7) / rows;
  const seatSpacing = (w * 0.8) / seatsPerRow;
  return (
    <g>
      {/* Stage */}
      <rect x={w*0.15} y={h*0.05} width={w*0.7} height={h*0.1} rx={6} fill="#7C3AED" opacity={0.8} />
      <text x={w*0.5} y={h*0.12} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">STAGE</text>
      {/* Seats */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: seatsPerRow }, (_, s) => (
          <rect key={`${r}-${s}`} x={w*0.1 + s * seatSpacing} y={h*0.2 + r * rowSpacing} width={seatSpacing * 0.7} height={rowSpacing * 0.7} rx={2}
            fill={r % 2 === 0 ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.25)'} stroke="rgba(124,58,237,0.6)" strokeWidth={0.5} />
        ))
      )}
      {/* Centre aisle */}
      <line x1={w*0.5} y1={h*0.2} x2={w*0.5} y2={h*0.95} stroke="rgba(148,163,184,0.15)" strokeWidth={2} strokeDasharray="4,4" />
    </g>
  );
}

function BanquetLayout({ w, h, capacity }) {
  const tables = Math.min(20, Math.ceil(capacity / 10));
  const cols = Math.ceil(Math.sqrt(tables * 1.5));
  const rows = Math.ceil(tables / cols);
  const cellW = (w * 0.85) / cols;
  const cellH = (h * 0.85) / rows;
  const tableR = Math.min(cellW, cellH) * 0.3;
  return (
    <g>
      {Array.from({ length: tables }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = w * 0.08 + col * cellW + cellW / 2;
        const cy = h * 0.08 + row * cellH + cellH / 2;
        const seats = Math.min(10, Math.ceil(capacity / tables));
        return (
          <g key={i}>
            {/* Round table */}
            <circle cx={cx} cy={cy} r={tableR * 0.6} fill="rgba(6,182,212,0.3)" stroke="var(--sf-cyan)" strokeWidth={1.5} />
            {/* Chairs around table */}
            {Array.from({ length: seats }, (_, s) => {
              const angle = (s / seats) * Math.PI * 2 - Math.PI / 2;
              const sx = cx + Math.cos(angle) * tableR;
              const sy = cy + Math.sin(angle) * tableR;
              return <circle key={s} cx={sx} cy={sy} r={tableR * 0.18} fill="rgba(6,182,212,0.5)" stroke="rgba(6,182,212,0.8)" strokeWidth={0.8} />;
            })}
            <text x={cx} y={cy + 4} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9">{i+1}</text>
          </g>
        );
      })}
    </g>
  );
}

function ClassroomLayout({ w, h, capacity }) {
  const cols = Math.min(6, Math.ceil(Math.sqrt(capacity)));
  const rows = Math.ceil(capacity / cols);
  const tableW = (w * 0.75) / cols;
  const tableH = Math.min((h * 0.65) / rows, tableW * 0.5);
  const rowSpacing = (h * 0.72) / rows;
  return (
    <g>
      {/* Whiteboard */}
      <rect x={w*0.1} y={h*0.03} width={w*0.8} height={h*0.07} rx={4} fill="rgba(16,185,129,0.3)" stroke="var(--sf-emerald)" strokeWidth={1.5} />
      <text x={w*0.5} y={h*0.08} textAnchor="middle" fill="var(--sf-emerald)" fontSize="11" fontWeight="600">WHITEBOARD / SCREEN</text>
      {/* Desk rows */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <g key={`${r}-${c}`}>
            <rect x={w*0.1 + c*(tableW + 6)} y={h*0.16 + r*rowSpacing} width={tableW} height={tableH} rx={2}
              fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.5)" strokeWidth={0.8} />
            {/* Chair */}
            <rect x={w*0.1 + c*(tableW+6) + tableW*0.3} y={h*0.16 + r*rowSpacing + tableH + 3} width={tableW*0.4} height={5} rx={2}
              fill="rgba(16,185,129,0.4)" />
          </g>
        ))
      )}
      {/* Aisle */}
      <line x1={w*0.5} y1={h*0.14} x2={w*0.5} y2={h*0.95} stroke="rgba(148,163,184,0.1)" strokeWidth={2} strokeDasharray="3,6" />
    </g>
  );
}

function UShapeLayout({ w, h, capacity }) {
  const sideSeats = Math.floor(capacity / 3);
  const bottomSeats = capacity - sideSeats * 2;
  const tableThick = 16;
  const margin = 0.12;
  return (
    <g>
      {/* Presenter area */}
      <rect x={w*0.3} y={h*0.05} width={w*0.4} height={h*0.08} rx={4} fill="rgba(245,158,11,0.25)" stroke="var(--sf-amber)" strokeWidth={1.5} />
      <text x={w*0.5} y={h*0.1} textAnchor="middle" fill="var(--sf-amber)" fontSize="10" fontWeight="600">PRESENTER</text>
      {/* Left arm */}
      <rect x={w*margin} y={h*0.2} width={tableThick} height={h*0.65} rx={4} fill="rgba(245,158,11,0.2)" stroke="var(--sf-amber)" strokeWidth={1.2} />
      {Array.from({ length: sideSeats }, (_, i) => (
        <rect key={`l${i}`} x={w*margin - 18} y={h*0.22 + i * (h*0.6/sideSeats)} width={14} height={10} rx={2} fill="rgba(245,158,11,0.5)" />
      ))}
      {/* Right arm */}
      <rect x={w*(1-margin) - tableThick} y={h*0.2} width={tableThick} height={h*0.65} rx={4} fill="rgba(245,158,11,0.2)" stroke="var(--sf-amber)" strokeWidth={1.2} />
      {Array.from({ length: sideSeats }, (_, i) => (
        <rect key={`r${i}`} x={w*(1-margin) + 4} y={h*0.22 + i * (h*0.6/sideSeats)} width={14} height={10} rx={2} fill="rgba(245,158,11,0.5)" />
      ))}
      {/* Bottom */}
      <rect x={w*margin + tableThick} y={h*0.85 - tableThick} width={w*(1-margin*2) - tableThick*2} height={tableThick} rx={4} fill="rgba(245,158,11,0.2)" stroke="var(--sf-amber)" strokeWidth={1.2} />
      {Array.from({ length: bottomSeats }, (_, i) => (
        <rect key={`b${i}`} x={w*margin + tableThick + 8 + i * ((w*(1-margin*2)-tableThick*2-16)/bottomSeats)} y={h*0.85} width={12} height={10} rx={2} fill="rgba(245,158,11,0.5)" />
      ))}
    </g>
  );
}

function CabaretLayout({ w, h, capacity }) {
  const tables = Math.min(12, Math.ceil(capacity / 6));
  const cols = Math.ceil(Math.sqrt(tables));
  const rows = Math.ceil(tables / cols);
  const cellW = (w * 0.8) / cols;
  const cellH = (h * 0.6) / rows;
  return (
    <g>
      {/* Stage/Dance floor */}
      <rect x={w*0.2} y={h*0.04} width={w*0.6} height={h*0.2} rx={8} fill="rgba(167,139,250,0.2)" stroke="var(--sf-violet-lt)" strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={w*0.5} y={h*0.15} textAnchor="middle" fill="var(--sf-violet-lt)" fontSize="11" fontWeight="600">DANCE FLOOR / STAGE</text>
      {/* Small round tables */}
      {Array.from({ length: tables }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = w*0.1 + col * cellW + cellW / 2;
        const cy = h*0.32 + row * cellH + cellH / 2;
        const r = Math.min(cellW, cellH) * 0.28;
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="rgba(167,139,250,0.2)" stroke="var(--sf-violet-lt)" strokeWidth={1.2} />
            {Array.from({ length: 4 }, (_, s) => {
              const angle = (s / 4) * Math.PI * 2;
              return <circle key={s} cx={cx + Math.cos(angle)*r*1.5} cy={cy + Math.sin(angle)*r*1.5} r={r*0.28} fill="rgba(167,139,250,0.4)" stroke="var(--sf-violet-lt)" strokeWidth={0.7} />;
            })}
          </g>
        );
      })}
      {/* Bars */}
      <rect x={w*0.85} y={h*0.32} width={w*0.1} height={h*0.55} rx={4} fill="rgba(16,185,129,0.2)" stroke="var(--sf-emerald)" strokeWidth={1} />
      <text x={w*0.9} y={h*0.6} textAnchor="middle" fill="var(--sf-emerald)" fontSize="9" transform={`rotate(90, ${w*0.9}, ${h*0.6})`}>BAR</text>
    </g>
  );
}

const LAYOUT_MODES = [
  { id: 'theatre', label: 'Theatre', desc: 'Rows facing stage', icon: '🎭', Component: TheatreLayout },
  { id: 'banquet', label: 'Banquet', desc: 'Round tables', icon: '🍽️', Component: BanquetLayout },
  { id: 'classroom', label: 'Classroom', desc: 'Desk rows facing board', icon: '📚', Component: ClassroomLayout },
  { id: 'u-shape', label: 'U-Shape', desc: 'U-shaped table', icon: '⊓', Component: UShapeLayout },
  { id: 'cabaret', label: 'Cabaret', desc: 'Small tables + dance floor', icon: '🎵', Component: CabaretLayout },
];

export default function LayoutGeneratorPage() {
  const { session, setSession } = useApp();
  const navigate = useNavigate();
  const { demoTriggers, setDemoTriggers } = useDemo();
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [mode, setMode] = useState('theatre');
  const [capacity, setCapacity] = useState(100);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Gated for Admin & Staff only
  if (session && session.role === 'hirer') {
    return (
      <div style={{ maxWidth: 620, margin: '60px auto 0 auto', textAlign: 'center' }}>
        <div className="sf-card" style={{ padding: '44px 32px' }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            color: '#F59E0B'
          }}>
            <ShieldAlert size={32} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color: 'var(--sf-text)' }}>
            Admin & Venue Planning Only
          </h2>
          <p style={{ fontSize: 14, color: 'var(--sf-text-sub)', lineHeight: 1.6, marginBottom: 28 }}>
            The AI Floorplan & Layout Generator is an internal facility operations tool designed for venue managers to plan room configurations, seating capacities, and turnarounds. It is not part of the hirer portal.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button className="sf-btn sf-btn-ghost" onClick={() => navigate('/app/book')}>
              Back to Explore Spaces
            </button>
            <button 
              className="sf-btn" 
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#000', fontWeight: 600 }}
              onClick={async () => {
                const s = { userId: 'admin@spaceflow.com', name: 'Venue Manager', email: 'admin@spaceflow.com', role: 'admin' };
                await storage.set('session', JSON.stringify(s));
                setSession(s);
              }}
            >
              Switch to Venue Manager (Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Demo triggers
  useEffect(() => {
    if (demoTriggers.simulateUpload && !photo) {
      // Simulate an uploaded photo with a gradient placeholder
      setPhoto('demo');
      setDemoTriggers(t => ({ ...t, simulateUpload: null }));
    }
    if (demoTriggers.generateLayout) {
      handleGenerate();
      setDemoTriggers(t => ({ ...t, generateLayout: null }));
    }
    if (demoTriggers.setLayoutMode) {
      setMode(demoTriggers.setLayoutMode);
      setDemoTriggers(t => ({ ...t, setLayoutMode: null }));
    }
  }, [demoTriggers]);

  function handleFileChange(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => setPhoto(e.target.result);
    reader.readAsDataURL(file);
    setGenerated(false);
  }

  async function handleGenerate() {
    if (!photo) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 2200)); // simulate AI processing
    setGenerated(true);
    setGenerating(false);
  }

  function handleExport() {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `space-flow-layout-${mode}.svg`;
    a.click();
  }

  const activeMode = LAYOUT_MODES.find(m => m.id === mode) || LAYOUT_MODES[0];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 'var(--r-lg)', background: 'var(--sf-violet-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Cpu size={22} />
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>AI Layout Generator</h1>
            <p className="page-subtitle">Upload a hall photo to generate professional room layouts</p>
          </div>
          <span className="badge badge-violet" style={{ marginLeft: 8 }}>Prototype</span>
        </div>
      </div>

      <div style={{ padding: '14px 18px', background: 'var(--sf-violet-dim)', border: '1px solid var(--sf-border-v)', borderRadius: 'var(--r-lg)', marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, color: 'var(--sf-text-sub)' }}>
        <Info size={16} style={{ color: 'var(--sf-violet-lt)', flexShrink: 0, marginTop: 2 }} />
        <span>This is a prototype demonstration. In a production system, the uploaded photo would be analysed by a computer vision AI to detect room dimensions, obstacles and lighting zones — generating an optimised layout automatically. Here, we use deterministic SVG templates.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left panel — upload + controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Photo upload */}
          <div className="sf-card sf-card-sm">
            <div className="sf-label">1. Upload hall photo</div>
            <div
              className={`layout-drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
              onClick={() => document.getElementById('hall-photo-input').click()}
              style={{ padding: photo ? '12px' : '40px 30px' }}>
              <input id="hall-photo-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e.target.files[0])} />
              {photo && photo !== 'demo' ? (
                <img src={photo} alt="Hall" style={{ width: '100%', borderRadius: 'var(--r-md)', maxHeight: 180, objectFit: 'cover' }} />
              ) : photo === 'demo' ? (
                <div style={{ width: '100%', height: 160, borderRadius: 'var(--r-md)', background: 'linear-gradient(135deg, #0C0E2A, #1a1f5e, #0C0E2A)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ fontSize: 40 }}>🏛️</div>
                  <div style={{ fontSize: 12.5, color: 'var(--sf-text-mute)' }}>grand_ballroom_interior.jpg</div>
                  <span className="badge badge-emerald" style={{ fontSize: 10 }}><Check size={9} /> Uploaded</span>
                </div>
              ) : (
                <>
                  <Upload size={36} style={{ color: 'var(--sf-violet-lt)', margin: '0 auto 12px', display: 'block', opacity: 0.8 }} />
                  <div style={{ fontWeight: 600, color: 'var(--sf-text)', marginBottom: 6 }}>Drop hall photo here</div>
                  <div style={{ fontSize: 13, color: 'var(--sf-text-mute)' }}>or click to browse · JPG, PNG, WebP</div>
                </>
              )}
            </div>
            {photo && (
              <button className="btn btn-ghost btn-sm btn-full" style={{ marginTop: 8 }} onClick={() => { setPhoto(null); setGenerated(false); }}>
                <RotateCcw size={13} /> Clear photo
              </button>
            )}
          </div>

          {/* Capacity */}
          <div className="sf-card sf-card-sm">
            <div className="sf-label">2. Expected capacity</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={16} style={{ color: 'var(--sf-text-mute)', flexShrink: 0 }} />
              <input className="sf-input" type="number" value={capacity} min={10} max={2000} onChange={e => { setCapacity(parseInt(e.target.value)||10); setGenerated(false); }} style={{ flex: 1 }} />
              <span style={{ fontSize: 13, color: 'var(--sf-text-mute)', whiteSpace: 'nowrap' }}>persons</span>
            </div>
          </div>

          {/* Layout mode */}
          <div className="sf-card sf-card-sm">
            <div className="sf-label">3. Layout mode</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {LAYOUT_MODES.map(lm => (
                <button
                  key={lm.id} id={`layout-${lm.id}`}
                  className={`layout-mode-btn ${mode === lm.id ? 'active' : ''}`}
                  onClick={() => { setMode(lm.id); setGenerated(false); }}>
                  <span style={{ fontSize: 22 }}>{lm.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{lm.label}</span>
                  <span style={{ fontSize: 10, color: 'var(--sf-text-mute)' }}>{lm.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            className="btn btn-primary btn-full btn-lg"
            disabled={!photo || generating}
            onClick={handleGenerate}>
            {generating ? (
              <><span className="spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block' }} /> Analysing photo…</>
            ) : (
              <><Cpu size={17} /> {generated ? 'Regenerate Layout' : 'Generate Layout'}</>
            )}
          </button>
        </div>

        {/* Right panel — SVG layout output */}
        <div className="sf-card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--sf-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{activeMode.icon} {activeMode.label} Layout</div>
              <div style={{ fontSize: 12, color: 'var(--sf-text-mute)', marginTop: 2 }}>{capacity} persons · {activeMode.desc}</div>
            </div>
            {generated && (
              <button id="export-btn" className="btn btn-secondary btn-sm" onClick={handleExport}>
                <Download size={13} /> Export SVG
              </button>
            )}
          </div>

          {/* SVG canvas */}
          <div style={{ padding: 20, position: 'relative' }}>
            {!photo && !generated && (
              <div style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--sf-text-mute)', gap: 12 }}>
                <Cpu size={48} style={{ opacity: 0.2 }} />
                <p style={{ fontSize: 14 }}>Upload a hall photo and click Generate</p>
              </div>
            )}

            {generating && (
              <div style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid var(--sf-border)', borderTop: '3px solid var(--sf-violet)', animation: 'spin 1s linear infinite' }} />
                  <Cpu size={28} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'var(--sf-violet-lt)' }} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: 'var(--sf-violet-lt)', marginBottom: 6 }}>Analysing space…</div>
                  <div style={{ fontSize: 13, color: 'var(--sf-text-mute)' }}>Detecting dimensions, obstacles and optimal flow paths</div>
                </div>
              </div>
            )}

            {generated && !generating && (
              <div style={{ animation: 'fadeUp 0.4s ease' }}>
                {/* SVG layout */}
                <svg ref={svgRef} viewBox="0 0 600 400" width="100%" style={{ background: 'var(--sf-bg-surface)', borderRadius: 'var(--r-lg)', border: '1px solid var(--sf-border)' }}>
                  {/* Room outline */}
                  <rect x={2} y={2} width={596} height={396} rx={8} fill="var(--sf-bg-card)" stroke="var(--sf-border-hi)" strokeWidth={2} />
                  {/* Entrance markers */}
                  <rect x={270} y={392} width={60} height={6} rx={3} fill="var(--sf-emerald)" opacity={0.8} />
                  <text x={300} y={405} textAnchor="middle" fill="var(--sf-text-mute)" fontSize="9">ENTRANCE</text>
                  {/* Windows */}
                  {[0.15, 0.35, 0.55, 0.75].map((p, i) => (
                    <rect key={i} x={p * 596} y={2} width={40} height={6} rx={2} fill="var(--sf-cyan)" opacity={0.5} />
                  ))}
                  {/* Layout */}
                  <activeMode.Component w={580} h={370} capacity={capacity} />
                  {/* Compass */}
                  <text x={570} y={18} fill="var(--sf-text-mute)" fontSize="10" textAnchor="middle">N↑</text>
                  {/* Scale */}
                  <line x1={20} y1={380} x2={70} y2={380} stroke="var(--sf-text-mute)" strokeWidth={1} />
                  <text x={45} y={395} fill="var(--sf-text-mute)" fontSize="9" textAnchor="middle">10m</text>
                </svg>

                {/* Legend */}
                <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11.5 }}>
                  {activeMode.id === 'theatre' && [
                    { col: '#7C3AED', label: 'Stage' },
                    { col: 'rgba(124,58,237,0.4)', label: 'Seating' },
                  ].map(l => <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, color:'var(--sf-text-mute)' }}><div style={{ width:10, height:10, borderRadius:2, background:l.col }} />{l.label}</div>)}
                  {activeMode.id === 'banquet' && [
                    { col: 'rgba(6,182,212,0.3)', label: 'Round tables' },
                    { col: 'rgba(6,182,212,0.5)', label: 'Chairs (×8/table)' },
                  ].map(l => <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, color:'var(--sf-text-mute)' }}><div style={{ width:10, height:10, borderRadius:2, background:l.col }} />{l.label}</div>)}
                  <div style={{ display:'flex', alignItems:'center', gap:5, color:'var(--sf-text-mute)' }}><div style={{ width:10, height:5, background:'var(--sf-emerald)', borderRadius:2 }} />Entrance</div>
                  <div style={{ display:'flex', alignItems:'center', gap:5, color:'var(--sf-text-mute)' }}><div style={{ width:10, height:5, background:'var(--sf-cyan)', borderRadius:2 }} />Windows</div>
                </div>

                {/* Stats */}
                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {[
                    { label: 'Seated capacity', val: capacity },
                    { label: 'Layout mode', val: activeMode.label },
                    { label: 'Aisle clearance', val: '1.2m' },
                  ].map(s => (
                    <div key={s.label} style={{ padding: '10px', background: 'var(--sf-bg-surface)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--sf-violet-lt)' }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
