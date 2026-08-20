import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Users, CalendarDays, RotateCcw, Settings, Trash2, Search, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { useDemo } from '../../store/DemoContext.jsx';
import { storage } from '../../store/storage.js';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

function toDateKey(d) { return d.toISOString().slice(0, 10); }

function makeRevenueData(bookings, pricePerHour) {
  const weeks = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7 - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const wStartKey = toDateKey(weekStart);
    const wEndKey   = toDateKey(weekEnd);
    const weekBookings = bookings.filter(b => b.date >= wStartKey && b.date < wEndKey && b.type === 'booking');
    const revenue = weekBookings.reduce((acc, b) => acc + (b.amount || pricePerHour), 0);
    weeks.push({
      week: `W${8 - i}`,
      revenue: parseFloat(revenue.toFixed(2)),
      bookings: weekBookings.length,
    });
  }
  return weeks;
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#12241C', border: '1px solid rgba(247,245,240,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ color: 'var(--c-text-mute)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--c-gold)' }}>£{payload[0]?.value}</div>
      {payload[1] && <div style={{ color: 'var(--c-green)' }}>{payload[1]?.value} bookings</div>}
    </div>
  );
};

export default function AdminDashboardPage() {
  const { session, bookings, setBookings, closedDates, settings, saveSettings, showToast } = useApp();
  const { demoAdminTab } = useDemo();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);

  // Sync activeTab if DemoContext triggers a tab switch
  useEffect(() => {
    if (demoAdminTab) {
      setActiveTab(demoAdminTab);
      loadUsers();
    }
  }, [demoAdminTab]);

  const loadUsers = async () => {
    const res = await storage.get('users');
    if (res?.value) setUsers(JSON.parse(res.value));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (session?.role !== 'admin') {
    navigate('/app/book', { replace: true }); return null;
  }

  const revenueData = useMemo(() => makeRevenueData(bookings, settings.pricePerHour || 12), [bookings, settings]);
  const totalRevenue = revenueData.reduce((a, w) => a + w.revenue, 0);
  const totalBookings = bookings.filter(b => b.type === 'booking').length;
  const totalBlocked  = bookings.filter(b => b.type === 'blocked').length;
  const todayKey = toDateKey(new Date());
  const todayBookings = bookings.filter(b => b.date === todayKey && b.type === 'booking');
  const recurringCount = new Set(bookings.filter(b => b.recurringId).map(b => b.recurringId)).size;
  const pendingUsersCount = users.filter(u => u.role === 'pending_admin').length;

  const filteredBookings = bookings
    .filter(b => b.type === 'booking')
    .filter(b => !search || [b.name, b.unit, b.date, b.contact || ''].some(f => f.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 60);

  async function removeBooking(id) {
    try {
      const latest = await storage.get('bookings');
      const current = latest?.value ? JSON.parse(latest.value) : [];
      const filtered = current.filter(b => b.id !== id);
      await storage.set('bookings', JSON.stringify(filtered));
      setBookings(filtered);
      showToast('Booking removed.');
    } catch { showToast('Could not remove booking.', 'error'); }
  }

  async function approveUser(userId) {
    try {
      const latest = await storage.get('users');
      const currentUsers = latest?.value ? JSON.parse(latest.value) : [];
      const updated = currentUsers.map(u => u.id === userId ? { ...u, role: 'admin' } : u);
      await storage.set('users', JSON.stringify(updated));
      setUsers(updated);
      showToast('Staff member approved as Admin!');
    } catch {
      showToast('Could not approve staff member.', 'error');
    }
  }

  async function rejectUser(userId) {
    try {
      const latest = await storage.get('users');
      const currentUsers = latest?.value ? JSON.parse(latest.value) : [];
      const updated = currentUsers.map(u => u.id === userId ? { ...u, role: 'user' } : u);
      await storage.set('users', JSON.stringify(updated));
      setUsers(updated);
      showToast('Staff request demoted to standard member.');
    } catch {
      showToast('Could not update user.', 'error');
    }
  }

  const TABS = [
    { id: 'overview',  label: 'Overview',  icon: <BarChart2 size={13} /> },
    { id: 'bookings',  label: 'Bookings',  icon: <CalendarDays size={13} /> },
    { id: 'approvals', label: `Approvals${pendingUsersCount > 0 ? ` (${pendingUsersCount})` : ''}`, icon: <ShieldCheck size={13} />, badge: pendingUsersCount },
    { id: 'recurring', label: 'Recurring', icon: <RotateCcw size={13} /> },
    { id: 'members',   label: 'Members',   icon: <Users size={13} /> },
    { id: 'settings',  label: 'Settings',  icon: <Settings size={13} /> },
  ];

  return (
    <div className="admin-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <ShieldCheck size={20} style={{ color: 'var(--c-gold)' }} />
            <h1 className="display" style={{ fontSize: 32 }}>Admin Dashboard</h1>
          </div>
          <p style={{ color: 'var(--c-text-mute)', fontSize: 13 }}>Hurn Bridge Sports Club — Centre Management</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/book')}>
          <CalendarDays size={14} /> View booking board
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stat-grid">
        {[
          { label: 'Total revenue', value: `£${totalRevenue.toFixed(0)}`, delta: '+12% vs last month', up: true },
          { label: 'Total bookings', value: totalBookings, delta: '+8 this week', up: true },
          { label: "Today's sessions", value: todayBookings.length, delta: `${settings.pricePerHour * todayBookings.length > 0 ? `£${(settings.pricePerHour * todayBookings.length).toFixed(0)} revenue` : 'Free coaching'}`, up: true },
          { label: 'Pending Approvals', value: pendingUsersCount, delta: pendingUsersCount > 0 ? 'Staff awaiting review' : 'All clear', up: pendingUsersCount === 0 },
          { label: 'Standing orders', value: recurringCount, delta: 'Weekly recurring', up: true },
          { label: 'Closed dates', value: closedDates.length, delta: 'Dates blocked', up: false },
        ].map(stat => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-value mono">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className={`stat-delta ${stat.up ? 'up' : 'down'}`}>{stat.delta}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map(t => (
          <div key={t.id} className={`admin-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.id); loadUsers(); }}>
            {t.label}
          </div>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 16 }}>Revenue (last 8 weeks)</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFD23F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FFD23F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(247,245,240,0.06)" />
                <XAxis dataKey="week" tick={{ fill: '#A9C4B6', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A9C4B6', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `£${v}`} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Area type="monotone" dataKey="revenue" stroke="#FFD23F" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 16 }}>Bookings per week</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(247,245,240,0.06)" />
                <XAxis dataKey="week" tick={{ fill: '#A9C4B6', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#A9C4B6', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CUSTOM_TOOLTIP />} />
                <Bar dataKey="bookings" fill="#52B788" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Today's board */}
          <div className="card" style={{ marginTop: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 12 }}>Today's sessions ({todayKey})</div>
            {todayBookings.length === 0
              ? <div style={{ color: 'var(--c-text-mute)', fontSize: 13 }}>No bookings today.</div>
              : todayBookings.map(b => (
                <div className="order-line" key={b.id}>
                  <span>{b.unit} · <span className="mono">{b.time}</span></span>
                  <span style={{ color: 'var(--c-text-sub)' }}>{b.name}</span>
                  {b.subsidised ? <span className="badge badge-green">Free</span> : <span className="badge badge-gold">£{(b.amount || settings.pricePerHour).toFixed(2)}</span>}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Bookings list */}
      {activeTab === 'bookings' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div className="input-wrap" style={{ flex: 1 }}>
              <Search size={14} color="var(--c-text-mute)" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, lane, date…" />
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th><th>Time</th><th>Lane</th><th>Name</th><th>Contact</th><th>Type</th><th>Paid</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(b => (
                  <tr key={b.id}>
                    <td><span className="mono" style={{ fontSize: 12 }}>{b.date}</span></td>
                    <td><span className="mono">{b.time}</span></td>
                    <td>{b.unit}</td>
                    <td style={{ color: 'var(--c-text)', fontWeight: 500 }}>{b.name}</td>
                    <td style={{ fontSize: 12 }}>{b.contact || '—'}</td>
                    <td>
                      {b.recurringId
                        ? <span className="badge badge-gold">Recurring</span>
                        : <span className="badge badge-green">Single</span>
                      }
                      {b.subsidised && <span className="badge badge-mute" style={{ marginLeft: 4 }}>ECB</span>}
                    </td>
                    <td><span className="mono" style={{ color: 'var(--c-gold)' }}>{b.subsidised ? 'Free' : b.amount ? `£${b.amount.toFixed(2)}` : '—'}</span></td>
                    <td>
                      <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => removeBooking(b.id)}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBookings.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--c-text-mute)' }}>No bookings found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Approvals tab */}
      {activeTab === 'approvals' && (
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 }}>Staff Approval Queue</div>
          <div style={{ fontSize: 13, color: 'var(--c-text-mute)', marginBottom: 20 }}>
            Review pending registrations for centre staff access. Approved users gain full admin dashboard privileges.
          </div>

          {users.filter(u => u.role === 'pending_admin').length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--c-text-mute)' }}>
              <ShieldCheck size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-sub)' }}>No pending staff approvals</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>All staff registrations have been reviewed.</div>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th><th>Email</th><th>Requested Role</th><th>Registered</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'pending_admin').map(u => (
                    <tr key={u.id}>
                      <td style={{ color: 'var(--c-text)', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ fontSize: 12 }}>{u.email}</td>
                      <td><span className="badge badge-gold">Pending Staff</span></td>
                      <td style={{ fontSize: 12, color: 'var(--c-text-mute)' }}>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" style={{ display: 'flex', gap: 6, padding: '4px 10px' }} onClick={() => approveUser(u.id)}>
                            <UserCheck size={13} /> Approve
                          </button>
                          <button className="btn btn-ghost btn-sm" style={{ display: 'flex', gap: 6, padding: '4px 10px', color: 'var(--c-red)' }} onClick={() => rejectUser(u.id)}>
                            <UserX size={13} /> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Recurring */}
      {activeTab === 'recurring' && (
        <div>
          <div style={{ fontSize: 13, color: 'var(--c-text-mute)', marginBottom: 16 }}>
            {recurringCount} active standing booking series
          </div>
          {recurringCount === 0
            ? <div style={{ color: 'var(--c-text-mute)', fontSize: 13 }}>No recurring bookings yet.</div>
            : (() => {
              const seriesMap = {};
              bookings.filter(b => b.recurringId).forEach(b => {
                if (!seriesMap[b.recurringId]) seriesMap[b.recurringId] = [];
                seriesMap[b.recurringId].push(b);
              });
              return Object.entries(seriesMap).map(([rid, items]) => {
                const base = items.sort((a,b) => a.date.localeCompare(b.date))[0];
                return (
                  <div className="card" style={{ marginBottom: 14 }} key={rid}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--c-text)', marginBottom: 4 }}>{base.name} — {base.unit} @ {base.time}</div>
                        <div style={{ fontSize: 12, color: 'var(--c-text-mute)' }}>{items.length} sessions · Starting {base.date}</div>
                      </div>
                      <span className="badge badge-gold"><RotateCcw size={10} /> {items.length} sessions</span>
                    </div>
                  </div>
                );
              });
            })()
          }
        </div>
      )}

      {/* Members */}
      {activeTab === 'members' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>ECB</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ color: 'var(--c-text)', fontWeight: 500 }}>{u.name}</td>
                  <td style={{ fontSize: 12 }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-gold' : u.role === 'pending_admin' ? 'badge-red' : 'badge-green'}`}>
                      {u.role === 'admin' ? 'Staff' : u.role === 'pending_admin' ? 'Pending Staff' : 'Member'}
                    </span>
                  </td>
                  <td>{u.ecbCoach ? <span className="badge badge-green">ECB ({u.ecbNumber || 'Yes'})</span> : '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--c-text-mute)' }}>{new Date(u.createdAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--c-text-mute)' }}>No members found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings */}
      {activeTab === 'settings' && (
        <div>
          <div className="card">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 20 }}>Centre settings</div>
            <div style={{ display: 'grid', gap: 16, maxWidth: 400 }}>
              {[
                { key: 'pricePerHour', label: 'Standard price per hour (£)', prefix: '£' },
                { key: 'memberDiscount', label: 'Member discount (%)', suffix: '%' },
                { key: 'ecbDiscount', label: 'ECB Coach discount (%)', suffix: '%' },
                { key: 'membershipMonthly', label: 'Monthly membership (£)', prefix: '£' },
              ].map(({ key, label, prefix, suffix }) => (
                <div key={key}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-mute)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</div>
                  <div className="input-wrap">
                    {prefix && <span className="mono" style={{ color: 'var(--c-gold)' }}>{prefix}</span>}
                    <input
                      type="number"
                      defaultValue={settings[key] !== undefined ? settings[key] : (key === 'ecbDiscount' ? 50 : 0)}
                      onBlur={async e => {
                        const num = parseFloat(e.target.value);
                        if (!isNaN(num)) {
                          await saveSettings({ ...settings, [key]: num });
                          showToast('Settings saved.');
                        }
                      }}
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--c-gold)' }}
                    />
                    {suffix && <span className="mono" style={{ color: 'var(--c-gold)' }}>{suffix}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 12 }}>Opening hours</div>
            <div style={{ fontSize: 13, color: 'var(--c-text-mute)' }}>
              Monday – Sunday: <b style={{ color: 'var(--c-text)' }}>07:00 – 21:00</b>
              <div style={{ fontSize: 12, marginTop: 4 }}>Full hours management available in the production system.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
