'use client';

const OPEN_EVENT = 'sms-review:open';
const CLOSE_EVENT = 'sms-review:close';

export function openSmsReview(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function closeSmsReview(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CLOSE_EVENT));
}

export function subscribeSmsReviewOpen(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = () => handler();
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}

export function subscribeSmsReviewClose(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = () => handler();
  window.addEventListener(CLOSE_EVENT, listener);
  return () => window.removeEventListener(CLOSE_EVENT, listener);
}

export function isSmsReviewDeepLink(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return (
      url.host === 'sms-review' ||
      url.pathname.includes('sms-review') ||
      urlString.includes('://sms-review')
    );
  } catch {
    return urlString.includes('sms-review');
  }
}
