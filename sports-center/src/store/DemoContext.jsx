import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './AppContext.jsx';
import { storage } from './storage.js';

export const DemoContext = createContext(null);
export const useDemo = () => useContext(DemoContext);

function nextDay(offset = 1) {
  const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10);
}

const DEMO_STEPS = [
  {
    id: 'intro',
    persona: null,
    title: '🏏 Stage 1 — System Overview & Presentation',
    actionBadge: '⚡ OVERVIEW: Dorset Cricket Centre Prototype',
    narration: 'This auto-pilot tour walks through the full end-to-end user journey — member booking, ECB coach discounts, recurring sessions, and staff approval management.',
    route: '/',
    duration: 6500,
  },
  {
    id: 'member-login',
    persona: 'member',
    personaName: 'Tom Richards',
    title: 'Stage 2 — Member Authentication',
    actionBadge: '⚡ ACTION: Logging in as Member (tom@demo.com)',
    narration: 'Tom Richards is a club member. He opens the app and signs in. Club members get a 10% discount applied automatically to all lane bookings.',
    route: '/app/auth',
    autoLogin: { name: 'Tom Richards', email: 'tom@demo.com', role: 'user', ecbCoach: false, ecbNumber: '' },
    duration: 6000,
  },
  {
    id: 'booking-board',
    persona: 'member',
    personaName: 'Tom Richards',
    title: 'Stage 3 — Real-time Booking Board',
    actionBadge: '⚡ ACTION: Viewing 5 Net Lanes + Bowling Machine Grid',
    narration: 'Tom views the live availability board (5 net lanes + 1 bowling machine). Green = open, amber = booked, red = staff hold. No phone calls needed.',
    route: '/app/book',
    duration: 7000,
  },
  {
    id: 'checkout',
    persona: 'member',
    personaName: 'Tom Richards',
    title: 'Stage 4 — Selecting Slot & Stripe Checkout',
    actionBadge: '⚡ ACTION: Selected Lane 1 @ 11:00 (10% Member Discount Applied)',
    narration: 'Tom selects Lane 1 at 11:00. The checkout calculates his 10% member discount (£10.80 instead of £12.00) and processes payment securely.',
    route: '/app/checkout',
    bookingPayload: () => ({
      selection: [{ key: 'Lane 1|11:00', unit: 'Lane 1', time: '11:00' }],
      dateKey: nextDay(1),
      sportId: 'cricket',
      sportName: 'Cricket',
      totalPrice: 10.80,
    }),
    duration: 7000,
  },
  {
    id: 'confirmation',
    persona: 'member',
    personaName: 'Tom Richards',
    title: 'Stage 5 — Confirmation & Scannable Entry Pass',
    actionBadge: '⚡ ACTION: Payment Authorized — Generating Gate QR Code',
    narration: 'Payment confirmed! Tom receives booking reference DCC-DEMO01, a scannable QR code for the gate, and an automated notification.',
    route: '/app/confirm',
    confirmPayload: () => ({
      ref: 'DCC-DEMO01',
      sportName: 'Cricket',
      dateKey: nextDay(1),
      totalPrice: 10.80,
      paymentRef: 'TXN-DEMO0001',
      selection: [{ key: 'Lane 1|11:00', unit: 'Lane 1', time: '11:00' }],
      recurring: false,
      name: 'Tom Richards',
    }),
    duration: 6500,
  },
  {
    id: 'my-bookings',
    persona: 'member',
    personaName: 'Tom Richards',
    title: 'Stage 6 — My Bookings & 24h Reversal Policy',
    actionBadge: '⚡ ACTION: Viewing Booking History & Cancellation Rules',
    narration: 'Tom manages his bookings here. Cancellations with over 24 hours notice automatically trigger a 100% payment reversal to his card.',
    route: '/app/my-bookings',
    duration: 6500,
  },
  {
    id: 'ecb-login',
    persona: 'ecb',
    personaName: 'Sarah Mitchell',
    title: 'Stage 7 — ECB Coach Persona Switch',
    actionBadge: '⚡ ACTION: Logging in as ECB Coach (ID: ECB-44821)',
    narration: 'Switching personas to Sarah Mitchell, a qualified ECB coach. She registered with coach ID ECB-44821 to access subsidised coaching rates.',
    route: '/app/auth',
    autoLogin: { name: 'Sarah Mitchell', email: 'sarah@demo.com', role: 'user', ecbCoach: true, ecbNumber: 'ECB-44821' },
    duration: 6500,
  },
  {
    id: 'ecb-board',
    persona: 'ecb',
    personaName: 'Sarah Mitchell',
    title: 'Stage 8 — 50% ECB Coach Discount',
    actionBadge: '⚡ ACTION: 50% ECB Coach Discount Active Across All Slots',
    narration: 'Sarah sees the booking board with her 50% ECB coach discount applied automatically to all slots (£6.00/hr). Configurable by staff in settings.',
    route: '/app/book',
    duration: 7000,
  },
  {
    id: 'admin-login',
    persona: 'admin',
    personaName: 'Centre Staff',
    title: 'Stage 9 — Switch to Staff Admin Persona',
    actionBadge: '⚡ ACTION: Authenticating as Super-Admin Centre Staff',
    narration: 'Switching to the centre staff view. Staff have a private dashboard to track revenue, manage bookings, approve staff, and block date ranges.',
    route: '/app/auth',
    autoLogin: { name: 'Centre Staff', email: 'staff@hurnbridge.cc', role: 'admin', ecbCoach: false, ecbNumber: '' },
    duration: 6000,
  },
  {
    id: 'admin-overview',
    persona: 'admin',
    personaName: 'Centre Staff',
    title: 'Stage 10 — Revenue & Analytics Dashboard',
    actionBadge: '⚡ ACTION: Reviewing 8-Week Revenue & Utilisation Charts',
    narration: 'Staff view revenue trends across 8 weeks, booking volume, and standing orders. All statistics update automatically from real-time data.',
    route: '/app/admin',
    adminTab: 'overview',
    duration: 7000,
  },
  {
    id: 'admin-approvals',
    persona: 'admin',
    personaName: 'Centre Staff',
    title: 'Stage 11 — Staff Approval Workflow',
    actionBadge: '⚡ ACTION: Reviewing Pending Staff Registration (Alex Turner)',
    narration: 'New staff registrations require manager approval. Here staff can review pending applicant Alex Turner and grant admin access with 1 click.',
    route: '/app/admin',
    adminTab: 'approvals',
    duration: 7000,
  },
  {
    id: 'admin-block',
    persona: 'admin',
    personaName: 'Centre Staff',
    title: 'Stage 12 — Lane Range Blocking',
    actionBadge: '⚡ ACTION: Multi-day Lane Hold (Maintenance / Events)',
    narration: 'Staff can block specific lanes across a custom date range or close all lanes for match days. Members immediately see the hold reason on the board.',
    route: '/app/book',
    duration: 7000,
  },
  {
    id: 'done',
    persona: null,
    title: '🏁 Demonstration Complete',
    actionBadge: '⚡ PROTOTYPE READY: End-to-End Solution Demonstrated',
    narration: 'The Dorset Cricket Centre prototype covers user journeys, ECB discounts, 24h cancellations, staff approvals, and range blocking. Ready for live deployment.',
    route: '/',
    duration: 9000,
  },
];

