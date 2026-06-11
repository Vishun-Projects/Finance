'use client';

import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { patterns } from '@/design/patterns';

const fieldControlStyles = cn(
  '[&_input]:h-9 [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:text-right [&_input]:shadow-none [&_input]:focus-visible:ring-0 [&_input]:disabled:opacity-60',
  '[&_textarea]:min-h-[4.5rem] [&_textarea]:resize-none [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:px-0 [&_textarea]:text-left [&_textarea]:shadow-none [&_textarea]:focus-visible:ring-0',
  '[&_button]:h-9 [&_button]:w-full [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-0 [&_button]:shadow-none [&_button]:justify-end [&_button]:text-right [&_button]:font-normal [&_button:hover]:bg-transparent',
  '[&_button_svg]:mr-0 [&_button_svg]:size-3.5 [&_button_svg]:text-muted-foreground',
  'lg:[&_input]:border lg:[&_input]:border-input lg:[&_input]:px-3 lg:[&_input]:text-left lg:[&_input]:shadow-sm',
  'lg:[&_textarea]:border lg:[&_textarea]:border-input lg:[&_textarea]:px-3 lg:[&_textarea]:shadow-sm',
  'lg:[&_button]:h-9 lg:[&_button]:justify-start lg:[&_button]:border lg:[&_button]:border-input lg:[&_button]:bg-transparent lg:[&_button]:px-3 lg:[&_button]:text-left lg:[&_button]:shadow-sm lg:[&_button:hover]:bg-accent'
);

type SettingsFormFieldProps = {
  id: string;
  label: string;
  hint?: string;
  bordered?: boolean;
  stack?: boolean;
  className?: string;
  children: React.ReactNode;
};

export function SettingsFormField({
  id,
  label,
  hint,
  bordered,
  stack,
  className,
  children,
}: SettingsFormFieldProps) {
  return (
    <div className={cn(bordered && 'border-t border-border lg:border-t-0', className)}>
      <div
        className={cn(
          stack
            ? 'space-y-2 px-4 py-3 lg:px-0 lg:py-0'
            : cn(
                patterns.mobileCompactRow,
                'flex items-center gap-3 py-1 lg:block lg:space-y-2 lg:px-0 lg:py-0'
              )
        )}
      >
        <Label
          htmlFor={id}
          className={cn(
            'text-sm font-medium text-foreground',
            !stack &&
              'w-[34%] min-w-[5.25rem] max-w-[7rem] shrink-0 leading-tight lg:w-auto lg:max-w-none'
          )}
        >
          {label}
        </Label>
        <div className={cn('min-w-0 flex-1', fieldControlStyles)}>{children}</div>
      </div>
      {hint ? (
        <p className="px-4 pb-2.5 text-xs text-muted-foreground lg:px-0 lg:pb-0 lg:-mt-1">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
