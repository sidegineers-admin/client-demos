import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, seedDemoData } from './storage.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export const SPORTS = [
  { id: 'cricket', name: 'Cricket', icon: '🏏', unitLabel: 'Net Lane', units: ['Lane 1', 'Lane 2', 'Lane 3', 'Lane 4', 'Lane 5', 'Bowling Machine'] },
];

export const TIMES = Array.from({ length: 14 }, (_, i) => {
  const h = 7 + i;
  return `${String(h).padStart(2, '0')}:00`;
});

const SAMPLE_NOTIFICATIONS = [
  { id: 'n1', text: 'Your booking on Lane 2 tomorrow at 10:00 is confirmed.', time: '2 min ago', color: '#52B788', read: false },
  { id: 'n2', text: 'Standing booking renewed — Lane 3 next Tuesday at 14:00.', time: '1 hr ago', color: '#FFD23F', read: false },
  { id: 'n3', text: 'Reminder: Net practice in 24 hours — Lane 1, 09:00.', time: '3 hr ago', color: '#A9C4B6', read: true },
];

export function AppProvider({ children }) {
  const [session, setSession]         = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [bookings, setBookings]       = useState([]);
  const [closedDates, setClosedDates] = useState([]);
  const [myIds, setMyIds]             = useState([]);
  const [settings, setSettings]       = useState({ pricePerHour: 12, memberDiscount: 10, ecbDiscount: 50, membershipMonthly: 5 });
  const [toast, setToast]             = useState(null);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);

  const showToast = useCallback((text, type = 'ok', duration = 3200) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const loadAll = useCallback(async () => {
    await seedDemoData();

    try {
      const [bRes, cRes, mRes, sRes, sessRes] = await Promise.all([
        storage.get('bookings'),
        storage.get('closed-dates'),
        storage.get('my-booking-ids'),
        storage.get('settings'),
        storage.get('session'),
      ]);
      setBookings(bRes?.value  ? JSON.parse(bRes.value)  : []);
      setClosedDates(cRes?.value ? JSON.parse(cRes.value) : []);
      setMyIds(mRes?.value     ? JSON.parse(mRes.value)  : []);
      if (sRes?.value) setSettings(JSON.parse(sRes.value));
      if (sessRes?.value) {
        const s = JSON.parse(sessRes.value);
        if (s) { setSession(s); }
      }
    } catch (e) {
      console.error(e);
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refreshBookings = useCallback(async () => {
    const res = await storage.get('bookings');
    setBookings(res?.value ? JSON.parse(res.value) : []);
  }, []);

  const saveSettings = useCallback(async (next) => {
    setSettings(next);
    await storage.set('settings', JSON.stringify(next));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const value = {
    session, setSession,
    authChecked,
    bookings, setBookings, refreshBookings,
    closedDates, setClosedDates,
    myIds, setMyIds,
    settings, saveSettings,
    toast, showToast,
    notifications, markAllRead, unreadCount,
    SPORTS, TIMES,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
