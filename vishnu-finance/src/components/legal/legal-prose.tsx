import { cn } from '@/lib/utils';

type LegalProseProps = {
  children: React.ReactNode;
  className?: string;
};

/** Styled wrapper for policy page content (no typography plugin required). */
export function LegalProse({ children, className }: LegalProseProps) {
  return (
    <div
      className={cn(
        'legal-prose mx-auto max-w-prose space-y-6 text-[15px] leading-relaxed text-muted-foreground',
        '[&_h2]:scroll-mt-24 [&_h2]:border-b [&_h2]:border-border/60 [&_h2]:pb-3 [&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground',
        '[&_h2:first-child]:pt-0',
        '[&_p]:leading-relaxed',
        '[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5',
        '[&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5',
        '[&_li]:pl-1',
        '[&_strong]:font-medium [&_strong]:text-foreground',
        '[&_a]:font-medium [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline',
        '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}
