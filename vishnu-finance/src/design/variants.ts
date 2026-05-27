import { cva } from 'class-variance-authority';

export const chipVariants = cva(
  'inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium font-mono border',
  {
    variants: {
      variant: {
        success: 'bg-[var(--chip-success-bg)] text-[var(--chip-success-fg)] border-[var(--chip-success-border)]',
        warning: 'bg-[var(--chip-warning-bg)] text-[var(--chip-warning-fg)] border-[var(--chip-warning-border)]',
        danger: 'bg-[var(--chip-danger-bg)] text-[var(--chip-danger-fg)] border-[var(--chip-danger-border)]',
        info: 'bg-[var(--chip-info-bg)] text-[var(--chip-info-fg)] border-[var(--chip-info-border)]',
        purple: 'bg-[var(--chip-purple-bg)] text-[var(--chip-purple-fg)] border-[var(--chip-purple-border)]',
        orange: 'bg-[var(--chip-orange-bg)] text-[var(--chip-orange-fg)] border-[var(--chip-orange-border)]',
        neutral: 'bg-[var(--chip-neutral-bg)] text-[var(--chip-neutral-fg)] border-[var(--chip-neutral-border)]',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
);

export const calloutVariants = cva('rounded-[var(--radius-md)] border px-5 py-4', {
  variants: {
    variant: {
      success:
        'border-[var(--callout-success-border)] bg-[var(--callout-success-bg)] [&_.callout-title]:text-[var(--callout-success-title)] [&_.callout-body]:text-[var(--callout-success-fg)]',
      warning:
        'border-[var(--callout-warning-border)] bg-[var(--callout-warning-bg)] [&_.callout-title]:text-[var(--callout-warning-title)] [&_.callout-body]:text-[var(--callout-warning-fg)]',
      danger:
        'border-[var(--callout-danger-border)] bg-[var(--callout-danger-bg)] [&_.callout-title]:text-[var(--callout-danger-title)] [&_.callout-body]:text-[var(--callout-danger-fg)]',
      info: 'border-[var(--callout-info-border)] bg-[var(--callout-info-bg)] [&_.callout-title]:text-[var(--callout-info-title)] [&_.callout-body]:text-[var(--callout-info-fg)]',
      orange:
        'border-[var(--callout-orange-border)] bg-[var(--callout-orange-bg)] [&_.callout-title]:text-[var(--callout-orange-title)] [&_.callout-body]:text-[var(--callout-orange-fg)]',
      purple:
        'border-[var(--callout-purple-border)] bg-[var(--callout-purple-bg)] [&_.callout-title]:text-[var(--callout-purple-title)] [&_.callout-body]:text-[var(--callout-purple-fg)]',
      neutral:
        'border-[var(--callout-neutral-border)] bg-[var(--callout-neutral-bg)] [&_.callout-title]:text-[var(--callout-neutral-title)] [&_.callout-body]:text-[var(--callout-neutral-fg)]',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export const navPillVariants = cva(
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-xs font-medium transition-all duration-150',
  {
    variants: {
      active: {
        true: 'border-accent bg-accent text-[var(--primary-foreground)]',
        false:
          'border-border bg-transparent text-muted hover:bg-surface hover:text-foreground',
      },
    },
    defaultVariants: { active: false },
  }
);

export const navLinkVariants = cva(
  'flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors',
  {
    variants: {
      active: {
        true: 'bg-surface text-foreground',
        false: 'text-muted hover:bg-surface/70 hover:text-foreground',
      },
    },
    defaultVariants: { active: false },
  }
);

export const cardSurfaceVariants = cva(
  'rounded-[var(--radius-md)] border border-border bg-card text-card-foreground',
  {
    variants: {
      tone: {
        default: 'bg-card',
        muted: 'bg-surface',
        inset: 'bg-surface border-border',
      },
      padding: {
        default: 'px-5 py-4',
        sm: 'px-4 py-3',
        none: '',
      },
    },
    defaultVariants: { tone: 'default', padding: 'default' },
  }
);

export const sectionLabelVariants = cva(
  'mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-hint'
);

export const listVariants = cva(
  'overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card'
);

export const listRowVariants = cva(
  'flex items-center justify-between border-b border-border px-5 py-2.5 last:border-b-0'
);
