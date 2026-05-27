'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

async function ensureRazorpayScript(): Promise<void> {
  if (document.getElementById('razorpay-sdk')) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.id = 'razorpay-sdk';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(s);
  });
}

export default function RazorpayTest() {
  const [loading, setLoading] = useState(false);

  const onPay = async () => {
    try {
      setLoading(true);
      const orderRes = await fetch('/api/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'razorpay_create_order', amount: 100 }), // 100 paise = ₹1.00
      });

      if (!orderRes.ok) {
        const errText = await orderRes.text();
        alert('Failed to create order: ' + errText);
        return;
      }

      const { orderId, amount, currency } = await orderRes.json();

      await ensureRazorpayScript();
      if (!window.Razorpay) {
        alert('Razorpay SDK not available');
        return;
      }

      const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY;
      if (!key) {
        alert('Missing NEXT_PUBLIC_RAZORPAY_KEY');
        return;
      }

      const rzp = new window.Razorpay({
        key,
        order_id: orderId,
        amount,
        currency: currency || 'INR',
        name: 'Finance App',
        description: 'Test Payment',
        prefill: {
          name: 'Test User',
          email: 'test@example.com',
          contact: '9999999999',
        },
        handler: async (resp: any) => {
          try {
            const verifyRes = await fetch('/api/app', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'razorpay_verify', ...resp }),
            });
            const { verified } = await verifyRes.json();
            alert(verified ? 'Payment Verified' : 'Verification Failed');
          } catch {
            alert('Verification error');
          }
        },
        modal: {
          ondismiss: () => {
            // No-op
          },
        },
        theme: { color: '#0ea5e9' },
      });
      rzp.open();
    } catch {
      alert('Payment init failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={onPay} disabled={loading}>
      {loading ? 'Processing…' : 'Test Razorpay Payment (₹1.00)'}
    </Button>
  );
}


