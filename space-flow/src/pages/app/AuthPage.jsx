import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Zap, LogIn, UserPlus, ArrowLeft } from 'lucide-react';
import { useApp } from '../../store/SpaceFlowContext.jsx';
import { storage, checkLogin, uid } from '../../store/storage.js';

const DEMO_ACCOUNTS = [
  { name: 'Alex Holt', email: 'alex@demo.com', role: 'Hirer', desc: 'Browse & book spaces', color: 'var(--sf-cyan)' },
  { name: 'Sofia Patel', email: 'sofia@demo.com', role: 'Hirer', desc: 'View my bookings', color: 'var(--sf-emerald)' },
  { name: 'Venue Manager', email: 'admin@spaceflow.com', role: 'Admin', desc: 'Approve & manage all', color: 'var(--sf-amber)' },
];

export default function AuthPage() {
  const { setSession, setMyIds, showToast } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        const usersRaw = await storage.get('users');
        const users = usersRaw?.value ? JSON.parse(usersRaw.value) : [];
        const user = users.find(u => u.email === email);
        if (!user) { showToast('Account not found', 'err'); setBusy(false); return; }
        const hash = await checkLogin(email, password);
        if (hash !== user.passHash) { showToast('Incorrect password', 'err'); setBusy(false); return; }
        const sessionData = { userId: user.id, name: user.name, email: user.email, role: user.role };
        await storage.set('session', JSON.stringify(sessionData));
        setSession(sessionData);
        if (user.email === 'alex@demo.com') {
          await storage.set('my-booking-ids', JSON.stringify(['bk-3', 'bk-4', 'bk-5']));
          setMyIds(['bk-3', 'bk-4', 'bk-5']);
        } else if (user.email === 'sofia@demo.com') {
          await storage.set('my-booking-ids', JSON.stringify(['bk-1']));
          setMyIds(['bk-1']);
        }
        showToast(`Welcome back, ${user.name}!`);
        if (user.role === 'admin' || user.role === 'staff') {
          navigate('/app/admin-calendar');
        } else {
          navigate('/app/book');
        }
      } else {
        if (!name.trim() || !email.trim() || password.length < 6) {
          showToast('Please fill in all fields (min 6 char password)', 'warn'); setBusy(false); return;
        }
        const usersRaw = await storage.get('users');
        const users = usersRaw?.value ? JSON.parse(usersRaw.value) : [];
        if (users.some(u => u.email === email)) { showToast('Email already registered', 'err'); setBusy(false); return; }
        const hash = await checkLogin(email, password);
        const newUser = { id: uid(), name: name.trim(), email, passHash: hash, role: 'hirer', createdAt: Date.now() };
        await storage.set('users', JSON.stringify([...users, newUser]));
        const sessionData = { userId: newUser.id, name: newUser.name, email: newUser.email, role: 'hirer' };
        await storage.set('session', JSON.stringify(sessionData));
        setSession(sessionData);
        setMyIds([]);
        showToast(`Welcome to Space-Flow, ${newUser.name}!`);
        navigate('/app/book');
      }
    } catch (err) {
      showToast('Something went wrong', 'err');
    }
    setBusy(false);
  }

  async function quickFill(account) {
    setEmail(account.email);
    setPassword('demo123');
    setMode('login');
    setBusy(true);
    try {
      const usersRaw = await storage.get('users');
      const users = usersRaw?.value ? JSON.parse(usersRaw.value) : [];
      let user = users.find(u => u.email === account.email);
      if (!user) {
        user = {
          id: account.email.includes('admin') ? 'u3' : (account.email.includes('sofia') ? 'u2' : 'u1'),
          name: account.name,
          email: account.email,
          role: account.role.toLowerCase()
        };
      }
      const sessionData = { userId: user.id, name: user.name, email: user.email, role: user.role };
      await storage.set('session', JSON.stringify(sessionData));
      setSession(sessionData);
      if (user.email === 'alex@demo.com') {
        await storage.set('my-booking-ids', JSON.stringify(['bk-3', 'bk-4', 'bk-5']));
        setMyIds(['bk-3', 'bk-4', 'bk-5']);
      } else if (user.email === 'sofia@demo.com') {
        await storage.set('my-booking-ids', JSON.stringify(['bk-1']));
        setMyIds(['bk-1']);
      }
      showToast(`Signed in as ${account.name} (${account.role})`, 'ok');
      if (user.role === 'admin' || user.role === 'staff') {
        navigate('/app/admin-calendar');
      } else {
        navigate('/app/book');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        {/* Back to landing */}
        <button
          onClick={() => navigate('/')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--sf-text-mute)', fontSize: 13, marginBottom: 24, transition: 'color 160ms' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--sf-text)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--sf-text-mute)'}
        >
          <ArrowLeft size={15} /> Back to Space-Flow
        </button>

        <div className="auth-card">
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div className="sf-wordmark" style={{ fontSize: 28, marginBottom: 4 }}>Space·Flow</div>
            <div style={{ fontSize: 13, color: 'var(--sf-text-mute)' }}>Intelligent Facility Booking</div>
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', borderRadius: 'var(--r-lg)', padding: 4, marginBottom: 24 }}>
            {[{ id: 'login', label: 'Sign in' }, { id: 'register', label: 'Register' }].map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{ flex: 1, padding: '8px', borderRadius: 'var(--r-md)', border: 'none', fontSize: 13.5, fontWeight: 600, transition: 'all 200ms', cursor: 'pointer',
                  background: mode === m.id ? 'var(--sf-violet-grad)' : 'transparent',
                  color: mode === m.id ? '#fff' : 'var(--sf-text-mute)',
                  boxShadow: mode === m.id ? '0 2px 10px var(--sf-violet-glow)' : 'none',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div className="sf-field" style={{ marginBottom: 14 }}>
                <label className="sf-label">Full name</label>
                <input className="sf-input" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required />
              </div>
            )}
            <div className="sf-field" style={{ marginBottom: 14 }}>
              <label className="sf-label">Email address</label>
              <input className="sf-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="sf-field" style={{ marginBottom: 24 }}>
              <label className="sf-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="sf-input"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
                  required
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--sf-text-mute)', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? <><LogIn size={16} /> Sign in</> : <><UserPlus size={16} /> Create account</>}
            </button>
          </form>

          {/* Demo quick fill */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--sf-border)' }} />
              <span style={{ fontSize: 11.5, color: 'var(--sf-text-mute)', display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={11} /> Demo accounts</span>
              <div style={{ flex: 1, height: 1, background: 'var(--sf-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DEMO_ACCOUNTS.map(acc => (
                <button key={acc.email} className="demo-pill" onClick={() => quickFill(acc)}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: acc.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{acc.name}</span>
                    <span style={{ color: 'var(--sf-text-mute)', fontSize: 12, marginLeft: 8 }}>({acc.role})</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--sf-text-mute)' }}>{acc.desc}</span>
                </button>
              ))}
              <p style={{ fontSize: 11.5, color: 'var(--sf-text-mute)', textAlign: 'center', marginTop: 4 }}>All demo accounts use password: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--sf-violet-lt)' }}>demo123</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
