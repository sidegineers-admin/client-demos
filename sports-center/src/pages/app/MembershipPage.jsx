import React, { useState } from 'react';
import { Check, Star, ShieldCheck, Zap } from 'lucide-react';
import { useApp } from '../../store/AppContext.jsx';
import { storage } from '../../store/storage.js';

export default function MembershipPage() {
  const { session, settings, saveSettings, showToast } = useApp();
  const [editingPrice, setEditingPrice] = useState(null);
  const [tempVal, setTempVal] = useState('');

  const ecbDisc = settings.ecbDiscount !== undefined ? settings.ecbDiscount : 50;

  const TIERS = [
    {
      id: 'guest',
      name: 'Guest',
      icon: <Zap size={22} />,
      color: '#A9C4B6',
      basePriceKey: null,
      period: 'one-off',
      desc: 'Book any time with no commitment.',
      perks: [
        'Up to 2 lanes per week',
        'Standard lane rate',
        'Online booking',
        'Email confirmation',
      ],
    },
    {
      id: 'member',
      name: 'Club Member',
      icon: <Star size={22} />,
      color: '#FFD23F',
      basePriceKey: 'membershipMonthly',
      period: '/month',
      featured: true,
      desc: 'The best value for regular cricketers.',
      perks: [
        'Unlimited lane bookings',
        `${settings.memberDiscount || 10}% discount on every slot`,
        'Priority booking window',
        'Recurring / standing bookings',
        'Member-only events',
      ],
    },
    {
      id: 'ecb',
      name: 'ECB Coach',
      icon: <ShieldCheck size={22} />,
      color: '#52B788',
      basePriceKey: null,
      period: 'verified ID',
      desc: 'Discounted access for qualified coaches.',
      perks: [
        `${ecbDisc}% discount on all lane bookings`,
        'ID number verification at checkout',
        'Unlimited bookings & recurring slots',
        'Priority booking window',
        'ECB coach verification badge',
      ],
    },
  ];

  function startEdit(key, currentVal) {
    setEditingPrice(key);
    setTempVal(String(currentVal));
  }

  async function savePrice(key) {
    const num = parseFloat(tempVal);
    if (isNaN(num) || num < 0) { setEditingPrice(null); return; }
    const next = { ...settings, [key]: num };
    await saveSettings(next);
    setEditingPrice(null);
    showToast('Pricing updated.');
  }

  const currentTier = session?.ecbCoach ? 'ecb' : 'member';

  return (
    <div className="membership-page">
      <div style={{ marginBottom: 8 }}>
        <h1 className="display" style={{ fontSize: 36, marginBottom: 6 }}>Membership Plans</h1>
        <p style={{ color: 'var(--c-text-mute)', fontSize: 13 }}>Choose the plan that suits your cricket. Pricing is editable for demo purposes.</p>
      </div>

      {/* Editable pricing hint */}
      <div style={{ background: 'rgba(255,210,63,0.07)', border: '1px solid rgba(255,210,63,0.2)', borderRadius: 10, padding: '11px 16px', marginBottom: 28, fontSize: 12.5, color: 'var(--c-text-sub)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Star size={14} style={{ color: 'var(--c-gold)', flexShrink: 0 }} />
        <span><b style={{ color: 'var(--c-gold)' }}>Demo mode:</b> Click any price to edit it live. Changes are saved for this session.</span>
      </div>

      <div className="tier-grid">
        {TIERS.map(tier => {
          const isActive = tier.id === currentTier;
          const price = tier.basePriceKey ? settings[tier.basePriceKey] : null;
          return (
            <div key={tier.id} className={`tier-card ${tier.featured ? 'featured' : ''}`}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `rgba(${tier.color === '#FFD23F' ? '255,210,63' : tier.color === '#52B788' ? '82,183,136' : '169,196,182'},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tier.color, marginBottom: 16 }}>
                {tier.icon}
              </div>
              <div className="tier-name">{tier.name}</div>

              {tier.basePriceKey ? (
                editingPrice === tier.basePriceKey ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0' }}>
                    <span className="mono" style={{ fontSize: 24, color: 'var(--c-gold)' }}>£</span>
                    <input
                      value={tempVal}
                      onChange={e => setTempVal(e.target.value)}
                      onBlur={() => savePrice(tier.basePriceKey)}
                      onKeyDown={e => e.key === 'Enter' && savePrice(tier.basePriceKey)}
                      style={{ background: 'rgba(255,210,63,0.1)', border: '1px solid var(--c-gold)', borderRadius: 6, color: 'var(--c-gold)', fontFamily: 'var(--font-mono)', fontSize: 24, width: 80, outline: 'none', padding: '4px 8px' }}
                      autoFocus
                    />
                    <span style={{ fontSize: 13, color: 'var(--c-text-mute)' }}>{tier.period}</span>
                  </div>
                ) : (
                  <div
                    className="tier-price"
                    title="Click to edit price"
                    style={{ cursor: 'pointer', margin: '8px 0' }}
                    onClick={() => startEdit(tier.basePriceKey, price)}
                  >
                    £{price.toFixed(2)} <span>{tier.period}</span>
                  </div>
                )
              ) : (
                <div className="tier-price" style={{ margin: '8px 0', color: tier.color }}>
                  {tier.id === 'ecb' ? `${ecbDisc}% OFF` : 'Pay as you go'} <span style={{ fontSize: 13 }}>{tier.period}</span>
                </div>
              )}

              <div style={{ fontSize: 12.5, color: 'var(--c-text-mute)', marginBottom: 16 }}>{tier.desc}</div>

              <ul className="tier-perks">
                {tier.perks.map(p => (
                  <li key={p} className="tier-perk">
                    <Check size={14} style={{ color: tier.color, flexShrink: 0 }} />
                    {p}
                  </li>
                ))}
              </ul>

              {isActive ? (
                <button className="btn w-full" style={{ background: `rgba(${tier.color === '#FFD23F' ? '255,210,63' : '82,183,136'},0.15)`, color: tier.color, border: `1px solid ${tier.color}` }} disabled>
                  Current plan
                </button>
              ) : tier.id !== 'ecb' ? (
                <button className="btn btn-ghost w-full" onClick={() => showToast('Upgrade flow coming soon — contact the centre.')}>
                  {tier.id === 'member' ? 'Join as member' : 'Book as guest'}
                </button>
              ) : (
                <button className="btn btn-ghost w-full" onClick={() => showToast('Enter your ECB Coach ID at registration or settings.')}>
                  Verify ECB Number
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Editable per-slot price */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)', marginBottom: 16 }}>Lane pricing settings</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { key: 'pricePerHour', label: 'Standard price per slot (1hr)' },
            { key: 'memberDiscount', label: 'Member discount (%)' },
            { key: 'ecbDiscount', label: 'ECB Coach discount (%)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <div style={{ fontSize: 12, color: 'var(--c-text-mute)', marginBottom: 8 }}>{label}</div>
              {editingPrice === key ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="mono" style={{ color: 'var(--c-gold)' }}>{key.includes('Discount') ? '' : '£'}</span>
                  <input
                    value={tempVal}
                    onChange={e => setTempVal(e.target.value)}
                    onBlur={() => savePrice(key)}
                    onKeyDown={e => e.key === 'Enter' && savePrice(key)}
                    style={{ background: 'rgba(255,210,63,0.1)', border: '1px solid var(--c-gold)', borderRadius: 6, color: 'var(--c-gold)', fontFamily: 'var(--font-mono)', fontSize: 20, width: 90, outline: 'none', padding: '4px 8px' }}
                    autoFocus
                  />
                  <span className="mono" style={{ color: 'var(--c-text-mute)' }}>{key.includes('Discount') ? '%' : ''}</span>
                </div>
              ) : (
                <div className="mono" style={{ fontSize: 22, color: 'var(--c-gold)', cursor: 'pointer' }} onClick={() => startEdit(key, settings[key] !== undefined ? settings[key] : (key === 'ecbDiscount' ? 50 : 0))}>
                  {key.includes('Discount') ? '' : '£'}{settings[key] !== undefined ? settings[key] : (key === 'ecbDiscount' ? 50 : 0)}{key.includes('Discount') ? '%' : ''}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--c-text-faint)', marginTop: 4 }}>Click to edit</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
