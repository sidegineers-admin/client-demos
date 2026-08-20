import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, CreditCard, RotateCcw, Bell, ShieldCheck, BarChart2,
  Phone, Mail, AlertCircle, Check, X, ChevronRight, Zap, Star, ArrowRight,
  Clock, Users, TrendingUp, Trophy, Wifi
} from 'lucide-react';

import { useDemo } from '../store/DemoContext.jsx';

/* ─── Intersection-observer hook for scroll animations ─── */
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

function Section({ children, alt = false, id }) {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref} id={id}
      className={`pres-section ${alt ? 'pres-section-alt' : ''}`}
      style={{ opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(32px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}
    >
      <div className="container">{children}</div>
    </section>
  );
}

/* ─── Mock phone frame with animated booking UI ─── */
function MockPhone() {
  const slots = [
    { time: '09:00', lane: 'Lane 1', status: 'booked' },
    { time: '09:00', lane: 'Lane 2', status: 'available' },
    { time: '10:00', lane: 'Lane 1', status: 'selected' },
    { time: '10:00', lane: 'Lane 2', status: 'available' },
    { time: '11:00', lane: 'Lane 1', status: 'available' },
    { time: '11:00', lane: 'Lane 2', status: 'blocked' },
  ];
  return (
    <div style={{ width: 220, background: '#0F2A21', border: '1px solid rgba(247,245,240,0.15)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.7)', flexShrink: 0 }}>
      <div style={{ background: '#0B3D2E', padding: '12px 14px 8px', borderBottom: '1px solid rgba(247,245,240,0.1)' }}>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 13, color: '#F7F5F0', lineHeight: 1 }}>THE DORSET <span style={{ color: '#FFD23F' }}>CRICKET</span></div>
        <div style={{ fontSize: 9, color: '#A9C4B6', marginTop: 2 }}>Hurn Bridge CC · Book a net lane</div>
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', gap: 5, borderBottom: '1px solid rgba(247,245,240,0.07)' }}>
        {['Wed 20', 'Thu 21', 'Fri 22'].map((d, i) => (
          <div key={d} style={{ flex: 1, textAlign: 'center', padding: '5px 2px', borderRadius: 6, background: i === 0 ? '#146C43' : 'rgba(247,245,240,0.04)', border: `1px solid ${i === 0 ? '#52B788' : 'rgba(247,245,240,0.1)'}`, fontSize: 9, color: i === 0 ? '#F7F5F0' : '#A9C4B6' }}>{d}</div>
        ))}
      </div>
      <div style={{ padding: 8 }}>
        {slots.map((s, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(247,245,240,0.05)' }}>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: '#A9C4B6', width: 34 }}>{s.time}</span>
            <span style={{ fontSize: 9, color: '#D9E4DD', flex: 1 }}>{s.lane}</span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.status === 'booked' ? '#F4A300' : s.status === 'selected' ? '#FFD23F' : s.status === 'blocked' ? '#E24B4A' : '#52B788', boxShadow: s.status === 'selected' ? '0 0 6px #FFD23F' : 'none' }} />
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 10px', background: '#0F2A21', borderTop: '2px solid #FFD23F' }}>
        <div style={{ fontSize: 9, color: '#D9E4DD', marginBottom: 5 }}><span style={{ color: '#FFD23F', fontFamily: "'IBM Plex Mono',monospace" }}>1</span> slot selected · £12.00</div>
        <div style={{ background: '#FFD23F', color: '#10201A', fontSize: 10, fontWeight: 700, textAlign: 'center', borderRadius: 5, padding: '5px 0' }}>Review & Pay →</div>
      </div>
    </div>
  );
}

/* ─── Stats ticker ─── */
function AnimatedNumber({ target, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0);
  const [ref, inView] = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 40;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); } else setVal(Math.floor(start));
    }, 30);
    return () => clearInterval(t);
  }, [inView, target]);
  return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

