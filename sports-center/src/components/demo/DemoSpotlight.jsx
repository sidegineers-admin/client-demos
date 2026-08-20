import React, { useEffect, useState } from 'react';
import { useDemo } from '../../store/DemoContext.jsx';

export default function DemoSpotlight() {
  const { activeTargetSelector } = useDemo();
  const [coords, setCoords] = useState(null);

  // 1. Scroll ONCE into view when target changes
  useEffect(() => {
    if (!activeTargetSelector) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(activeTargetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [activeTargetSelector]);

  // 2. Track viewport coordinates smoothly without re-scrolling
  useEffect(() => {
    if (!activeTargetSelector) {
      setCoords(null);
      return;
    }

    const updateCoords = () => {
      const el = document.querySelector(activeTargetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else {
        setCoords(null);
      }
    };

    updateCoords();
    const id = setInterval(updateCoords, 100);
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, { passive: true });

    return () => {
      clearInterval(id);
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords);
    };
  }, [activeTargetSelector]);

  if (!activeTargetSelector || !coords) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: coords.top - 6,
        left: coords.left - 6,
        width: coords.width + 12,
        height: coords.height + 12,
        border: '2.5px solid var(--c-gold)',
        borderRadius: 10,
        boxShadow: '0 0 0 4px rgba(255,210,63,0.35), 0 0 24px rgba(255,210,63,0.6)',
        pointerEvents: 'none',
        zIndex: 99999,
        transition: 'all 180ms ease-out',
      }}
    />
  );
}
