'use client';

export default function AnalyticsChartCard({
  id,
  title,
  subtitle,
  children,
  className,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`relative z-0 min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-3 sm:p-4 md:p-5 ${className ?? ''}`}
    >
      <div className="mb-3 space-y-1">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle ? <p className="max-w-[56ch] text-xs leading-5 text-foreground/65">{subtitle}</p> : null}
      </div>
      <div className="relative z-0 min-w-0 overflow-hidden">{children}</div>
    </section>
  );
}