export function DemoProvider({ children }) {
  const { setSession } = useApp();
  const navigate = useNavigate();

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [demoAdminTab, setDemoAdminTab] = useState(null);
  const timerRef = useRef(null);
  const isPlayingRef = useRef(false);

  const totalSteps = DEMO_STEPS.length;
  const step = DEMO_STEPS[stepIndex] || DEMO_STEPS[0];

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  async function applyStep(s) {
    if (!s) return;
    if (s.autoLogin) {
      const sessionData = {
        userId: s.autoLogin.email,
        name: s.autoLogin.name,
        email: s.autoLogin.email,
        role: s.autoLogin.role,
        ecbCoach: s.autoLogin.ecbCoach || false,
        ecbNumber: s.autoLogin.ecbNumber || '',
      };
      await storage.set('session', JSON.stringify(sessionData));
      setSession(sessionData);
      await new Promise(r => setTimeout(r, 200));
    }
    if (s.bookingPayload) sessionStorage.setItem('dcc_pending', JSON.stringify(s.bookingPayload()));
    if (s.confirmPayload) sessionStorage.setItem('dcc_confirm', JSON.stringify(s.confirmPayload()));
    if (s.adminTab !== undefined) setDemoAdminTab(s.adminTab);
    navigate(s.route);
  }

  useEffect(() => {
    if (!active || !isPlaying) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (!isPlayingRef.current) return;
      const next = stepIndex + 1;
      if (next < totalSteps) {
        setStepIndex(next);
        await applyStep(DEMO_STEPS[next]);
      } else {
        setIsPlaying(false);
      }
    }, step.duration || 6500);
    return () => clearTimeout(timerRef.current);
  }, [active, isPlaying, stepIndex]);

  async function startDemo() {
    setActive(true);
    setStepIndex(0);
    setIsPlaying(true);
    await applyStep(DEMO_STEPS[0]);
  }

  function stopDemo() {
    clearTimeout(timerRef.current);
    setActive(false);
    setIsPlaying(false);
    setStepIndex(0);
    setDemoAdminTab(null);
    navigate('/');
  }

  async function goToStepIdx(idx) {
    clearTimeout(timerRef.current);
    const clamped = Math.max(0, Math.min(idx, totalSteps - 1));
    setStepIndex(clamped);
    await applyStep(DEMO_STEPS[clamped]);
  }

  const nextStep = () => goToStepIdx(stepIndex + 1);
  const prevStep = () => goToStepIdx(stepIndex - 1);
  const togglePlay = () => setIsPlaying(p => !p);

  return (
    <DemoContext.Provider value={{ active, step, stepIndex, totalSteps, isPlaying, demoAdminTab, startDemo, stopDemo, nextStep, prevStep, togglePlay }}>
      {children}
    </DemoContext.Provider>
  );
}
