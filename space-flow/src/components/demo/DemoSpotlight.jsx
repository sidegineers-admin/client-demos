import React, { useEffect, useState } from 'react';
import { useDemo } from '../../store/DemoContext.jsx';

export default function DemoSpotlight() {
  const { activeTargetSelector } = useDemo();
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!activeTargetSelector) return;
    const t = setTimeout(() => {
      const el = document.querySelector(activeTargetSelector);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(t);
  }, [activeTargetSelector]);

  useEffect(() => {
    if (!activeTargetSelector) { setCoords(null); return; }
    const update = () => {
      const el = document.querySelector(activeTargetSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        setCoords({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else { setCoords(null); }
    };
    update();
    const id = setInterval(update, 80);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => { clearInterval(id); window.removeEventListener('resize', update); window.removeEventListener('scroll', update); };
  }, [activeTargetSelector]);

  if (!activeTargetSelector || !coords) return null;

  const PAD = 8;
  return (
    <div
      className="demo-spotlight"
      style={{
        top: coords.top - PAD,
        left: coords.left - PAD,
        width: coords.width + PAD * 2,
        height: coords.height + PAD * 2,
      }}
    />
  );
}
