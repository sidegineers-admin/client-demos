import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, seedDemoData, uid } from './storage.js';

const SpaceFlowContext = createContext(null);
export const useApp = () => useContext(SpaceFlowContext);

/* ─── Pricing Engine ─── */
export function calculatePrice(facility, { durationHours, eventType, date, addOns = [], memberDiscount = false, settings = {} }) {
  if (!facility) return 0;
  let base = facility.baseHourlyRate * durationHours;

  // Event type multiplier
  const eventMultipliers = {
    Wedding: 1.5, Gala: 1.4, Exhibition: 1.3, Reception: 1.2,
    Conference: 1.1, Match: 1.2, Tournament: 1.3, Filming: 1.15,
    'Product Launch': 1.25, Party: 1.1, Networking: 1.0,
    default: 1.0,
  };
  base *= (eventMultipliers[eventType] ?? eventMultipliers.default);

  // Weekend peak
  if (date) {
    const d = new Date(date);
    const dow = d.getDay();
    if (dow === 0 || dow === 6) base *= (facility.peakMultiplier || 1.25);
  }

  // Add-ons
  const addOnTotal = addOns.reduce((sum, a) => sum + (a.price || 0), 0);

  // Early booking discount
  let discount = 0;
  if (date && settings.earlyBookingDays && settings.earlyBookingDiscount) {
    const daysUntil = Math.floor((new Date(date) - new Date()) / 86400000);
    if (daysUntil >= settings.earlyBookingDays) discount = settings.earlyBookingDiscount / 100;
  }
  if (memberDiscount && settings.memberDiscount) discount += settings.memberDiscount / 100;

  const subtotal = base * (1 - discount) + addOnTotal;
  const tax = settings.taxRate ? subtotal * (settings.taxRate / 100) : 0;
  return { base: Math.round(base * 100) / 100, discount, addOnTotal, subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, total: Math.round((subtotal + tax) * 100) / 100 };
}

/* ─── Buffer helpers ─── */
export function getBufferRules(facility, eventType) {
  if (!facility) return { setup: 60, teardown: 60 };
  return facility.bufferRules?.[eventType] ?? facility.bufferRules?.default ?? { setup: 60, teardown: 60 };
}

export function getSlotState(facilityId, dateKey, hour, bookings) {
  const dayBookings = bookings.filter(b =>
    b.facilityId === facilityId &&
    b.date === dateKey &&
    b.status !== 'cancelled'
  );

  for (const bk of dayBookings) {
    const start = bk.startHour;
    const end = start + bk.durationHours;
    if (hour >= start && hour < end) {
      if (bk.status === 'pending_approval') return { state: 'pending', booking: bk };
      if (bk.status === 'held') return { state: 'held', booking: bk };
      return { state: 'booked', booking: bk };
    }
  }

  // Check buffer zones from all bookings
  for (const bk of dayBookings) {
    const start = bk.startHour;
    const end = start + bk.durationHours;
    // We fetch buffer from SEED_FACILITIES since we don't have facility object here
    // Caller should use getSlotStateWithFacility for full buffer support
    const setupHours = 1;
    const teardownHours = 1;
    if (hour >= start - setupHours && hour < start) return { state: 'setup', booking: bk };
    if (hour >= end && hour < end + teardownHours) return { state: 'teardown', booking: bk };
  }

  return { state: 'available' };
}

export function getSlotStateFull(facility, dateKey, hour, bookings) {
  if (!facility) return { state: 'available' };
  const dayBookings = bookings.filter(b =>
    b.facilityId === facility.id &&
    b.date === dateKey &&
    b.status !== 'cancelled'
  );

  for (const bk of dayBookings) {
    const start = bk.startHour;
    const end = start + bk.durationHours;
    if (hour >= start && hour < end) {
      if (bk.status === 'pending_approval') return { state: 'pending', booking: bk };
      if (bk.status === 'held') return { state: 'held', booking: bk };
      return { state: 'booked', booking: bk };
    }
  }

  for (const bk of dayBookings) {
    const start = bk.startHour;
    const end = start + bk.durationHours;
    const rules = getBufferRules(facility, bk.eventType);
    const setupHours = Math.ceil(rules.setup / 60);
    const teardownHours = Math.ceil(rules.teardown / 60);
    if (hour >= start - setupHours && hour < start) return { state: 'setup', booking: bk, bufferMins: rules.setup };
    if (hour >= end && hour < end + teardownHours) return { state: 'teardown', booking: bk, bufferMins: rules.teardown };
  }

  // Check open hours
  const open = facility.openHours?.start ?? 8;
  const close = facility.openHours?.end ?? 22;
  if (hour < open || hour >= close) return { state: 'blocked' };

  // Check day of week
  const date = new Date(dateKey);
  const dow = date.getDay();
  if (!facility.availableDays?.includes(dow)) return { state: 'blocked' };

  return { state: 'available' };
}

