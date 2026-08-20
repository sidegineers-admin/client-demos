import React from 'react';
import { Check, X } from 'lucide-react';

export default function Toast({ text, type = 'ok' }) {
  return (
    <div className={`toast ${type === 'error' ? 'error' : ''}`}>
      {type === 'ok' ? <Check size={15} /> : <X size={15} />}
      {text}
    </div>
  );
}
