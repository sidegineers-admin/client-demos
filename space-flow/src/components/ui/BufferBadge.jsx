import React from 'react';
import { Timer, Zap } from 'lucide-react';

export default function BufferBadge({ type, minutes }) {
  if (!minutes) return null;
  const label = type === 'setup'
    ? `${minutes}min setup buffer`
    : `${minutes}min teardown buffer`;
  return (
    <span className={`buffer-badge buffer-badge-${type}`}>
      {type === 'setup' ? <Zap size={10} /> : <Timer size={10} />}
      {label}
    </span>
  );
}