/* ─── Editable pricing card ─── */
function EditablePriceCard({ name, featured, defaultPrice, period, perks, color = '#FFD23F' }) {
  const [price, setPrice] = useState(defaultPrice);
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState(String(defaultPrice));
  return (
    <div className="pres-price-card" style={{ borderColor: featured ? 'rgba(255,210,63,0.45)' : undefined }}>
      {featured && (
        <div style={{ position: 'absolute', top: 16, right: 16 }}>
          <span className="badge badge-gold">Most popular</span>
        </div>
      )}
      <div className="price-tier-name">{name}</div>
      {typeof defaultPrice === 'number' ? (
        <>
          {editing ? (
            <div className="price-input-wrap" style={{ marginTop: 8 }}>
              <span>£</span>
              <input value={tmp} onChange={e => setTmp(e.target.value)}
                onBlur={() => { setPrice(parseFloat(tmp) || 0); setEditing(false); }}
                onKeyDown={e => e.key === 'Enter' && (setPrice(parseFloat(tmp) || 0), setEditing(false))}
                autoFocus />
            </div>
          ) : (
            <div className="price-amount" style={{ marginTop: 8, cursor: 'pointer' }} onClick={() => setEditing(true)}>
              £{price.toFixed(2)}
            </div>
          )}
          <div className="price-period">{period}</div>
          <div className="price-edit-hint">✏️ Click price to edit live</div>
        </>
      ) : (
        <>
          <div className="price-amount" style={{ marginTop: 8, color: '#52B788' }}>50% OFF</div>
          <div className="price-period">{period}</div>
        </>
      )}
      <ul className="price-perks">
        {perks.map(p => (
          <li key={p} className="price-perk">
            <Check size={13} style={{ color, flexShrink: 0 }} /> {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
/*  MAIN PRESENTATION PAGE                                      */
/* ──────────────────────────────────────────────────────────── */
export default function PresentationPage() {
  const navigate = useNavigate();
  const { startDemo } = useDemo();
  const [navSolid, setNavSolid] = useState(false);

  useEffect(() => {
    const fn = () => setNavSolid(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="pres">
      {/* ── NAV ── */}
      <nav className="pres-nav" style={{ background: navSolid ? 'rgba(7,16,12,0.95)' : 'rgba(7,16,12,0.6)', transition: 'background 0.3s' }}>
        <div className="pres-logo display">DORSET <span>CRICKET</span></div>
        <div className="pres-nav-links">
          {[['The problem', 'problem'], ['Features', 'features'], ['Journeys', 'journey'], ['Sports', 'sports'], ['Pricing', 'pricing']].map(([label, id]) => (
            <button key={id} className="pres-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => scrollTo(id)}>{label}</button>
          ))}
          <button className="btn btn-gold btn-sm" style={{ marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={startDemo}>
            <Zap size={14} /> Auto Demo
          </button>
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 4 }} onClick={() => navigate('/app')}>
            Try demo →
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div className="pres-hero">
        <div className="pres-hero-glow" />
        <div className="pres-hero-overline animate-in">
          <Trophy size={12} /> Hurn Bridge Sports Club · Christchurch
        </div>
        <h1 className="pres-h1 animate-in animate-in-delay-1">
          Stop managing<br />bookings by<br /><span className="gold">phone call.</span>
        </h1>
        <p className="pres-hero-sub animate-in animate-in-delay-2">
          A modern, end-to-end booking platform for The Dorset Cricket Centre — online payments, recurring sessions, live availability, and a full admin dashboard.
        </p>
        <div className="pres-hero-btns animate-in animate-in-delay-3">
          <button className="btn btn-gold btn-lg" onClick={startDemo} style={{ display: 'flex', gap: 10, background: 'linear-gradient(135deg, #FFD23F, #F4A300)', color: '#10201A', fontWeight: 700 }}>
            <Zap size={18} /> Show Auto-Pilot Demo
          </button>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/app')} style={{ display: 'flex', gap: 10 }}>
            Explore Interactive Demo
          </button>
        </div>

        {/* Mock phone + stats */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 48, marginTop: 72, flexWrap: 'wrap' }}>
          <MockPhone />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'left', paddingBottom: 8 }}>
            {[
              { icon: <Clock size={18} style={{ color: '#FFD23F' }} />, label: '< 60 seconds', sub: 'to book a lane' },
              { icon: <CreditCard size={18} style={{ color: '#52B788' }} />, label: 'Stripe payments', sub: 'secure, instant' },
              { icon: <RotateCcw size={18} style={{ color: '#A9C4B6' }} />, label: 'Standing orders', sub: 'set-and-forget bookings' },
              { icon: <Bell size={18} style={{ color: '#FFD23F' }} />, label: 'Smart reminders', sub: 'automated notifications' },
            ].map(({ icon, label, sub }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(247,245,240,0.06)', border: '1px solid rgba(247,245,240,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#F7F5F0' }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#A9C4B6' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pres-hero-stats">
          {[
            { num: 6, suffix: '', label: 'Net lanes bookable online' },
            { num: 14, suffix: 'hrs', label: 'Open daily, 7am – 9pm' },
            { num: 100, suffix: '%', label: 'Paperless booking process' },
            { num: 0, suffix: ' calls', label: 'Admin phone calls needed' },
          ].map(({ num, suffix, label }) => (
            <div className="pres-hero-stat" key={label}>
              <div className="num"><AnimatedNumber target={num} suffix={suffix} /></div>
              <div className="lbl">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROBLEM ── */}
      <Section id="problem" alt>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="pres-section-label" style={{ justifyContent: 'center' }}>The problem</div>
          <h2 className="pres-h2">How Hurn Bridge manages<br />bookings <em>today</em></h2>
          <p className="pres-lead" style={{ margin: '0 auto' }}>
            Every missed call is a missed booking. Every email thread is wasted time. Your members deserve better.
          </p>
        </div>
        <div className="problem-split">
          <div className="problem-card before">
            <div className="problem-card-label"><X size={14} /> Today — phone & email chaos</div>
            {[
              ['Phone calls during training', 'Staff interrupted mid-session to take bookings'],
              ['Email threads with no visibility', 'Double-bookings happen — no shared view of availability'],
              ['Cash on the day', 'No-shows common, no upfront payment, revenue lost'],
              ['Manual calendar updates', 'WhatsApp messages, paper diaries, spreadsheets'],
              ['No recurring booking option', 'Members have to call back every single week'],
              ['Zero data or analytics', 'No idea which lanes are popular or peak times'],
            ].map(([title, desc]) => (
              <div className="problem-item" key={title}>
                <AlertCircle size={14} style={{ color: '#E24B4A', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#F7F5F0', fontSize: 14 }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: '#A9C4B6', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="problem-card after">
            <div className="problem-card-label"><Check size={14} /> With this platform</div>
            {[
              ['Book in under 60 seconds', 'Members pick date, lane, time — and pay — all online'],
              ['Live availability board', 'Every lane visible in real time, no double bookings ever'],
              ['Card payments at booking', 'Revenue secured upfront, no-shows dramatically reduced'],
              ['One dashboard for staff', 'Admins see everything: bookings, revenue, members'],
              ['Set-and-forget recurring', 'Members book once, sessions auto-renew every week'],
              ['Full analytics suite', 'Revenue charts, peak times, utilisation rates — all built in'],
            ].map(([title, desc]) => (
              <div className="problem-item" key={title}>
                <Check size={14} style={{ color: '#52B788', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#F7F5F0', fontSize: 14 }}>{title}</div>
                  <div style={{ fontSize: 12.5, color: '#A9C4B6', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FEATURES ── */}
      <Section id="features">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="pres-section-label" style={{ justifyContent: 'center' }}>Everything included</div>
          <h2 className="pres-h2">A complete booking platform,<br /><span style={{ color: '#FFD23F' }}>built for cricket clubs</span></h2>
          <p className="pres-lead" style={{ margin: '0 auto' }}>
            Not a generic booking tool bolted on. Purpose-built for a sports centre with your specific workflow, your pricing, and your members.
          </p>
        </div>
        <div className="feature-grid">
          {[
            {
              icon: '📅', bg: 'rgba(82,183,136,0.12)', color: '#52B788',
              title: 'Live booking board',
              desc: 'Visual grid of every lane across every time slot. Colour-coded availability: green = open, amber = taken, red = staff hold. Members see real-time status.',
            },
            {
              icon: '💳', bg: 'rgba(255,210,63,0.12)', color: '#FFD23F',
              title: 'Secure online payments',
              desc: 'Full Stripe integration with card entry, payment processing, and receipts. Saves cards for future bookings. ECB coaches book for free automatically.',
            },
            {
              icon: '🔁', bg: 'rgba(169,196,182,0.12)', color: '#A9C4B6',
              title: 'Recurring bookings',
              desc: 'Members book a weekly or fortnightly standing session once. The system auto-reserves their lane every interval and sends confirmation each time.',
            },
            {
              icon: '🏅', bg: 'rgba(82,183,136,0.12)', color: '#52B788',
              title: 'Membership tiers',
              desc: 'Guest, Club Member, and ECB Coach tiers with different pricing and perks. Member discount applied automatically at checkout.',
            },
            {
              icon: '🔔', bg: 'rgba(255,210,63,0.12)', color: '#FFD23F',
              title: 'Smart notifications',
              desc: 'Automated reminders 24 hours before a session. Confirmation emails on booking. Waitlist alerts when a cancelled slot opens up.',
            },
            {
              icon: '📊', bg: 'rgba(169,196,182,0.12)', color: '#A9C4B6',
              title: 'Admin dashboard',
              desc: 'Revenue charts, bookings table, member list, lane blocking, date closures for matches, and settings — all in one place for staff.',
            },
            {
              icon: '📱', bg: 'rgba(82,183,136,0.12)', color: '#52B788',
              title: 'Mobile-first design',
              desc: 'Fully responsive — members book from their phone on the way to the club. Confirmation includes a QR code and calendar (.ics) download.',
            },
            {
              icon: '🛡️', bg: 'rgba(255,210,63,0.12)', color: '#FFD23F',
              title: 'Role-based access',
              desc: 'Members, ECB coaches, and staff all see different views. Admins can cancel bookings, hold lanes, close full dates for matches or events.',
            },
          ].map(f => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── MEMBER JOURNEY ── */}
      <Section id="journey" alt>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'start' }}>
          <div>
            <div className="pres-section-label">Member journey</div>
            <h2 className="pres-h2">Booking a net,<br />start to finish</h2>
            <p className="pres-lead">From opening the app to walking onto the lane — under 2 minutes.</p>
            <div className="journey-steps">
              {[
                { n: '01', title: 'Log in or register', desc: 'Members create an account once. ECB coaches tick a box to get free access.', detail: '⏱ 30 seconds first time, instant return visits' },
                { n: '02', title: 'Pick date and lane', desc: 'Colour-coded grid shows live availability. Tap any green slot to select it.', detail: '🎯 Multiple slots across lanes can be added to cart' },
                { n: '03', title: 'Review and pay', desc: 'Secure card entry with auto-formatted number, card visual preview, and Stripe processing.', detail: '💳 Card saved for next time — one-tap future payments' },
                { n: '04', title: 'Receive confirmation', desc: 'Booking reference, QR code for the centre gate, and .ics calendar download.', detail: '📧 Email + in-app notification sent automatically' },
                { n: '05', title: 'Set it to recurring', desc: 'Toggle "recurring" at checkout — weekly or fortnightly for up to 12 weeks. All sessions confirmed at once.', detail: '🔁 Manage or cancel the series any time from My Bookings' },
              ].map(s => (
                <div className="journey-step" key={s.n}>
                  <div className="step-num">{s.n}</div>
                  <div className="step-content">
                    <div className="step-title">{s.title}</div>
                    <div className="step-desc">{s.desc}</div>
                    <div className="step-detail">{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="pres-section-label">Admin journey</div>
            <h2 className="pres-h2">Running the centre,<br />effortlessly</h2>
            <p className="pres-lead">Everything staff need in one dashboard — no spreadsheets, no calls.</p>
            <div className="journey-steps">
              {[
                { n: '01', title: "See today's board at a glance", desc: 'Open the admin view and instantly see all lanes, who has what, and any staff holds.', detail: '🎯 Colour-coded: bookings, holds, available, closed' },
                { n: '02', title: 'Manage any booking', desc: 'Click any occupied slot to view member details, contact info, and cancel if needed.', detail: '📋 Full booking history searchable by name or date' },
                { n: '03', title: 'Hold lanes for matches', desc: 'Block individual slots or close all lanes for a full date (e.g. league matches) with one click.', detail: '📅 Closed dates shown to members with the reason' },
                { n: '04', title: 'Book on behalf of members', desc: 'Walk-ins and phone requests can be entered manually by staff with a note attached.', detail: '📝 Marked as admin booking, shows in revenue reporting' },
                { n: '05', title: 'Track revenue and usage', desc: 'Weekly revenue charts, total bookings, utilisation by lane — all automatically generated.', detail: '📊 Export-ready data for committee reporting' },
              ].map(s => (
                <div className="journey-step" key={s.n}>
                  <div className="step-num">{s.n}</div>
                  <div className="step-content">
                    <div className="step-title">{s.title}</div>
                    <div className="step-desc">{s.desc}</div>
                    <div className="step-detail">{s.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── SPORTS ROADMAP ── */}
      <Section id="sports">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="pres-section-label" style={{ justifyContent: 'center' }}>Built to grow</div>
          <h2 className="pres-h2">Start with cricket.<br /><span style={{ color: '#52B788' }}>Expand to the whole club.</span></h2>
          <p className="pres-lead" style={{ margin: '0 auto' }}>
            The platform is sport-agnostic. Additional sports can be enabled in settings — each with their own booking units, pricing, and opening hours.
          </p>
        </div>
        <div className="sports-grid">
          {[
            { icon: '🏏', name: 'Cricket', desc: 'Net lanes, bowling machine', status: 'Live now', active: true },
            { icon: '🎾', name: 'Tennis', desc: 'Court bookings', status: 'Phase 2', active: false },
            { icon: '🏸', name: 'Badminton', desc: 'Indoor courts', status: 'Phase 2', active: false },
            { icon: '🥊', name: 'Squash', desc: 'Court bookings', status: 'Phase 2', active: false },
            { icon: '⚽', name: 'Football', desc: '5-a-side pitches', status: 'Phase 3', active: false },
            { icon: '🏊', name: 'Swimming', desc: 'Lane bookings', status: 'Phase 3', active: false },
          ].map(s => (
            <div key={s.name} className={`sport-card ${s.active ? 'active' : 'soon'}`}>
              <div className="sport-icon">{s.icon}</div>
              <div className="sport-name">{s.name}</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-mute)', marginBottom: 8 }}>{s.desc}</div>
              <div className={`sport-status`} style={{ color: s.active ? '#52B788' : '#6B8F80' }}>
                {s.active ? '● Active' : `○ ${s.status}`}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── PRICING ── */}
      <Section id="pricing" alt>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div className="pres-section-label" style={{ justifyContent: 'center' }}>Pricing</div>
          <h2 className="pres-h2">Simple pricing for<br /><span style={{ color: '#FFD23F' }}>every type of member</span></h2>
          <p className="pres-lead" style={{ margin: '0 auto' }}>
            All prices are fully editable — click any figure to change it live during this demo. The actual pricing will be agreed with the centre before launch.
          </p>
        </div>
        <div className="pres-pricing-grid">
          <EditablePriceCard
            name="Guest" defaultPrice={14} period="per slot (1 hr)"
            perks={['Book any time', 'Standard lane rate', 'Online confirmation', 'QR code entry']}
            color="#A9C4B6"
          />
          <EditablePriceCard
            name="Club Member" featured defaultPrice={5} period="per month + discounted slots"
            perks={['Unlimited bookings', '10% discount on every slot', 'Priority booking window', 'Recurring / standing bookings', 'Member events access']}
          />
          <EditablePriceCard
            name="ECB Coach" defaultPrice={null} period="verified by ECB number"
            perks={['Completely free lane access', 'Unlimited bookings', 'Priority window', 'Recurring bookings', 'Coach verification badge']}
            color="#52B788"
          />
        </div>

        {/* Platform fee note */}
        <div style={{ textAlign: 'center', marginTop: 40, padding: '28px', background: 'rgba(247,245,240,0.03)', border: '1px solid rgba(247,245,240,0.08)', borderRadius: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 8 }}>Platform subscription</div>
          <div style={{ fontSize: 13, color: 'var(--c-text-mute)', maxWidth: 480, margin: '0 auto' }}>
            The centre pays a simple monthly platform fee — no per-booking commissions. All payment revenue goes directly to Hurn Bridge CC via Stripe.
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { icon: <Wifi size={15} />, text: 'Hosted & maintained' },
              { icon: <ShieldCheck size={15} />, text: 'PCI-compliant payments' },
              { icon: <TrendingUp size={15} />, text: 'Free updates' },
              { icon: <Users size={15} />, text: 'Unlimited members' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--c-text-sub)' }}>
                <span style={{ color: 'var(--c-green)' }}>{icon}</span> {text}
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── ROI STATS ── */}
      <Section>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="pres-section-label" style={{ justifyContent: 'center' }}>The business case</div>
          <h2 className="pres-h2">What this means for<br /><span style={{ color: '#FFD23F' }}>Hurn Bridge CC</span></h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            { icon: <TrendingUp size={22} style={{ color: '#52B788' }} />, num: 35, suffix: '%', label: 'Average revenue increase', desc: 'From reduced no-shows, upfront payment, and increased discoverability' },
            { icon: <Clock size={22} style={{ color: '#FFD23F' }} />, num: 8, suffix: 'hrs', label: 'Staff time saved per week', desc: 'No more phone calls, email replies, or manual calendar updates' },
            { icon: <Users size={22} style={{ color: '#A9C4B6' }} />, num: 3, suffix: '×', label: 'More bookings in peak periods', desc: 'Members can book from their phone in under 60 seconds, any time' },
            { icon: <BarChart2 size={22} style={{ color: '#52B788' }} />, num: 100, suffix: '%', label: 'Lane utilisation visibility', desc: 'Know exactly which lanes, times and members drive revenue' },
          ].map(s => (
            <div key={s.label} className="card card-hover">
              <div style={{ marginBottom: 14 }}>{s.icon}</div>
              <div className="mono" style={{ fontSize: 36, fontWeight: 700, color: 'var(--c-gold)' }}>
                <AnimatedNumber target={s.num} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginTop: 4, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 12.5, color: 'var(--c-text-mute)', lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <div className="pres-cta">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pres-section-label" style={{ justifyContent: 'center' }}>Ready to see it live?</div>
          <h2 className="pres-h2" style={{ marginBottom: 16 }}>Try the full demo<br /><span style={{ color: '#FFD23F' }}>right now</span></h2>
          <p style={{ fontSize: 16, color: 'var(--c-text-sub)', maxWidth: 480, margin: '0 auto 40px', lineHeight: 1.65 }}>
            The demo is fully interactive — log in as a member, make a booking, pay, set it to recurring, then switch to the staff view and see it all in the admin dashboard.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 40 }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/app')} style={{ display: 'flex', gap: 10 }}>
              <Zap size={18} /> Launch the demo
            </button>
            <a href="mailto:hello@sidegineers.com" className="btn btn-ghost btn-lg" style={{ display: 'flex', gap: 10 }}>
              <Mail size={16} /> Get in touch
            </a>
          </div>

          {/* Demo accounts cheat sheet */}
          <div style={{ display: 'inline-block', background: 'rgba(247,245,240,0.05)', border: '1px solid rgba(247,245,240,0.12)', borderRadius: 12, padding: '18px 24px', textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--c-text-mute)', marginBottom: 12 }}>Demo login credentials</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { role: 'Member', email: 'tom@demo.com', pw: 'demo123', badge: 'badge-green' },
                { role: 'ECB Coach (free)', email: 'sarah@demo.com', pw: 'demo123', badge: 'badge-green' },
                { role: 'Staff / Admin', email: 'staff@hurnbridge.cc', pw: 'demo123', badge: 'badge-gold' },
              ].map(a => (
                <div key={a.email} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5 }}>
                  <span className={`badge ${a.badge}`}>{a.role}</span>
                  <span className="mono" style={{ color: 'var(--c-text-sub)' }}>{a.email}</span>
                  <span style={{ color: 'var(--c-text-faint)' }}>pw: <span className="mono">{a.pw}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="pres-footer">
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: 'var(--c-text-sub)' }}>
            DORSET CRICKET CENTRE <span style={{ color: 'var(--c-gold)' }}>·</span> HURN BRIDGE SPORTS CLUB
          </span>
        </div>
        <div>Prototype built by <a href="mailto:hello@sidegineers.com" style={{ color: 'var(--c-green)' }}>Sidegineers</a> · {new Date().getFullYear()}</div>
      </div>
    </div>
  );
}