const SAMPLE_NOTIFICATIONS = [
  { id: 'n1', text: 'Grand Ballroom booking confirmed — Eleanor & James Ashworth on ' + new Date(Date.now() + 86400000*3).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }), time: '10 min ago', color: 'var(--sf-emerald)', read: false },
  { id: 'n2', text: 'New pending approval: Westfield CC cricket ground booking for match.', time: '1 hr ago', color: 'var(--sf-amber)', read: false },
  { id: 'n3', text: 'Card pre-auth hold of £500 captured for Rooftop Terrace booking.', time: '3 hr ago', color: 'var(--sf-cyan)', read: true },
];

export function AppProvider({ children }) {
  const [session, setSession]           = useState(null);
  const [authChecked, setAuthChecked]   = useState(false);
  const [facilities, setFacilities]     = useState([]);
  const [bookings, setBookings]         = useState([]);
  const [myIds, setMyIds]               = useState([]);
  const [settings, setSettings]         = useState({});
  const [toast, setToast]               = useState(null);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);

  // Booking flow state (wizard)
  const [pendingBooking, setPendingBooking] = useState(null);

  // Theme state (Dark / Light)
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('sf_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const setTheme = useCallback((t) => {
    setThemeState(t);
    try {
      localStorage.setItem('sf_theme', t);
    } catch (e) { console.error(e); }
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const showToast = useCallback((text, type = 'ok', duration = 3400) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const loadAll = useCallback(async () => {
    await seedDemoData();
    try {
      const [fRes, bRes, mRes, sRes, sessRes] = await Promise.all([
        storage.get('facilities'),
        storage.get('bookings'),
        storage.get('my-booking-ids'),
        storage.get('settings'),
        storage.get('session'),
      ]);
      if (fRes?.value) setFacilities(JSON.parse(fRes.value));
      if (bRes?.value) setBookings(JSON.parse(bRes.value));
      if (mRes?.value) setMyIds(JSON.parse(mRes.value));
      if (sRes?.value) setSettings(JSON.parse(sRes.value));
      if (sessRes?.value) {
        const s = JSON.parse(sessRes.value);
        if (s) setSession(s);
      }
    } catch (e) { console.error(e); }
    setAuthChecked(true);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const refreshBookings = useCallback(async () => {
    const res = await storage.get('bookings');
    if (res?.value) setBookings(JSON.parse(res.value));
  }, []);

  const refreshFacilities = useCallback(async () => {
    const res = await storage.get('facilities');
    if (res?.value) setFacilities(JSON.parse(res.value));
  }, []);

  const saveSettings = useCallback(async (next) => {
    setSettings(next);
    await storage.set('settings', JSON.stringify(next));
  }, []);

  const saveFacility = useCallback(async (facility) => {
    const next = facilities.some(f => f.id === facility.id)
      ? facilities.map(f => f.id === facility.id ? facility : f)
      : [...facilities, facility];
    setFacilities(next);
    await storage.set('facilities', JSON.stringify(next));
  }, [facilities]);

  const deleteFacility = useCallback(async (id) => {
    const next = facilities.filter(f => f.id !== id);
    setFacilities(next);
    await storage.set('facilities', JSON.stringify(next));
  }, [facilities]);

  const createBooking = useCallback(async (bookingData) => {
    const newBooking = { id: 'bk-' + uid(), ...bookingData, createdAt: Date.now() };
    const next = [...bookings, newBooking];
    setBookings(next);
    await storage.set('bookings', JSON.stringify(next));
    const nextIds = [...myIds, newBooking.id];
    setMyIds(nextIds);
    await storage.set('my-booking-ids', JSON.stringify(nextIds));
    return newBooking;
  }, [bookings, myIds]);

  const updateBooking = useCallback(async (id, patch) => {
    const next = bookings.map(b => b.id === id ? { ...b, ...patch } : b);
    setBookings(next);
    await storage.set('bookings', JSON.stringify(next));
  }, [bookings]);

  const cancelBooking = useCallback(async (id) => {
    await updateBooking(id, { status: 'cancelled' });
  }, [updateBooking]);

  const approveBooking = useCallback(async (id) => {
    await updateBooking(id, { status: 'confirmed', confirmedAt: Date.now(), paymentStatus: 'invoiced' });
  }, [updateBooking]);

  const rejectBooking = useCallback(async (id) => {
    await updateBooking(id, { status: 'rejected' });
  }, [updateBooking]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const myBookings = bookings.filter(b => myIds.includes(b.id));

  const value = {
    session, setSession, authChecked,
    facilities, setFacilities, saveFacility, deleteFacility, refreshFacilities,
    bookings, setBookings, refreshBookings, myBookings, myIds, setMyIds,
    settings, saveSettings,
    toast, showToast,
    theme, setTheme, toggleTheme,
    notifications, markAllRead, unreadCount,
    pendingBooking, setPendingBooking,
    createBooking, updateBooking, cancelBooking, approveBooking, rejectBooking,
    calculatePrice, getSlotStateFull, getBufferRules,
  };

  return <SpaceFlowContext.Provider value={value}>{children}</SpaceFlowContext.Provider>;
}
