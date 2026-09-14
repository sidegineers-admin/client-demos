import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CreditCard, Clock, Users, ShieldCheck, BarChart2, Cpu, Zap, Check, ArrowRight, Star, Building2, ChevronRight, Play } from 'lucide-react';
import { useDemo } from '../store/DemoContext.jsx';

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function FadeSection({ children, alt = false, id }) {
  const [ref, inView] = useInView();
  return (
    <section ref={ref} id={id} className={`pres-section ${alt ? 'pres-section-alt' : ''}`}
      style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(28px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
      <div className="container">{children}</div>
    </section>
  );
}

function AnimNum({ target, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    let cur = 0; const step = target / 40;
    const t = setInterval(() => {
      cur += step;
      if (cur >= target) { setVal(target); clearInterval(t); } else setVal(Math.floor(cur));
    }, 28);
    return () => clearInterval(t);
  }, [inView, target]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

/* ─── Mock booking screen ─── */
function MockScreen() {
  const [selected, setSelected] = useState([10]);
  const slots = [8, 9, 10, 11, 12, 13, 14, 15];
  const booked = [9];
  const buffers = [8, 15]; // setup / teardown
  return (
    <div className="mock-screen" style={{ width: 320, flexShrink: 0 }}>
      <div className="mock-screen-bar">
        {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} className="mock-dot" style={{ background: c }} />)}
        <span style={{ fontSize: 11, color: 'var(--sf-text-mute)', marginLeft: 8 }}>space-flow.app/book</span>
      </div>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--sf-border)' }}>
        <div style={{ fontSize: 11, color: 'var(--sf-text-mute)', marginBottom: 4 }}>Grand Ballroom · Fri 19 Sep 2026</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d, i) => (
            <div key={d} style={{ flex:1, textAlign:'center', padding:'4px 2px', borderRadius:5, fontSize:9,
              background: i === 4 ? 'var(--sf-violet-grad)' : 'rgba(148,163,184,0.06)',
              border: `1px solid ${i === 4 ? 'var(--sf-violet)' : 'var(--sf-border)'}`,
              color: i === 4 ? '#fff' : 'var(--sf-text-mute)' }}>{d}</div>
          ))}
        </div>
      </div>
      <div style={{ padding: '8px 0', maxHeight: 220, overflowY: 'auto' }}>
        {slots.map(h => {
          const isBooked = booked.includes(h);
          const isBuf = buffers.includes(h);
          const isSel = selected.includes(h);
          const bg = isBooked ? 'var(--slot-booked)' : isBuf ? 'var(--slot-setup)' : isSel ? 'var(--slot-selected)' : 'var(--slot-available)';
          const bd = isBooked ? '2px solid var(--slot-booked-bd)' : isBuf ? '2px solid var(--slot-setup-bd)' : isSel ? '2px solid var(--slot-selected-bd)' : '2px solid var(--slot-available-bd)';
          const label = isBooked ? 'Booked' : isBuf ? 'Buffer' : isSel ? 'Selected ✓' : '£850/hr';
          return (
            <div key={h}
              onClick={() => !isBooked && !isBuf && setSelected(s => s.includes(h) ? s.filter(x => x !== h) : [...s, h])}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 14px', background:bg, borderLeft:bd, cursor: isBooked||isBuf ? 'not-allowed' : 'pointer', margin:'2px 8px', borderRadius:6 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--sf-text-mute)', width:34 }}>{String(h).padStart(2,'0')}:00</span>
              <span style={{ fontSize:11.5, flex:1, color: isBooked?'var(--sf-violet-lt)': isBuf?'var(--sf-cyan)': isSel?'var(--sf-violet-lt)':'var(--sf-emerald-lt)' }}>{label}</span>
              {isSel && <Check size={12} style={{ color:'var(--sf-violet-lt)' }} />}
            </div>
          );
        })}
      </div>
      <div style={{ padding:'10px 14px', borderTop:'2px solid var(--sf-violet)', background:'var(--sf-bg-surface)' }}>
        <div style={{ fontSize:11, color:'var(--sf-text-mute)', marginBottom:6 }}>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--sf-violet-lt)' }}>{selected.length}</span> slots · £{selected.length * 850 * 1.5} (Wedding rate)
        </div>
        <div style={{ background:'var(--sf-violet-grad)', color:'#fff', fontSize:12, fontWeight:700, textAlign:'center', borderRadius:8, padding:'7px 0' }}>
          Proceed to Booking →
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: <Building2 size={22} />, title: 'Custom Facility Management', desc: 'Add any space — ballrooms, pitches, studios, rooftops. Define capacity, hourly rates, amenities and event types.', color: '#7C3AED' },
  { icon: <Clock size={22} />, title: 'Dynamic Buffer Engine', desc: 'Smart setup & teardown buffers auto-calculated per facility type and event. Weddings get 3h setup; meetings get 15min.', color: '#06B6D4' },
  { icon: <CalendarDays size={22} />, title: 'Visual Availability Grid', desc: 'Colour-coded hourly slots show available, buffers, booked, held and blocked states at a glance.', color: '#10B981' },
  { icon: <CreditCard size={22} />, title: 'Payments & Invoicing', desc: 'Auto card payment or manual bank transfer. Auto-generate invoices with PDF-ready layouts.', color: '#F59E0B' },
  { icon: <ShieldCheck size={22} />, title: 'Card Pre-Auth Hold', desc: 'Capture a security deposit on the hirer\'s card without charging. Release or charge on the day.', color: '#EF4444' },
  { icon: <Users size={22} />, title: 'Approval Workflow', desc: 'Choose auto-confirm or manual human approval per booking. Staff get notified instantly.', color: '#A78BFA' },
  { icon: <BarChart2 size={22} />, title: 'Analytics & Reporting', desc: 'Revenue trends, utilisation heatmaps, top hirers and booking funnel — all in real-time.', color: '#22D3EE' },
  { icon: <Cpu size={22} />, title: 'AI Layout Generator', desc: 'Upload a hall photo and generate Theatre, Banquet, Classroom, U-Shape or Cabaret layouts instantly.', color: '#34D399' },
];

