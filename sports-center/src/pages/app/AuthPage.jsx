import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, User, ShieldCheck, KeyRound, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { storage, hashPassword, checkLogin, uid } from '../../store/storage.js';

const ADMIN_CODE = 'HURNBRIDGE-STAFF';

export default function AuthPage() {
  const { session, setSession, authChecked, showToast } = useApp();
  const navigate = useNavigate();

  // All hooks declared before any return
  const [tab, setTab]             = useState('login'); // 'login' | 'register' | 'forgot'
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAdmin, setIsAdmin]     = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [isEcb, setIsEcb]         = useState(false);
  const [ecbNum, setEcbNum]       = useState('');
  const [error, setError]         = useState('');
  const [info, setInfo]           = useState('');
  const [busy, setBusy]           = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // If already authenticated, redirect to the app
  if (authChecked && session) return <Navigate to="/app/book" replace />;

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    try {
      const res = await storage.get('users');
      const users = res?.value ? JSON.parse(res.value) : [];
      const lc = email.trim().toLowerCase();
      const found = users.find(u => u.email === lc);
      const hash = await checkLogin(lc, password);
      if (!found || found.passHash !== hash) {
        setError('Email or password is incorrect.\u2003Tip: demo accounts use password "demo123"');
        setBusy(false); return;
      }
      const s = {
        userId: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
        ecbCoach: !!found.ecbCoach,
        ecbNumber: found.ecbNumber || ''
      };
      await storage.set('session', JSON.stringify(s));
      setSession(s);
      if (found.role === 'pending_admin') {
        showToast('Logged in (Staff pending approval).', 'info');
      } else {
        showToast('Welcome back, ' + found.name + '!');
      }
      navigate('/app/book', { replace: true });
    } catch {
      setError('Could not sign in. Try again.');
    }
    setBusy(false);
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!name.trim() || !email.trim() || !password) { setError('Fill in all required fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (isEcb && !ecbNum.trim()) { setError('Enter your ECB coach ID number.'); return; }
    setBusy(true);
    try {
      const res = await storage.get('users');
      const users = res?.value ? JSON.parse(res.value) : [];
      const lc = email.trim().toLowerCase();
      if (users.some(u => u.email === lc)) { setError('An account already exists for that email.'); setBusy(false); return; }
      const hash = await hashPassword(password);
      
      // Determine staff role: if adminCode supplied matches code -> admin, else if staff checked -> pending_admin
      let assignedRole = 'user';
      if (isAdmin) {
        assignedRole = (adminCode.trim() === ADMIN_CODE) ? 'admin' : 'pending_admin';
      }

      const newUser = {
        id: uid(),
        name: name.trim(),
        email: lc,
        passHash: hash,
        role: assignedRole,
        ecbCoach: isEcb,
        ecbNumber: isEcb ? ecbNum.trim() : '',
        createdAt: Date.now()
      };
      await storage.set('users', JSON.stringify([...users, newUser]));
      const s = {
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        ecbCoach: newUser.ecbCoach,
        ecbNumber: newUser.ecbNumber
      };
      await storage.set('session', JSON.stringify(s));
      setSession(s);
      if (assignedRole === 'pending_admin') {
        showToast('Staff registration submitted! Awaiting manager approval.');
      } else {
        showToast('Account created successfully!');
      }
      navigate('/app/book', { replace: true });
    } catch {
      setError('Could not create account. Try again.');
    }
    setBusy(false);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email.trim() || !newPassword) { setError('Enter your email and new password.'); return; }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      const res = await storage.get('users');
      const users = res?.value ? JSON.parse(res.value) : [];
      const lc = email.trim().toLowerCase();
      const idx = users.findIndex(u => u.email === lc);
      if (idx === -1) {
        setError('No account found for that email address.');
        setBusy(false); return;
      }
      const newHash = await hashPassword(newPassword);
      users[idx].passHash = newHash;
      await storage.set('users', JSON.stringify(users));
      setResetSuccess(true);
      showToast('Password updated! You can now log in.');
    } catch {
      setError('Could not reset password. Try again.');
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg-dark)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ maxWidth: 420, width: '100%', padding: '40px 20px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="display" style={{ fontSize: 36, lineHeight: 1 }}>
            THE DORSET <span className="text-gold">CRICKET CENTRE</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--c-text-mute)', marginTop: 8 }}>Hurn Bridge Sports Club · Christchurch</div>
        </div>

        {/* Demo accounts hint */}
        <div style={{ background: 'rgba(255,210,63,0.08)', border: '1px solid rgba(255,210,63,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 12.5, color: 'var(--c-text-sub)' }}>
          <strong style={{ color: 'var(--c-gold)' }}>Demo accounts</strong> — password <span className="mono" style={{ color: 'var(--c-gold)' }}>demo123</span><br />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 3, marginTop: 6, fontSize: 12 }}>
            <div>• <b style={{ color: '#52B788' }}>tom@demo.com</b> (Member, 10% off)</div>
            <div>• <b style={{ color: '#5B9BD5' }}>sarah@demo.com</b> (ECB Coach ID: ECB-44821, 50% off)</div>
            <div>• <b style={{ color: '#FFD23F' }}>staff@hurnbridge.cc</b> (Super Admin)</div>
            <div>• <b style={{ color: '#E24B4A' }}>alex@demo.com</b> (Pending Staff approval)</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {[
            { id: 'login', label: 'Log in' },
            { id: 'register', label: 'Register' },
            { id: 'forgot', label: 'Reset PW' },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(''); setInfo(''); setResetSuccess(false); }}
              className="btn"
              style={{ flex: 1, padding: '8px 4px', fontSize: 13, background: tab === t.id ? 'var(--c-gold)' : 'rgba(247,245,240,0.06)', color: tab === t.id ? '#10201A' : 'var(--c-text-sub)', border: '1px solid ' + (tab === t.id ? 'var(--c-gold)' : 'var(--c-border-hi)') }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="card">
          {tab === 'forgot' && resetSuccess ? (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <CheckCircle2 size={42} color="var(--c-green)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)', marginBottom: 6 }}>Password Reset Successfully</div>
              <div style={{ fontSize: 13, color: 'var(--c-text-mute)', marginBottom: 20 }}>
                Your password for <b>{email}</b> has been updated. You can now log in with your new password.
              </div>
              <button className="btn btn-primary w-full" onClick={() => { setTab('login'); setResetSuccess(false); }}>
                Go to Login →
              </button>
            </div>
          ) : (
            <form onSubmit={tab === 'login' ? handleLogin : tab === 'register' ? handleRegister : handleResetPassword}>
              {tab === 'register' && (
                <div className="input-group">
                  <label className="input-label">Full name</label>
                  <div className="input-wrap">
                    <User size={15} color="var(--c-text-mute)" />
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
                  </div>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Email address</label>
                <div className="input-wrap">
                  <Mail size={15} color="var(--c-text-mute)" />
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" type="email" autoComplete="email" />
                </div>
              </div>

              {tab !== 'forgot' && (
                <div className="input-group" style={{ marginBottom: tab === 'register' ? 16 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="input-label">Password</label>
                    {tab === 'login' && (
                      <button type="button" onClick={() => setTab('forgot')} style={{ background: 'none', border: 'none', color: 'var(--c-gold)', fontSize: 11.5, cursor: 'pointer', marginBottom: 6 }}>
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="input-wrap">
                    <Lock size={15} color="var(--c-text-mute)" />
                    <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
                  </div>
                </div>
              )}

              {tab === 'forgot' && (
                <div className="input-group">
                  <label className="input-label">New password</label>
                  <div className="input-wrap">
                    <KeyRound size={15} color="var(--c-text-mute)" />
                    <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" type="password" />
                  </div>
                </div>
              )}

              {tab === 'register' && (
                <>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--c-text-sub)', marginBottom: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={isAdmin} onChange={e => setIsAdmin(e.target.checked)} />
                    I'm registering as centre staff
                  </label>
                  {isAdmin && (
                    <div style={{ background: 'rgba(255,210,63,0.06)', border: '1px solid rgba(255,210,63,0.2)', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                      <div style={{ fontSize: 12, color: 'var(--c-gold)', fontWeight: 600, marginBottom: 6 }}>Staff Approval Workflow</div>
                      <div style={{ fontSize: 11.5, color: 'var(--c-text-mute)', marginBottom: 8 }}>
                        Staff registrations require approval by the centre manager. Leave code blank to submit for approval, or enter instant code if provided.
                      </div>
                      <div className="input-wrap">
                        <ShieldCheck size={15} color="var(--c-text-mute)" />
                        <input value={adminCode} onChange={e => setAdminCode(e.target.value)} placeholder="Staff code (Optional - HURNBRIDGE-STAFF)" />
                      </div>
                    </div>
                  )}

                  {!isAdmin && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--c-text-sub)', marginBottom: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={isEcb} onChange={e => setIsEcb(e.target.checked)} />
                        I'm an ECB-qualified coach
                      </label>
                      {isEcb && (
                        <div className="input-group">
                          <label className="input-label">ECB coach ID number</label>
                          <div className="input-wrap">
                            <ShieldCheck size={15} color="var(--c-text-mute)" />
                            <input value={ecbNum} onChange={e => setEcbNum(e.target.value)} placeholder="e.g. ECB-44821" />
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--c-green)', marginTop: 5 }}>✓ Verified ECB coaches get a 50% discount on all lane bookings.</div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {error && <div className="input-err" style={{ marginTop: 8, marginBottom: 4 }}>{error}</div>}
              {info && <div style={{ fontSize: 12, color: 'var(--c-green)', marginTop: 8 }}>{info}</div>}

              <button className="btn btn-primary w-full" style={{ marginTop: 20 }} type="submit" disabled={busy}>
                {busy ? 'Please wait…' : tab === 'login' ? 'Log in' : tab === 'register' ? 'Create account' : 'Reset password'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: 'var(--c-text-mute)', fontSize: 12.5, cursor: 'pointer' }}>
            ← Back to presentation landing
          </button>
        </div>
      </div>
    </div>
  );
}
