'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SmsReviewPanel } from '@/features/settings/components/sms-review-panel';
import {
  addSmsReviewRequestedListener,
  consumeSmsReviewRequest,
} from '@/lib/mobile/sms-bank-reader';
import {
  isSmsReviewDeepLink,
  openSmsReview,
  closeSmsReview,
  subscribeSmsReviewClose,
  subscribeSmsReviewOpen,
} from '@/lib/sms-bank/review-events';
import { countPendingSms } from '@/lib/sms-bank/pending-queue';
import { syncOverlayBubble } from '@/lib/sms-bank/sync';

/**
 * Global review overlay — opened by bubble deep link, plugin event, or Settings CTA.
 * Mounted once in the app shell so warm/cold start never requires Settings navigation.
 */
export function SmsReviewOverlayHost() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubOpen = subscribeSmsReviewOpen(() => {
      setOpen(true);
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    });
    const unsubClose = subscribeSmsReviewClose(() => setOpen(false));

    const openFromUrl = (url: string) => {
      if (isSmsReviewDeepLink(url)) openSmsReview();
    };

    let removeUrl: { remove: () => Promise<void> } | null = null;
    let removePlugin: { remove: () => Promise<void> } | null = null;

    if (Capacitor.isNativePlatform()) {
      void App.getLaunchUrl()
        .then((result) => {
          if (result?.url) openFromUrl(result.url);
        })
        .catch(() => {});

      void App.addListener('appUrlOpen', (data) => {
        if (data?.url) openFromUrl(data.url);
      }).then((handle) => {
        removeUrl = handle;
      });

      void consumeSmsReviewRequest().then((pending) => {
        if (pending) openSmsReview();
      });

      void addSmsReviewRequestedListener(() => {
        openSmsReview();
      }).then((handle) => {
        removePlugin = handle;
      });
    }

    // Query-param fallback (in-app links / bookmarks)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('review') === '1' || params.get('smsReview') === '1') {
        openSmsReview();
        params.delete('review');
        params.delete('smsReview');
        const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
        window.history.replaceState(window.history.state, '', next);
      }
    }

    return () => {
      unsubOpen();
      unsubClose();
      void removeUrl?.remove();
      void removePlugin?.remove();
    };
  }, []);

  if (!open) return null;

  return (
    <SmsReviewPanel
      onClose={() => {
        setOpen(false);
        closeSmsReview();
        void syncOverlayBubble();
      }}
      onChanged={() => {
        void syncOverlayBubble();
        if (countPendingSms() === 0) {
          setOpen(false);
          closeSmsReview();
        }
      }}
    />
  );
}
