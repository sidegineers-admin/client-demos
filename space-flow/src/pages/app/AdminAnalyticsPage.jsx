import React, { useMemo } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Users, PoundSterling, BarChart2 } from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';

const SF_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--sf-bg-card)', border: '1px solid var(--sf-border-hi)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 13, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ color: 'var(--sf-text-mute)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--sf-violet-lt)', fontFamily: 'var(--font-mono)' }}>
          {p.name}: {p.name === 'revenue' ? '£' : ''}{p.value?.toLocaleString()}{p.name === 'utilisation' ? '%' : ''}
        </div>
      ))}
    </div>
  );
};

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

export default function AdminAnalyticsPage() {
  const { bookings, facilities, session } = useApp();

  if (!session || !['admin','staff'].includes(session.role)) {
    return <div style={{ padding: 40, color: 'var(--sf-text-mute)' }}>Access denied</div>;
  }

  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const totalRevenue = confirmed.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const avgValue = confirmed.length ? Math.round(totalRevenue / confirmed.length) : 0;

  // Weekly revenue (fake seeded data + real bookings)
  const weeklyData = useMemo(() => {
    const base = [3200, 4800, 3900, 6100, 5200, 7400, 8200, 9100];
    return WEEK_LABELS.map((w, i) => ({
      week: w,
      revenue: base[i] + Math.floor(Math.random() * 800),
      bookings: Math.floor(base[i] / 400) + Math.round(Math.random() * 3),
    }));
  }, []);

  // Revenue by facility
  const byFacility = useMemo(() => {
    const map = {};
    confirmed.forEach(b => {
      map[b.facilityName] = (map[b.facilityName] || 0) + (b.totalAmount || 0);
    });
    // Add seed totals for demo richness
    const defaults = { 'Grand Ballroom': 42000, 'Conference Suite A': 8400, 'St. George\'s Cricket Ground': 12600, 'The Ivory Studio': 3600, 'Rooftop Terrace': 7200, 'Conference Suite B': 2400 };
    Object.entries(defaults).forEach(([k,v]) => { if (!map[k]) map[k] = v; });
    return Object.entries(map).map(([name, revenue]) => ({ name: name.replace('St. George\'s ', ''), revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [confirmed]);

  // Utilisation by day
  const utilisationData = useMemo(() => {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const rates = [62, 71, 68, 75, 88, 93, 54]; // prototype data
    return days.map((d, i) => ({ day: d, utilisation: rates[i] }));
  }, []);

  // Top hirers
  const topHirers = useMemo(() => {
    const map = {};
    bookings.forEach(b => {
      if (!map[b.hirerName]) map[b.hirerName] = { name: b.hirerName, bookings: 0, spend: 0 };
      map[b.hirerName].bookings++;
      map[b.hirerName].spend += b.totalAmount || 0;
    });
    return Object.values(map).sort((a, b) => b.spend - a.spend).slice(0, 5);
  }, [bookings]);

  // Booking funnel
  const funnelData = [
    { stage: 'Page views', count: 1840 },
    { stage: 'Searched', count: 920 },
    { stage: 'Slot selected', count: 340 },
    { stage: 'Checkout started', count: 210 },
    { stage: 'Submitted', count: bookings.length + 8 },
    { stage: 'Confirmed', count: confirmed.length + 4 },
  ];

  const STAT_CARDS = [
    { label: 'Total Revenue', value: `£${totalRevenue.toLocaleString()}`, delta: '+12.4%', up: true, icon: <PoundSterling size={20} />, col: 'var(--sf-violet)' },
    { label: 'Total Bookings', value: bookings.length.toLocaleString(), delta: '+8.1%', up: true, icon: <Calendar size={20} />, col: 'var(--sf-cyan)' },
    { label: 'Avg. Booking Value', value: `£${avgValue.toLocaleString()}`, delta: '+3.2%', up: true, icon: <BarChart2 size={20} />, col: 'var(--sf-emerald)' },
    { label: 'Active Hirers', value: '48', delta: '+5', up: true, icon: <Users size={20} />, col: 'var(--sf-amber)' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Revenue, utilisation and booking performance insights</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: s.col + '20', border: `1px solid ${s.col}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: s.col }}>{s.icon}</span>
              </div>
              <span className={`stat-card-delta ${s.up ? 'text-emerald' : 'text-red'}`} style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}>
                {s.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {s.delta}
              </span>
            </div>
            <div className="stat-card-value" style={{ color: s.col }}>{s.value}</div>
            <div className="stat-card-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="sf-card">
          <div className="section-header">
            <div className="section-title">Weekly Revenue</div>
            <span className="badge badge-violet">Last 8 weeks</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyData} margin={{ top: 10, right: 10, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="week" tick={{ fill: 'var(--sf-text-mute)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--sf-text-mute)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<SF_TOOLTIP />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#7C3AED" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#A78BFA' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Day utilisation */}
        <div className="sf-card">
          <div className="section-header">
            <div className="section-title">Utilisation by Day</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={utilisationData} margin={{ top: 10, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'var(--sf-text-mute)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--sf-text-mute)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0,100]} />
              <Tooltip content={<SF_TOOLTIP />} />
              <Bar dataKey="utilisation" name="utilisation" radius={[4,4,0,0]}>
                {utilisationData.map((d, i) => (
                  <Cell key={i} fill={d.utilisation >= 80 ? 'var(--sf-emerald)' : d.utilisation >= 60 ? 'var(--sf-violet)' : 'var(--sf-cyan)'} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue by Facility + Funnel + Top Hirers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Revenue by facility */}
        <div className="sf-card">
          <div className="section-header">
            <div className="section-title">Revenue by Facility</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            {byFacility.map((row, i) => {
              const max = byFacility[0].revenue;
              const pct = (row.revenue / max) * 100;
              const col = ['var(--sf-violet)', 'var(--sf-cyan)', 'var(--sf-emerald)', 'var(--sf-amber)', 'var(--sf-violet-lt)', 'var(--sf-cyan-lt)'][i % 6];
              return (
                <div key={row.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                    <span style={{ color: 'var(--sf-text-sub)' }}>{row.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>£{row.revenue.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--sf-bg-raised)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 3, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Booking funnel */}
        <div className="sf-card">
          <div className="section-header">
            <div className="section-title">Booking Funnel</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {funnelData.map((row, i) => {
              const max = funnelData[0].count;
              const pct = Math.round((row.count / max) * 100);
              return (
                <div key={row.stage} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 44px', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--sf-text-sub)' }}>{row.stage}</span>
                  <div style={{ height: 8, background: 'var(--sf-bg-raised)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `hsl(${260 + i * 20}, 70%, ${60 - i * 5}%)`, borderRadius: 4, transition: 'width 0.8s ease' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, textAlign: 'right', color: 'var(--sf-text-mute)' }}>{row.count.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top hirers */}
      <div className="sf-card">
        <div className="section-header">
          <div className="section-title">Top Hirers</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--sf-border)' }}>
              {['Hirer', 'Bookings', 'Total Spend', 'Status'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--sf-text-mute)', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topHirers.map((hirer, i) => (
              <tr key={hirer.name} style={{ borderBottom: '1px solid var(--sf-border)', transition: 'background 160ms' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--sf-bg-raised)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: `hsl(${260 + i * 40}, 60%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                    {hirer.name[0]}
                  </div>
                  {hirer.name}
                </td>
                <td style={{ padding: '12px 12px', fontFamily: 'var(--font-mono)' }}>{hirer.bookings}</td>
                <td style={{ padding: '12px 12px', fontFamily: 'var(--font-mono)', color: 'var(--sf-violet-lt)', fontWeight: 600 }}>£{hirer.spend.toLocaleString()}</td>
                <td style={{ padding: '12px 12px' }}><span className="badge badge-emerald">Active</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
