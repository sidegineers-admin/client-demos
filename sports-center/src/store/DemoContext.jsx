import React, { createContext, useContext, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from './AppContext.jsx';
import { storage } from './storage.js';

export const DemoContext = createContext(null);
export const useDemo = () => useContext(DemoContext);

function nextDay(offset = 1) {
  const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10);
}

export function DemoProvider({ children }) {
  const { setSession, setMyIds, showToast } = useApp();
  const navigate = useNavigate();

  const [activePersona, setActivePersona] = useState(null); // 'member' | 'ecb' | 'new_staff' | 'admin'
  const [activeJourneyId, setActiveJourneyId] = useState(null);
  const [activeTargetSelector, setActiveTargetSelector] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  // Visual UI state triggers
  const [demoPreselectSlot, setDemoPreselectSlot] = useState(false);
  const [demoSetRecurring, setDemoSetRecurring] = useState(false);
  const [demoOpenCancelModal, setDemoOpenCancelModal] = useState(false);
  const [demoOpenRangeModal, setDemoOpenRangeModal] = useState(false);

  const actionTimerRef = useRef(null);
  const nextActionRef = useRef(null);

  async function setDemoUserSession(email, name, role, ecbCoach = false, ecbNumber = '') {
    const sessionData = { userId: email, name, email, role, ecbCoach, ecbNumber };
    await storage.set('session', JSON.stringify(sessionData));
    setSession(sessionData);

    if (email === 'tom@demo.com') {
      const demoIds = ['demo5', 'demo6', 'demo1'];
      await storage.set('my-booking-ids', JSON.stringify(demoIds));
      setMyIds(demoIds);
    }
  }

  function clearActionTimer() {
    if (actionTimerRef.current) clearTimeout(actionTimerRef.current);
    nextActionRef.current = null;
  }

  function resetVisualTriggers() {
    setDemoPreselectSlot(false);
    setDemoSetRecurring(false);
    setDemoOpenCancelModal(false);
    setDemoOpenRangeModal(false);
  }

  function togglePlayPause() {
    if (isPlaying) {
      clearActionTimer();
      setIsPlaying(false);
      showToast('⏸ Journey Paused');
    } else {
      setIsPlaying(true);
      showToast('▶ Resuming Journey');
      if (nextActionRef.current) {
        nextActionRef.current();
      }
    }
  }

  async function triggerJourney(journeyId) {
    clearActionTimer();
    resetVisualTriggers();
    setActiveJourneyId(journeyId);
    setIsPlaying(true);
    setIsCompleted(false);

    const STEP_DELAY = 3800;

    switch (journeyId) {
      // ── 1. SINGLE SLOT BOOKING ──────────────────────────────────────
      case 'single_booking': {
        setActivePersona('member');
        await setDemoUserSession('tom@demo.com', 'Tom Richards', 'user');
        navigate('/app/auth');
        setActiveTargetSelector('#demo-login-btn');
        showToast('Step 1/6: Member logs in');

        const step2 = () => {
          navigate('/app/book');
          setDemoPreselectSlot(true);
          setActiveTargetSelector('#demo-slot-lane1-11');
          showToast('Step 2/6: Selects date & slot Lane 1 @ 11:00');

          const step3 = () => {
            setActiveTargetSelector('#demo-cart-pay-btn');
            showToast('Step 3/6: Cart bar displays Review & Pay →');

            const step4 = () => {
              sessionStorage.setItem('dcc_pending', JSON.stringify({
                selection: [{ key: 'Lane 1|11:00', unit: 'Lane 1', time: '11:00' }],
                dateKey: nextDay(1),
                sportId: 'cricket',
                sportName: 'Cricket',
                totalPrice: 10.80,
                recurring: false,
              }));
              navigate('/app/checkout');
              setActiveTargetSelector('#demo-pay-submit-btn');
              showToast('Step 4/6: Auto-fills card & pays £10.80');

              const step5 = () => {
                sessionStorage.setItem('dcc_confirm', JSON.stringify({
                  ref: 'DCC-DEMO01',
                  sportName: 'Cricket',
                  dateKey: nextDay(1),
                  totalPrice: 10.80,
                  paymentRef: 'TXN-DEMO0001',
                  selection: [{ key: 'Lane 1|11:00', unit: 'Lane 1', time: '11:00' }],
                  recurring: false,
                  name: 'Tom Richards',
                }));
                navigate('/app/confirm');
                setActiveTargetSelector('#demo-qr-wrap');
                showToast('Step 5/6: Saves QR code pass DCC-DEMO01');

                const step6 = () => {
                  navigate('/app/my-bookings');
                  setActiveTargetSelector('#demo-cancel-btn-0');
                  setIsCompleted(true);
                  showToast('Step 6/6: Verifies newly created booking in My Bookings');
                };

                nextActionRef.current = step6;
                actionTimerRef.current = setTimeout(step6, STEP_DELAY);
              };

              nextActionRef.current = step5;
              actionTimerRef.current = setTimeout(step5, STEP_DELAY);
            };

            nextActionRef.current = step4;
            actionTimerRef.current = setTimeout(step4, STEP_DELAY);
          };

          nextActionRef.current = step3;
          actionTimerRef.current = setTimeout(step3, STEP_DELAY);
        };

        nextActionRef.current = step2;
        actionTimerRef.current = setTimeout(step2, STEP_DELAY);
        break;
      }

      // ── 2. MULTI-SLOT & RECURRING BOOKING ───────────────────────────
      case 'multi_recurring': {
        setActivePersona('member');
        await setDemoUserSession('tom@demo.com', 'Tom Richards', 'user');
        navigate('/app/auth');
        setActiveTargetSelector('#demo-login-btn');
        showToast('Step 1/6: Member logs in');

        const step2 = () => {
          navigate('/app/book');
          setDemoPreselectSlot(true);
          setDemoSetRecurring(true);
          setActiveTargetSelector('#demo-slot-lane1-11');
          showToast('Step 2/6: Selects slots & toggles 8-week standing order on board');

          const step3 = () => {
            setActiveTargetSelector('#demo-cart-pay-btn');
            showToast('Step 3/6: Cart bar displays Standing Order Total (£259.20)');

            const step4 = () => {
              sessionStorage.setItem('dcc_pending', JSON.stringify({
                selection: [
                  { key: 'Lane 1|11:00', unit: 'Lane 1', time: '11:00' },
                  { key: 'Lane 2|14:00', unit: 'Lane 2', time: '14:00' },
                ],
                dateKey: nextDay(2),
                sportId: 'cricket',
                sportName: 'Cricket',
                totalPrice: 259.20,
                recurring: true,
                recurFreq: 'weekly',
                recurWeeks: 8,
              }));
              navigate('/app/checkout');
              setActiveTargetSelector('#demo-pay-submit-btn');
              showToast('Step 4/6: Auto-fills card & confirms standing order payment');

              const step5 = () => {
                sessionStorage.setItem('dcc_confirm', JSON.stringify({
                  ref: 'DCC-RECUR01',
                  sportName: 'Cricket',
                  dateKey: nextDay(2),
                  totalPrice: 259.20,
                  paymentRef: 'TXN-RECUR8812',
                  selection: [
                    { key: 'Lane 1|11:00', unit: 'Lane 1', time: '11:00' },
                    { key: 'Lane 2|14:00', unit: 'Lane 2', time: '14:00' },
                  ],
                  recurring: true,
                  recurFreq: 'weekly',
                  recurCount: 8,
                  name: 'Tom Richards',
                }));
                navigate('/app/confirm');
                setActiveTargetSelector('#demo-qr-wrap');
                showToast('Step 5/6: Saves recurring standing order pass');

                const step6 = () => {
                  navigate('/app/my-bookings');
                  setActiveTargetSelector('#demo-cancel-btn-0');
                  setIsCompleted(true);
                  showToast('Step 6/6: Verifies standing order series in My Bookings');
                };

                nextActionRef.current = step6;
                actionTimerRef.current = setTimeout(step6, STEP_DELAY);
              };

              nextActionRef.current = step5;
              actionTimerRef.current = setTimeout(step5, STEP_DELAY);
            };

            nextActionRef.current = step4;
            actionTimerRef.current = setTimeout(step4, STEP_DELAY);
          };

          nextActionRef.current = step3;
          actionTimerRef.current = setTimeout(step3, STEP_DELAY);
        };

        nextActionRef.current = step2;
        actionTimerRef.current = setTimeout(step2, STEP_DELAY);
        break;
      }

      // ── 3. CANCELLATION & 24H CARD REVERSAL ─────────────────────────
      case 'cancellation_refund': {
        setActivePersona('member');
        await setDemoUserSession('tom@demo.com', 'Tom Richards', 'user');
        navigate('/app/auth');
        setActiveTargetSelector('#demo-login-btn');
        showToast('Step 1/4: Member logs in');

        const step2 = () => {
          navigate('/app/my-bookings');
          setActiveTargetSelector('#demo-cancel-btn-0');
          showToast('Step 2/4: Opens My Bookings list');

          const step3 = () => {
            setDemoOpenCancelModal(true);
            setActiveTargetSelector('#demo-cancel-modal-submit-btn');
            showToast('Step 3/4: Opens cancellation modal form (24h rule verified)');

            const step4 = () => {
              setDemoOpenCancelModal(false);
              setIsCompleted(true);
              showToast('Step 4/4: ✓ 100% Card reversal processed & booking cancelled');
            };

            nextActionRef.current = step4;
            actionTimerRef.current = setTimeout(step4, STEP_DELAY);
          };

          nextActionRef.current = step3;
          actionTimerRef.current = setTimeout(step3, STEP_DELAY);
        };

        nextActionRef.current = step2;
        actionTimerRef.current = setTimeout(step2, STEP_DELAY);
        break;
      }

      // ── 4. ECB COACH 50% RATE ───────────────────────────────────────
      case 'ecb_rate': {
        setActivePersona('ecb');
        await setDemoUserSession('sarah@demo.com', 'Sarah Mitchell', 'user', true, 'ECB-44821');
        navigate('/app/auth');
        setActiveTargetSelector('#demo-login-btn');
        showToast('Step 1/6: ECB Coach logs in');

        const step2 = () => {
          navigate('/app/book');
          setDemoPreselectSlot(true);
          setActiveTargetSelector('#demo-ecb-badge');
          showToast('Step 2/6: Board calculates 50% coach rate (£6.00/hr)');

          const step3 = () => {
            setActiveTargetSelector('#demo-cart-pay-btn');
            showToast('Step 3/6: Clicks Review & Pay');

            const step4 = () => {
              sessionStorage.setItem('dcc_pending', JSON.stringify({
                selection: [{ key: 'Lane 2|10:00', unit: 'Lane 2', time: '10:00' }],
                dateKey: nextDay(1),
                sportId: 'cricket',
                sportName: 'Cricket',
                totalPrice: 6.00,
              }));
              navigate('/app/checkout');
              setActiveTargetSelector('#demo-pay-submit-btn');
              showToast('Step 4/6: Confirms ECB coach rate');

              const step5 = () => {
                sessionStorage.setItem('dcc_confirm', JSON.stringify({
                  ref: 'DCC-ECB01',
                  sportName: 'Cricket',
                  dateKey: nextDay(1),
                  totalPrice: 6.00,
                  paymentRef: 'TXN-ECB44821',
                  selection: [{ key: 'Lane 2|10:00', unit: 'Lane 2', time: '10:00' }],
                  recurring: false,
                  name: 'Sarah Mitchell',
                }));
                navigate('/app/confirm');
                setActiveTargetSelector('#demo-qr-wrap');
                showToast('Step 5/6: Saves coach QR code pass');

                const step6 = () => {
                  navigate('/app/my-bookings');
                  setActiveTargetSelector('#demo-cancel-btn-0');
                  setIsCompleted(true);
                  showToast('Step 6/6: Verifies coach session in My Bookings');
                };

                nextActionRef.current = step6;
                actionTimerRef.current = setTimeout(step6, STEP_DELAY);
              };

              nextActionRef.current = step5;
              actionTimerRef.current = setTimeout(step5, STEP_DELAY);
            };

            nextActionRef.current = step4;
            actionTimerRef.current = setTimeout(step4, STEP_DELAY);
          };

          nextActionRef.current = step3;
          actionTimerRef.current = setTimeout(step3, STEP_DELAY);
        };

        nextActionRef.current = step2;
        actionTimerRef.current = setTimeout(step2, STEP_DELAY);
        break;
      }

      // ── 5. STAFF APPROVAL QUEUE ────────────────────────────────────
      case 'staff_approval': {
        setActivePersona('admin');
        await setDemoUserSession('staff@hurnbridge.cc', 'Centre Staff', 'admin');
        navigate('/app/auth');
        setActiveTargetSelector('#demo-login-btn');
        showToast('Step 1/4: Super-Admin logs in');

        const step2 = () => {
          navigate('/app/admin');
          setActiveTargetSelector('#demo-approve-alex-btn');
          showToast('Step 2/4: Opens Staff Approvals Queue');

          const step3 = () => {
            setActiveTargetSelector('#demo-approve-alex-btn');
            showToast('Step 3/4: Approves staff registration for Alex Turner');

            const step4 = () => {
              setIsCompleted(true);
              showToast('Step 4/4: Staff registration approved with full admin access');
            };

            nextActionRef.current = step4;
            actionTimerRef.current = setTimeout(step4, STEP_DELAY);
          };

          nextActionRef.current = step3;
          actionTimerRef.current = setTimeout(step3, STEP_DELAY);
        };

        nextActionRef.current = step2;
        actionTimerRef.current = setTimeout(step2, STEP_DELAY);
        break;
      }

      // ── 6. ADMIN DASHBOARD & ANALYTICS ─────────────────────────────
      case 'admin_dashboard': {
        setActivePersona('admin');
        await setDemoUserSession('staff@hurnbridge.cc', 'Centre Staff', 'admin');
        navigate('/app/auth');
        setActiveTargetSelector('#demo-login-btn');
        showToast('Step 1/3: Super-Admin logs in');

        const step2 = () => {
          navigate('/app/admin');
          setActiveTargetSelector(null);
          showToast('Step 2/3: Opens Admin Dashboard & Revenue Charts');

          const step3 = () => {
            setIsCompleted(true);
            showToast('Step 3/3: 8-week revenue (£3,420) & utilisation verified');
          };

          nextActionRef.current = step3;
          actionTimerRef.current = setTimeout(step3, STEP_DELAY);
        };

        nextActionRef.current = step2;
        actionTimerRef.current = setTimeout(step2, STEP_DELAY);
        break;
      }

      // ── 7. BLOCK LANES & RANGE HOLD ─────────────────────────────────
      case 'block_lanes': {
        setActivePersona('admin');
        await setDemoUserSession('staff@hurnbridge.cc', 'Centre Staff', 'admin');
        navigate('/app/auth');
        setActiveTargetSelector('#demo-login-btn');
        showToast('Step 1/4: Super-Admin logs in');

        const step2 = () => {
          navigate('/app/book');
          setActiveTargetSelector('#demo-block-range-btn');
          showToast('Step 2/4: Opens Super-Admin Booking Board');

          const step3 = () => {
            setDemoOpenRangeModal(true);
            setActiveTargetSelector('#demo-range-submit-btn');
            showToast('Step 3/4: Opens Block Lane / Date Range Modal');

            const step4 = () => {
              setDemoOpenRangeModal(false);
              setIsCompleted(true);
              showToast('Step 4/4: ✓ Pitch maintenance hold applied on Lane 1 across dates');
            };

            nextActionRef.current = step4;
            actionTimerRef.current = setTimeout(step4, STEP_DELAY);
          };

          nextActionRef.current = step3;
          actionTimerRef.current = setTimeout(step3, STEP_DELAY);
        };

        nextActionRef.current = step2;
        actionTimerRef.current = setTimeout(step2, STEP_DELAY);
        break;
      }

      // ── 8. FUTURE SPORTS EXPANSION ─────────────────────────────────
      case 'future_sports': {
        setIsCompleted(true);
        showToast('✅ Multi-Sport Platform Engine: Extensible to Squash, Padel & Badminton!');
        break;
      }

      default:
        break;
    }
  }

  function stopDemo() {
    clearActionTimer();
    resetVisualTriggers();
    setActivePersona(null);
    setActiveJourneyId(null);
    setActiveTargetSelector(null);
    setIsCompleted(false);
    setIsPlaying(true);
    navigate('/app/book');
  }

  function startDemo() {
    triggerJourney('single_booking');
  }

  return (
    <DemoContext.Provider
      value={{
        activePersona,
        activeJourneyId,
        activeTargetSelector,
        demoPreselectSlot,
        demoSetRecurring,
        demoOpenCancelModal,
        demoOpenRangeModal,
        isPlaying,
        isCompleted,
        togglePlayPause,
        triggerJourney,
        startDemo,
        stopDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
