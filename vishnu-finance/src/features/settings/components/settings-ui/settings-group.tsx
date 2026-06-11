import { cn } from '@/lib/utils';

export function SettingsGroup({
  children,
  className,
  destructive,
}: {
  children: React.ReactNode;
  className?: string;
  destructive?: boolean;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-card',
        destructive && 'border-[var(--danger-border)] bg-[var(--danger-bg)]/30',
        className
      )}
    >
      {children}
    </div>
  );
}
