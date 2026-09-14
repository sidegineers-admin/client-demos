import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ICONS = { ok: <CheckCircle size={16} />, err: <XCircle size={16} />, warn: <AlertTriangle size={16} />, info: <Info size={16} /> };

export default function Toast({ text, type = 'ok' }) {
  return (
    <div className={`sf-toast sf-toast-${type}`}>
      {ICONS[type]}
      <span>{text}</span>
    </div>
  );
}
