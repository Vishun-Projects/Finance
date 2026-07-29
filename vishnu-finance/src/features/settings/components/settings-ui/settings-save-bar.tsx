'use client';

import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';

export function SettingsSaveBar({
  onSave,
  loading,
  saved,
  saveLabel = 'Save changes',
  secondaryAction,
}: {
  onSave: () => void;
  loading?: boolean;
  saved?: boolean;
  saveLabel?: string;
  secondaryAction?: React.ReactNode;
}) {
  return (
    // Stay in document flow — sticky bottom was floating mid-viewport over form fields
    // on mobile (especially Capacitor WebView). Main scroll already pads for the tab bar.
    <div className="mt-2 space-y-3 border-t border-border pt-4 lg:mt-0 lg:border-t-0 lg:pt-0">
      {saved && (
        <Callout variant="success" title="Saved" icon={<CheckCircle className="size-5" />}>
          Your changes were saved successfully.
        </Callout>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {secondaryAction}
        <Button
          onClick={onSave}
          pending={loading}
          className="btn-touch w-full min-w-[8rem] lg:w-auto"
        >
          {loading ? 'Saving…' : saveLabel}
        </Button>
      </div>
    </div>
  );
}
