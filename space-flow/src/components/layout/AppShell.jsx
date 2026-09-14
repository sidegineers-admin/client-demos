import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  Bell, LogOut, ShieldCheck, Search, LayoutGrid, BookOpen, BarChart2, 
  Cpu, Settings, Loader2, CalendarDays, Building2, Users, Plus, 
  Eye, ArrowRightLeft, Sparkles, CheckSquare, Clock, Sun, Moon
} from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';
import { storage } from '../../store/storage.js';
import Toast from '../ui/Toast.jsx';
import DemoSpotlight from '../demo/DemoSpotlight.jsx';
import PresenterToolbar from '../demo/PresenterToolbar.jsx';
import AdminDirectBookingModal from '../modals/AdminDirectBookingModal.jsx';

export default function AppShell() {
  const { session, setSession, authChecked, toast, notifications, markAllRead, unreadCount, bookings, facilities, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [directBookingOpen, setDirectBookingOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--sf-bg-dark)', color: 'var(--sf-text-mute)', gap: 12 }}>
        <Loader2 size={24} className="spin" />
        <span style={{ fontSize: 14 }}>Loading Space-Flow…</span>
      </div>
    );
  }

  if (!session) return <Navigate to="/app/auth" replace />;

  const isAdmin = session.role === 'admin' || session.role === 'staff';
  const path = location.pathname;

  async function handleLogout() {
    await storage.set('session', JSON.stringify(null));
    setSession(null);
    navigate('/app/auth', { replace: true });
  }

  async function switchRole(newRole) {
    if (newRole === 'admin') {
      const s = { userId: 'admin@spaceflow.com', name: 'Venue Manager', email: 'admin@spaceflow.com', role: 'admin' };
      await storage.set('session', JSON.stringify(s));
      setSession(s);
      navigate('/app/admin-calendar');
    } else {
      const s = { userId: 'alex@demo.com', name: 'Alex Holt', email: 'alex@demo.com', role: 'hirer' };
      await storage.set('session', JSON.stringify(s));
      setSession(s);
      navigate('/app/book');
    }
  }

  const pendingCount = bookings.filter(b => b.status === 'pending_approval').length;

  // Navigations separated by role
  const adminNavItems = [
    { label: 'Schedule & Calendar', path: '/app/admin-calendar', icon: <CalendarDays size={15} /> },
    { 
      label: 'Bookings Queue', 
      path: '/app/admin-bookings', 
      icon: <CheckSquare size={15} />,
      badge: pendingCount > 0 ? pendingCount : null
    },
    { label: 'Facilities & Buffers', path: '/app/admin-facilities', icon: <Building2 size={15} /> },
    { label: 'Analytics & Revenue', path: '/app/admin-analytics', icon: <BarChart2 size={15} /> },
    { label: 'Layout AI', path: '/app/layout', icon: <Cpu size={15} /> },
  ];

  const hirerNavItems = [
    { label: 'Explore Spaces', path: '/app/book', icon: <Search size={15} /> },
    { label: 'My Bookings & Invoices', path: '/app/my-bookings', icon: <BookOpen size={15} /> },
  ];

  const navItems = isAdmin ? adminNavItems : hirerNavItems;

  return (
    <div className="sf-shell">
      <header className="sf-header" style={{ borderBottomColor: isAdmin ? 'rgba(245,158,11,0.2)' : 'var(--sf-border)' }}>
        {/* Top bar with Branding, Quick Actions & User Switcher */}
        <div className="sf-header-top" style={{ padding: '12px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ cursor: 'pointer' }} onClick={() => navigate(isAdmin ? '/app/admin-calendar' : '/app/book')}>
              <div className="sf-wordmark">Space·Flow</div>
              <div className="sf-wordmark-sub">
                {isAdmin ? 'ADMIN OPERATIONS CONSOLE' : 'Intelligent Facility Booking'}
              </div>
            </div>

            {isAdmin && (
              <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '3px 8px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sf-amber)', animation: 'slot-pulse 1.8s infinite' }} />
                Admin Portal
              </span>
            )}
          </div>

          {/* Quick Actions in Top Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Admin Quick Direct Booking */}
            {isAdmin && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setDirectBookingOpen(true)}
                style={{ padding: '6px 14px', fontSize: 13, gap: 6 }}
              >
                <Plus size={14} /> Direct Booking
              </button>
            )}

            {/* Quick Role Switcher for Demo evaluation */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => switchRole(isAdmin ? 'hirer' : 'admin')}
              style={{ padding: '6px 12px', fontSize: 12, gap: 6 }}
              title={isAdmin ? 'View app as a Hirer' : 'Switch to Admin View'}
            >
              <ArrowRightLeft size={13} />
              {isAdmin ? 'Preview Hirer Portal' : 'Admin Console'}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* Notifications */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button className="notif-btn" onClick={() => setNotifOpen(o => !o)} aria-label="Notifications">
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--sf-violet)', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 10, padding: '1px 5px', lineHeight: 1 }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-header">
                    <span>Notifications ({notifications.length})</span>
                    <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--sf-text-mute)', fontSize: 11, cursor: 'pointer' }}>Mark all read</button>
                  </div>
                  {notifications.map(n => (
                    <div className={`notif-item${n.read ? '' : ' unread'}`} key={n.id} style={{ opacity: n.read ? 0.6 : 1 }}>
                      <span className="notif-dot" style={{ background: n.color }} />
                      <div>
                        <div className="notif-text">{n.text}</div>
                        <div className="notif-time">{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Account & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid var(--sf-border)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: isAdmin ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'var(--sf-violet-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {session.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sf-text)' }}>{session.name}</span>
                <span style={{ fontSize: 10.5, color: 'var(--sf-text-mute)' }}>{session.role}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Log out" style={{ marginLeft: 4 }}>
                <LogOut size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Navigation Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', borderTop: '1px solid var(--sf-border)', background: isAdmin ? 'rgba(245,158,11,0.03)' : 'transparent' }}>
          <nav className="sf-nav" style={{ padding: 0 }}>
            {navItems.map(item => {
              const isActive = path.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  className={`sf-nav-btn ${isAdmin ? 'admin-btn' : ''} ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    padding: '11px 18px',
                    borderBottomWidth: 3,
                    fontWeight: isActive ? 600 : 500,
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span style={{ background: 'var(--sf-amber)', color: '#000', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <PresenterToolbar />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="sf-main" style={{ maxWidth: path.includes('calendar') ? 1440 : 1160 }}>
        <Outlet />
      </div>

      {/* Direct Booking Modal for Admin */}
      <AdminDirectBookingModal
        open={directBookingOpen}
        onClose={() => setDirectBookingOpen(false)}
      />

      <DemoSpotlight />
      {toast && <Toast text={toast.text} type={toast.type} />}
    </div>
  );
}