const STATS = [
  { value: 2400, suffix: '+', label: 'Bookings managed' },
  { value: 98, suffix: '%', label: 'Approval rate' },
  { value: 340, prefix: '£', suffix: 'k', label: 'Revenue processed' },
  { value: 6, suffix: ' venue types', label: 'Supported' },
];

export default function PresentationPage() {
  const navigate = useNavigate();
  const { triggerJourney, JOURNEYS } = useDemo();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  function launchJourney(id) {
    triggerJourney(id);
  }

  return (
    <div className="pres">
      {/* ─── STICKY NAV ─── */}
      <nav className={`pres-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="sf-wordmark" style={{ fontSize: 24 }}>Space·Flow</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="#features" style={{ fontSize: 13.5, color: 'var(--sf-text-mute)', transition: 'color 160ms' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--sf-text)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--sf-text-mute)'}>Features</a>
          <a href="#journeys" style={{ fontSize: 13.5, color: 'var(--sf-text-mute)', transition: 'color 160ms' }}
            onMouseOver={e => e.currentTarget.style.color = 'var(--sf-text)'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--sf-text-mute)'}>Demo</a>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/auth')}>
            Get Started <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="pres-hero">
        <div className="pres-hero-bg" />
        <div className="pres-hero-grid" />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 60, alignItems: 'center' }}>
            <div>
              <div className="pres-hero-eyebrow">
                <Zap size={12} /> Intelligent · Flexible · Beautiful
              </div>
              <h1 className="pres-hero-title">
                Book Any Venue,<br /><span className="grad">Effortlessly</span>
              </h1>
              <p className="pres-hero-sub">
                Space-Flow is the all-in-one facility booking platform for venues of any size. Halls, pitches, studios, terraces — managed with smart buffers, automated payments and real-time availability.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-xl" onClick={() => navigate('/app/auth')}>
                  Start Booking <ArrowRight size={18} />
                </button>
                <button className="btn btn-ghost btn-xl" onClick={() => document.getElementById('journeys')?.scrollIntoView({ behavior: 'smooth' })}>
                  <Play size={16} /> Watch Demo
                </button>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 28, flexWrap: 'wrap' }}>
                {['No setup fees', 'All facility types', 'Live availability'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--sf-text-mute)' }}>
                    <Check size={14} style={{ color: 'var(--sf-emerald)' }} /> {f}
                  </div>
                ))}
              </div>
            </div>
            <MockScreen />
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <FadeSection>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          {STATS.map(s => (
            <div key={s.label} className="pres-stat">
              <div className="pres-stat-value" style={{ background: 'linear-gradient(135deg, #A78BFA, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                <AnimNum target={s.value} prefix={s.prefix || ''} suffix={s.suffix || ''} />
              </div>
              <div className="pres-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ─── FEATURES ─── */}
      <FadeSection alt id="features">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="pres-hero-eyebrow" style={{ justifyContent: 'center', display: 'inline-flex', marginBottom: 14 }}><Star size={12} /> Platform Features</div>
          <h2 className="pres-section-title">Everything a venue needs</h2>
          <p style={{ fontSize: 16, color: 'var(--sf-text-sub)', maxWidth: 540, margin: '0 auto' }}>
            From a single meeting room to a 500-person ballroom — Space-Flow has every tool to run your facility booking operation.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon" style={{ background: f.color + '20', border: `1px solid ${f.color}40` }}>
                <span style={{ color: f.color }}>{f.icon}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, fontFamily: 'var(--font-display)' }}>{f.title}</div>
              <div style={{ fontSize: 13.5, color: 'var(--sf-text-sub)', lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ─── BUFFER EXPLAINER ─── */}
      <FadeSection>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div className="pres-hero-eyebrow" style={{ marginBottom: 18 }}><Clock size={12} /> Buffer Engine</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 800, marginBottom: 16, lineHeight: 1.1 }}>
              Smart buffers that<br /><span style={{ color: 'var(--sf-violet-lt)' }}>adapt to every event</span>
            </h2>
            <p style={{ color: 'var(--sf-text-sub)', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              Not all events need the same turnaround. A wedding needs 3 hours of setup and 4 hours to clear. A meeting needs just 15 minutes each way. Space-Flow applies the right buffer automatically — no double-bookings, no stress.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { event: 'Wedding', setup: '3h setup', teardown: '4h teardown', col: 'var(--sf-violet-lt)' },
                { event: 'Conference', setup: '1h setup', teardown: '90min teardown', col: 'var(--sf-cyan)' },
                { event: 'Meeting', setup: '15min setup', teardown: '15min teardown', col: 'var(--sf-emerald)' },
              ].map(r => (
                <div key={r.event} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-lg)' }}>
                  <span style={{ fontWeight: 700, color: r.col, width: 90, fontSize: 13 }}>{r.event}</span>
                  <span className="buffer-badge buffer-badge-setup">{r.setup}</span>
                  <span className="buffer-badge buffer-badge-teardown">{r.teardown}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Visual slot grid */}
          <div>
            <div style={{ background: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-xl)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--sf-border)', fontSize: 12, color: 'var(--sf-text-mute)' }}>Grand Ballroom · Friday 19 Sep</div>
              {[
                { h: '10:00', state: 'setup', label: 'Setup buffer', desc: '3hr setup for Wedding' },
                { h: '11:00', state: 'setup', label: 'Setup buffer', desc: '' },
                { h: '12:00', state: 'setup', label: 'Setup buffer', desc: '' },
                { h: '13:00', state: 'booked', label: 'Wedding Reception', desc: 'Eleanor & James — 280 guests' },
                { h: '14:00', state: 'booked', label: 'Wedding Reception', desc: '' },
                { h: '15:00', state: 'booked', label: 'Wedding Reception', desc: '' },
                { h: '16:00', state: 'booked', label: 'Wedding Reception', desc: '' },
                { h: '17:00', state: 'teardown', label: 'Teardown buffer', desc: '4hr clear' },
                { h: '18:00', state: 'teardown', label: 'Teardown buffer', desc: '' },
              ].map((row, i) => {
                const bd = row.state === 'setup' ? 'var(--slot-setup-bd)' : row.state === 'booked' ? 'var(--slot-booked-bd)' : 'var(--slot-teardown-bd)';
                const bg = row.state === 'setup' ? 'var(--slot-setup)' : row.state === 'booked' ? 'var(--slot-booked)' : 'var(--slot-teardown)';
                const col = row.state === 'setup' ? 'var(--sf-cyan-lt)' : row.state === 'booked' ? 'var(--sf-violet-lt)' : 'var(--sf-amber-lt)';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: bg, borderLeft: `3px solid ${bd}`, borderBottom: '1px solid var(--sf-border)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--sf-text-mute)', width: 40 }}>{row.h}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: col, flex: 1 }}>{row.label}</span>
                    {row.desc && <span style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>{row.desc}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </FadeSection>

      {/* ─── DEMO JOURNEYS ─── */}
      <FadeSection alt id="journeys">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="pres-hero-eyebrow" style={{ justifyContent: 'center', display: 'inline-flex', marginBottom: 14 }}><Play size={12} /> Interactive Demo</div>
          <h2 className="pres-section-title">Experience it live</h2>
          <p style={{ fontSize: 15, color: 'var(--sf-text-sub)', maxWidth: 480, margin: '0 auto' }}>
            Launch a guided demo journey to see Space-Flow in action. No sign-up needed.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          {Object.entries(JOURNEYS).map(([id, j]) => (
            <div key={id} className="journey-card" onClick={() => launchJourney(id)}>
              <div style={{ width: 52, height: 52, borderRadius: 'var(--r-lg)', background: 'var(--sf-violet-dim)', border: '1px solid var(--sf-border-v)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Play size={22} style={{ color: 'var(--sf-violet-lt)' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{j.label}</div>
              <div style={{ fontSize: 13, color: 'var(--sf-text-mute)', marginBottom: 16, lineHeight: 1.5 }}>
                {j.steps?.length} guided steps · {Math.ceil((j.steps?.length || 4) * 3.6 / 60)} min
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', color: 'var(--sf-violet-lt)', fontSize: 13.5, fontWeight: 600 }}>
                Launch Journey <ChevronRight size={15} />
              </div>
            </div>
          ))}
        </div>
      </FadeSection>

      {/* ─── CTA ─── */}
      <FadeSection>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 900, marginBottom: 16, background: 'linear-gradient(135deg, #A78BFA 0%, #06B6D4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Ready to go?
          </h2>
          <p style={{ fontSize: 17, color: 'var(--sf-text-sub)', marginBottom: 32 }}>Sign in with a demo account to explore all features interactively.</p>
          <button className="btn btn-primary btn-xl" onClick={() => navigate('/app/auth')}>
            Enter Space-Flow <ArrowRight size={18} />
          </button>
        </div>
      </FadeSection>

      {/* ─── FOOTER ─── */}
      <footer style={{ borderTop: '1px solid var(--sf-border)', padding: '28px 0', textAlign: 'center' }}>
        <div className="container">
          <div className="sf-wordmark" style={{ fontSize: 18, display: 'inline-block', marginBottom: 6 }}>Space·Flow</div>
          <div style={{ fontSize: 12, color: 'var(--sf-text-mute)' }}>Prototype demo · All data is stored locally · No real payments are processed</div>
        </div>
      </footer>
    </div>
  );
}
