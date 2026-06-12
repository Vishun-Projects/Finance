'use client';

import React from 'react';

const BRAND_DOMAINS: Record<string, string> = {
  swiggy: 'swiggy.com',
  zomato: 'zomato.com',
  amazon: 'amazon.in',
  'amazon india': 'amazon.in',
  flipkart: 'flipkart.com',
  myntra: 'myntra.com',
  ajio: 'ajio.com',
  meesho: 'meesho.com',
  nykaa: 'nykaa.com',
  blinkit: 'blinkit.com',
  zepto: 'zeptonow.com',
  bigbasket: 'bigbasket.com',
  dunzo: 'dunzo.com',
  uber: 'uber.com',
  ola: 'olacabs.com',
  rapido: 'rapido.bike',
  irctc: 'irctc.co.in',
  makemytrip: 'makemytrip.com',
  cleartrip: 'cleartrip.com',
  netflix: 'netflix.com',
  spotify: 'spotify.com',
  hotstar: 'hotstar.com',
  youtube: 'youtube.com',
  google: 'google.com',
  'google pl': 'play.google.com',
  jio: 'jio.com',
  airtel: 'airtel.in',
  phonepe: 'phonepe.com',
  paytm: 'paytm.com',
  gpay: 'pay.google.com',
  cred: 'cred.club',
  zerodha: 'zerodha.com',
  groww: 'groww.in',
  upstox: 'upstox.com',
  bajaj: 'bajajfinserv.in',
  'bajaj finserv': 'bajajfinserv.in',
  dmart: 'dmartindia.com',
  starbucks: 'starbucks.in',
  mcdonalds: 'mcdonalds.co.in',
  kfc: 'kfc.co.in',
  dominos: 'dominos.co.in',
  pvr: 'pvrcinemas.com',
  bookmyshow: 'bookmyshow.com',
  tataplay: 'tataplay.com',
  'tata power': 'tatapower.com',
};

export function resolveBrandDomain(name: string): string | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  if (BRAND_DOMAINS[key]) return BRAND_DOMAINS[key];
  for (const [brandKey, domain] of Object.entries(BRAND_DOMAINS)) {
    if (key.includes(brandKey)) return domain;
  }
  return null;
}

export function BrandLogo({ name, size = 44 }: { name: string | undefined; size?: number }) {
  const [stage, setStage] = React.useState(0);
  const domain = name ? resolveBrandDomain(name) : null;

  const hue = name ? (name.charCodeAt(0) * 37 + name.charCodeAt(1 % name.length) * 13) % 360 : 200;
  const initials = name
    ? name
        .replace(/[^a-zA-Z\s]/g, '')
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : '?';

  if (!domain || stage === 2) {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{ background: `hsl(${hue}, 55%, 90%)` }}
      >
        <span className="text-xs font-black" style={{ color: `hsl(${hue}, 55%, 28%)` }}>
          {initials}
        </span>
      </div>
    );
  }

  const src =
    stage === 0
      ? `https://logo.clearbit.com/${domain}`
      : `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className="h-full w-full object-contain p-1"
      onError={() => setStage((s) => s + 1)}
    />
  );
}
