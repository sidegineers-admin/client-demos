import React, { createContext, useContext, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './SpaceFlowContext.jsx';
import { storage } from './storage.js';

export const DemoContext = createContext(null);
export const useDemo = () => useContext(DemoContext);

function nextDay(offset = 1) {
  const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10);
}

const JOURNEYS = {
  'hirer-booking': {
    label: 'Hirer — Book a Space',
    persona: 'hirer',
    steps: [
      { text: 'Signing in as Alex Holt (hirer)…', target: null },
      { text: 'Browsing available spaces…', target: '.facility-card' },
      { text: 'Selecting Grand Ballroom for a wedding event…', target: '#facility-fac-1' },
      { text: 'Picking date & available time slots…', target: '.avail-grid' },
      { text: 'Proceeding to booking wizard…', target: '.btn-primary' },
      { text: 'Setting event type: Wedding, 280 attendees…', target: '#event-type-select' },
      { text: 'Adding in-house catering & AV add-ons…', target: '#addons-section' },
      { text: 'Reviewing full price breakdown…', target: '.price-total' },
      { text: 'Choosing card payment + enabling pre-auth hold…', target: '.pre-auth-card' },
      { text: 'Submitting booking — awaiting admin approval…', target: '.btn-primary' },
    ],
  },
  'admin-calendar': {
    label: 'Admin — Calendar & Direct Booking',
    persona: 'admin',
    steps: [
      { text: 'Switching to Admin Operations Console…', target: null },
      { text: 'Opening Operations Calendar view…', target: '.sf-nav' },
      { text: 'Inspecting Day timeline & turnaround buffers…', target: '.calendar-empty-slot' },
      { text: 'Switching to 7-Day Week schedule…', target: '.stat-card' },
      { text: 'Initiating direct walk-in / phone booking…', target: '.btn-primary' },
      { text: 'Dynamic buffers & security hold calculated in real time…', target: '.sf-modal' },
    ],
  },
  'admin-approve': {
    label: 'Admin — Approve Booking',
    persona: 'admin',
    steps: [
      { text: 'Signing in as Venue Manager…', target: null },
      { text: 'Opening Booking Management queue…', target: '.admin-tab-bar' },
      { text: 'Viewing pending approval bookings…', target: '.booking-pending-card' },
      { text: 'Reviewing Westfield CC cricket ground request…', target: '#bk-3-card' },
      { text: 'Pre-auth hold of £1,000 is captured on file…', target: '.hold-countdown' },
      { text: 'Approving booking — confirmation sent to hirer…', target: '.btn-success' },
    ],
  },
  'ai-layout': {
    label: 'Admin — AI Floorplan Layout',
    persona: 'admin',
    steps: [
      { text: 'Signing in as Venue Manager (Admin)…', target: null },
      { text: 'Opening internal AI Floorplan tool…', target: '.layout-drop-zone' },
      { text: 'Uploading hall photo for spatial analysis…', target: '.layout-drop-zone' },
      { text: 'Generating smart layout recommendations…', target: '.layout-mode-btn' },
      { text: 'Switching to Banquet layout — 20 round tables…', target: '#layout-banquet' },
      { text: 'Exporting layout as PNG for operations…', target: '#export-btn' },
    ],
  },
};

