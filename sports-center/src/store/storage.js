// Namespaced localStorage wrapper — simulates server storage for the prototype
const PREFIX = 'dcc_';
const SHARED_KEYS = ['bookings', 'closed-dates', 'users', 'settings'];

function isShared(key) {
  return SHARED_KEYS.includes(key);
}

export const storage = {
  async get(key, _shared = false) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? { value: raw } : null;
    } catch {
      return null;
    }
  },
  async set(key, value, _shared = false) {
    try {
      localStorage.setItem(PREFIX + key, value);
    } catch (e) {
      console.error('storage.set error', e);
    }
  },
  async remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  },
};

// Seed demo data if bookings are empty
export async function seedDemoData() {
  const existing = await storage.get('bookings');
  if (existing && existing.value) return; // already seeded

  const today = new Date();
  function dk(offset) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  const demoBookings = [
    { id: 'demo1', sportId: 'cricket', sportName: 'Cricket', unit: 'Lane 1', date: dk(0), time: '09:00', name: 'James Thornton', contact: '07700900001', type: 'booking', createdByRole: 'user', createdAt: Date.now() - 3600000, subsidised: false },
    { id: 'demo2', sportId: 'cricket', sportName: 'Cricket', unit: 'Lane 2', date: dk(0), time: '09:00', name: 'Sarah Mitchell', contact: '07700900002', type: 'booking', createdByRole: 'user', createdAt: Date.now() - 7200000, subsidised: false },
    { id: 'demo3', sportId: 'cricket', sportName: 'Cricket', unit: 'Lane 3', date: dk(0), time: '10:00', name: 'ECB Academy', contact: 'coach@ecb.org', type: 'booking', createdByRole: 'user', createdAt: Date.now() - 1800000, subsidised: true },
    { id: 'demo4', sportId: 'cricket', sportName: 'Cricket', unit: 'Lane 4', date: dk(0), time: '10:00', name: 'Held: Net maintenance', contact: '', type: 'blocked', createdByRole: 'admin', createdAt: Date.now() - 900000, subsidised: false },
    { id: 'demo5', sportId: 'cricket', sportName: 'Cricket', unit: 'Lane 1', date: dk(1), time: '11:00', name: 'Tom Richards', contact: '07700900003', type: 'booking', createdByRole: 'user', createdAt: Date.now() - 500000, subsidised: false },
    { id: 'demo6', sportId: 'cricket', sportName: 'Cricket', unit: 'Lane 2', date: dk(1), time: '14:00', name: 'Tom Richards', contact: '07700900003', type: 'booking', createdByRole: 'user', createdAt: Date.now() - 499000, subsidised: false, recurringId: 'rec1' },
    { id: 'demo7', sportId: 'cricket', sportName: 'Cricket', unit: 'Lane 3', date: dk(2), time: '08:00', name: 'Youth Academy', contact: 'academy@hurnbridge.cc', type: 'booking', createdByRole: 'admin', createdAt: Date.now() - 200000, subsidised: false },
    { id: 'demo8', sportId: 'cricket', sportName: 'Cricket', unit: 'Lane 5', date: dk(0), time: '15:00', name: 'Chris Evans', contact: 'chris@example.com', type: 'booking', createdByRole: 'user', createdAt: Date.now() - 100000, subsidised: false },
  ];

  await storage.set('bookings', JSON.stringify(demoBookings));

  // Seed my-booking-ids for demo member
  const myIdsExist = await storage.get('my-booking-ids');
  if (!myIdsExist || !myIdsExist.value) {
    await storage.set('my-booking-ids', JSON.stringify(['demo5', 'demo6']));
  }

  // seed demo users
  const usersExist = await storage.get('users');
  if (!usersExist || !usersExist.value) {
    // pre-hashed passwords:
    // "demo123" → stored as a fake hash for prototype purposes
    const users = [
      { id: 'u1', name: 'Tom Richards', email: 'tom@demo.com', passHash: 'demo_hash_tom', role: 'user', ecbCoach: false, ecbNumber: '', createdAt: Date.now() - 86400000 * 30 },
      { id: 'u2', name: 'Sarah Mitchell', email: 'sarah@demo.com', passHash: 'demo_hash_sarah', role: 'user', ecbCoach: true, ecbNumber: 'ECB-44821', createdAt: Date.now() - 86400000 * 60 },
      { id: 'u3', name: 'Centre Staff', email: 'staff@hurnbridge.cc', passHash: 'demo_hash_staff', role: 'admin', ecbCoach: false, ecbNumber: '', createdAt: Date.now() - 86400000 * 90 },
      { id: 'u4', name: 'Alex Turner', email: 'alex@demo.com', passHash: 'demo_hash_alex', role: 'pending_admin', ecbCoach: false, ecbNumber: '', createdAt: Date.now() - 86400000 * 2 },
    ];
    await storage.set('users', JSON.stringify(users));
  }

  // seed settings
  const settingsExist = await storage.get('settings');
  if (!settingsExist || !settingsExist.value) {
    await storage.set('settings', JSON.stringify({
      pricePerHour: 12,
      memberDiscount: 10,
      ecbDiscount: 50,
      membershipMonthly: 5,
      openHour: 7,
      closeHour: 21,
    }));
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export async function hashPassword(pw) {
  // For demo seeds, check against known demo hashes
  const demoHashes = { 'tom@demo.com': 'demo_hash_tom', 'sarah@demo.com': 'demo_hash_sarah', 'staff@hurnbridge.cc': 'demo_hash_staff' };
  // Real hash for new registrations
  try {
    const enc = new TextEncoder().encode(pw);
    const buf = await window.crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let h = 0;
    for (let i = 0; i < pw.length; i++) h = (h * 31 + pw.charCodeAt(i)) >>> 0;
    return 'fallback' + h.toString(16);
  }
}

// Special login check that handles demo accounts
export async function checkLogin(email, pw) {
  const demoPasswords = { 'tom@demo.com': 'demo123', 'sarah@demo.com': 'demo123', 'staff@hurnbridge.cc': 'demo123', 'alex@demo.com': 'demo123' };
  const demoHashes = { 'tom@demo.com': 'demo_hash_tom', 'sarah@demo.com': 'demo_hash_sarah', 'staff@hurnbridge.cc': 'demo_hash_staff', 'alex@demo.com': 'demo_hash_alex' };

  if (demoPasswords[email] && demoPasswords[email] === pw) {
    return demoHashes[email];
  }
  return await hashPassword(pw);
}
