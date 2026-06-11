import { cn } from '@/lib/utils';

export function SettingsSectionHeader({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        'mb-1.5 px-1 text-xs font-medium uppercase tracking-wider text-hint',
        className
      )}
    >
      {children}
    </p>
  );
}
