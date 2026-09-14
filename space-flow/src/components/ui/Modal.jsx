import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sf-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`sf-modal ${size ? `sf-modal-${size}` : ''}`} onClick={e => e.stopPropagation()}>
        {(title || onClose) && (
          <div className="sf-modal-header">
            <div>
              {title && <h2 className="sf-modal-title">{title}</h2>}
              {subtitle && <div className="sf-modal-subtitle">{subtitle}</div>}
            </div>
            <button className="sf-modal-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
        )}
        <div className="sf-modal-body">
          {children}
        </div>
        {footer && (
          <div className="sf-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