export function DemoProvider({ children }) {
  const { setSession, setMyIds, showToast } = useApp();
  const navigate = useNavigate();

  const [activePersona, setActivePersona] = useState(null);
  const [activeJourneyId, setActiveJourneyId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTargetSelector, setActiveTargetSelector] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [demoTriggers, setDemoTriggers] = useState({});

  const actionTimerRef = useRef(null);
  const nextActionRef = useRef(null);

  function clearTimer() {
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    nextActionRef.current = null;
  }

  async function setDemoSession(email, name, role) {
    const sessionData = { userId: email, name, email, role };
    await storage.set('session', JSON.stringify(sessionData));
    setSession(sessionData);
    if (email === 'alex@demo.com') {
      const ids = ['bk-3', 'bk-4', 'bk-5'];
      await storage.set('my-booking-ids', JSON.stringify(ids));
      setMyIds(ids);
    }
  }

  function togglePlayPause() {
    if (isPlaying) {
      clearTimer();
      setIsPlaying(false);
      showToast('⏸ Journey paused');
    } else {
      setIsPlaying(true);
      showToast('▶ Resuming journey');
      nextActionRef.current?.();
    }
  }

  async function triggerJourney(journeyId) {
    clearTimer();
    setActiveJourneyId(journeyId);
    setCurrentStep(0);
    setIsPlaying(true);
    setIsCompleted(false);
    setDemoTriggers({});
    setActiveTargetSelector(null);

    const journey = JOURNEYS[journeyId];
    if (!journey) return;

    const DELAY = 3600;

    // Set persona session
    if (journey.persona === 'admin') {
      await setDemoSession('admin@spaceflow.com', 'Venue Manager', 'admin');
    } else {
      await setDemoSession('alex@demo.com', 'Alex Holt', 'hirer');
    }
    setActivePersona(journey.persona);

    function runStep(stepIndex) {
      if (stepIndex >= journey.steps.length) {
        setIsCompleted(true);
        setActiveTargetSelector(null);
        showToast('✅ Journey complete!', 'ok');
        return;
      }
      setCurrentStep(stepIndex);
      const step = journey.steps[stepIndex];
      setActiveTargetSelector(step.target);

      // Journey-specific actions
      if (journeyId === 'hirer-booking') {
        if (stepIndex === 0) navigate('/app/book');
        if (stepIndex === 2) setDemoTriggers(t => ({ ...t, selectFacility: 'fac-1' }));
        if (stepIndex === 3) setDemoTriggers(t => ({ ...t, openCalendar: true }));
        if (stepIndex === 4) navigate('/app/book-flow');
        if (stepIndex === 5) setDemoTriggers(t => ({ ...t, setEventType: 'Wedding', setAttendees: 280 }));
        if (stepIndex === 6) setDemoTriggers(t => ({ ...t, addAddOns: true }));
        if (stepIndex === 7) navigate('/app/checkout');
        if (stepIndex === 8) setDemoTriggers(t => ({ ...t, enablePreAuth: true }));
        if (stepIndex === 9) navigate('/app/confirm');
      }

      if (journeyId === 'admin-calendar') {
        if (stepIndex === 0) navigate('/app/admin-calendar');
        if (stepIndex === 1) navigate('/app/admin-calendar');
        if (stepIndex === 2) setDemoTriggers(t => ({ ...t, switchView: 'day' }));
        if (stepIndex === 3) setDemoTriggers(t => ({ ...t, switchView: 'week' }));
        if (stepIndex === 4) setDemoTriggers(t => ({ ...t, openDirectBooking: true }));
      }

      if (journeyId === 'admin-approve') {
        if (stepIndex === 0) navigate('/app/admin-bookings');
        if (stepIndex === 2) setDemoTriggers(t => ({ ...t, filterPending: true }));
        if (stepIndex === 5) setDemoTriggers(t => ({ ...t, approveBooking: 'bk-3' }));
      }

      if (journeyId === 'ai-layout') {
        if (stepIndex === 0) navigate('/app/layout');
        if (stepIndex === 1) setDemoTriggers(t => ({ ...t, simulateUpload: true }));
        if (stepIndex === 2) setDemoTriggers(t => ({ ...t, generateLayout: true }));
        if (stepIndex === 3) setDemoTriggers(t => ({ ...t, setLayoutMode: 'banquet' }));
        if (stepIndex === 4) setDemoTriggers(t => ({ ...t, exportLayout: true }));
      }

      const next = () => runStep(stepIndex + 1);
      nextActionRef.current = next;
      if (isPlaying) {
        actionTimerRef.current = setTimeout(next, DELAY);
      }
    }

    runStep(0);
  }

  function resetJourney() {
    clearTimer();
    setActiveJourneyId(null);
    setCurrentStep(0);
    setActiveTargetSelector(null);
    setIsCompleted(false);
    setDemoTriggers({});
  }

  const currentJourney = JOURNEYS[activeJourneyId];
  const totalSteps = currentJourney?.steps?.length ?? 0;
  const currentStepInfo = currentJourney?.steps?.[currentStep];

  const value = {
    JOURNEYS,
    activePersona,
    activeJourneyId,
    currentStep,
    totalSteps,
    currentStepInfo,
    activeTargetSelector,
    isPlaying,
    isCompleted,
    demoTriggers, setDemoTriggers,
    triggerJourney,
    resetJourney,
    togglePlayPause,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
