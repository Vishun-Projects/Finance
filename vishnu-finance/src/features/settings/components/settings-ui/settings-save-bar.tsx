'use client';

import { CheckCircle, Loader2 } from 'lucide-react';
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
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-1 space-y-3 px-3 py-3 glass-mobile-bar glass-text lg:static lg:mx-0 lg:px-0 lg:py-0">
      {saved && (
        <Callout variant="success" title="Saved" icon={<CheckCircle className="size-5" />}>
          Your changes were saved successfully.
        </Callout>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {secondaryAction}
        <Button onClick={onSave} disabled={loading} className="btn-touch w-full min-w-[8rem] lg:w-auto">
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving…
            </>
          ) : (
            saveLabel
          )}
        </Button>
      </div>
    </div>
  );
}
