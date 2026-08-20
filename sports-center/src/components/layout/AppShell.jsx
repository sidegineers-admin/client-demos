import React, { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Bell, LogOut, ShieldCheck, CalendarDays, BookOpen, RotateCcw, Star, Loader2 } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { storage } from '../../store/storage.js';
import Toast from '../ui/Toast.jsx';
import DemoSpotlight from '../demo/DemoSpotlight.jsx';
import PresenterHeaderToolbar from '../demo/PresenterHeaderToolbar.jsx';

export default function AppShell() {
  const { session, setSession, authChecked, toast, notifications, markAllRead, unreadCount } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);



  // Wait until session is resolved from storage
  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--c-bg-dark)', color: '#A9C4B6' }}>
        <Loader2 size={28} className="spin" />
      </div>
    );
  }

  // No session → redirect to the standalone auth page
  if (!session) {
    return <Navigate to="/app/auth" replace />;
  }

  const path = location.pathname;

  async function handleLogout() {
    await storage.set('session', JSON.stringify(null));
    setSession(null);
    navigate('/app/auth', { replace: true });
  }

  const navItems = [
    { label: 'Book a Slot', path: '/app/book', icon: <CalendarDays size={14} /> },
    { label: `My Bookings`, path: '/app/my-bookings', icon: <BookOpen size={14} /> },
    { label: 'Recurring', path: '/app/recurring', icon: <RotateCcw size={14} /> },
    { label: 'Membership', path: '/app/membership', icon: <Star size={14} /> },
    ...(session.role === 'admin' ? [{ label: 'Admin', path: '/app/admin', icon: <ShieldCheck size={14} />, admin: true }] : []),
  ];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <div className="app-wordmark display">
              THE DORSET <span>CRICKET CENTRE</span>
            </div>
            <div className="app-tagline">Hurn Bridge Sports Club · Christchurch</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }} ref={notifRef}>
            <button className="notif-btn" onClick={() => setNotifOpen(o => !o)} aria-label="Notifications">
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--c-gold)', color: '#10201A', fontSize: 10, fontWeight: 800, borderRadius: 10, padding: '1px 5px', lineHeight: 1 }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="notif-panel">
                <div className="notif-header">
                  <span>Notifications ({notifications.length})</span>
                  <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--c-text-mute)', fontSize: 11, cursor: 'pointer' }}>
                    Mark all read
                  </button>
                </div>
                {notifications.map(n => (
                  <div className="notif-item" key={n.id}>
                    <span className="notif-dot-l" style={{ background: n.color }} />
                    <div>
                      <div className="notif-text">{n.text}</div>
                      <div className="notif-time">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="app-acctbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--c-text-sub)' }}>{session.name}</span>
            <span className={`badge ${session.role === 'admin' ? 'badge-gold' : session.role === 'pending_admin' ? 'badge-red' : 'badge-green'}`}>
              {session.role === 'admin' ? 'Staff' : session.role === 'pending_admin' ? 'Staff (Pending)' : 'Member'}
            </span>
            {session.ecbCoach && <span className="badge badge-green">ECB Coach · 50% Off</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <PresenterHeaderToolbar />
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={12} /> Log out
            </button>
          </div>
        </div>

        {session.role === 'pending_admin' && (
          <div style={{ background: 'rgba(255,210,63,0.12)', borderBottom: '1px solid rgba(255,210,63,0.3)', padding: '8px 24px', fontSize: 12.5, color: 'var(--c-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={14} />
            <span>Your staff account registration is currently <b>pending approval</b> by the centre manager. Admin features will be enabled upon approval.</span>
          </div>
        )}

        <nav className="app-nav">
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-btn ${item.admin ? 'admin-btn' : ''} ${path.startsWith(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main-body">
        <Outlet />
      </main>

      <DemoSpotlight />
      {toast && <Toast text={toast.text} type={toast.type} />}
    </div>
  );
}
