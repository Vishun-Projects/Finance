import { prisma } from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Minus } from 'lucide-react';
import BriefingImage from '@/features/education/components/briefing-image';
import HistoryCalendar from '@/features/education/components/history-calendar';
import { PageHero } from '@/components/ui/hero';
import { SectionLabel } from '@/components/ui/section-label';
import { Chip } from '@/components/ui/chip';
import { Card } from '@/components/ui/card';
import { patterns } from '@/design/patterns';
import { getSentimentChipVariant } from '@/design/tokens';
import { chipVariants } from '@/design/variants';
import { cn } from '@/lib/utils';

const sentimentBorderClass: Record<string, string> = {
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
};

export default async function DailyBriefingHistoryPage() {
  const briefings = await prisma.dailyBriefing.findMany({
    orderBy: {
      date: 'desc',
    },
  });

  const allDates = await prisma.dailyBriefing.findMany({
    select: { date: true },
    orderBy: { date: 'desc' },
  });

  const availableDates = allDates.map((b) => b.date.toISOString());

  return (
    <div className={cn(patterns.pageShell, 'flex h-full flex-col overflow-y-auto text-muted custom-scrollbar')}>
      <div className="sticky top-0 z-30 hidden h-14 shrink-0 items-center border-b border-border bg-background/80 px-8 backdrop-blur lg:flex">
        <Link
          href="/education"
          className="group flex items-center gap-2 text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          <SectionLabel className="mb-0 group-hover:text-foreground">Back to Hub</SectionLabel>
        </Link>
      </div>

      <main className={cn(patterns.pageFluid, 'space-y-6 pt-20 lg:pt-8')}>
        <div className="lg:hidden">
          <Link
            href="/education"
            className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-border bg-surface px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Back to Hub
          </Link>
        </div>

        <PageHero
          tag="Market Archives"
          title="Daily briefings"
          subtitle="A chronological record of AI-generated market intelligence. Track the pulse of the economy day by day."
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="relative ml-2 space-y-6 border-l border-border pl-6 lg:col-span-3 lg:ml-0 lg:space-y-8 lg:pl-10">
            {briefings.length === 0 && (
              <Card className="card-base border-dashed py-20 text-center">
                <Minus className="mx-auto mb-4 size-12 text-hint" />
                <SectionLabel className="mb-0 text-foreground">No archives found</SectionLabel>
              </Card>
            )}

            {briefings.map((briefing) => {
              const dateStr = new Date(briefing.date).toLocaleDateString('en-CA');
              const sentimentVariant = getSentimentChipVariant(briefing.sentiment);
              const borderClass = sentimentBorderClass[sentimentVariant];

              return (
                <div key={briefing.id} className="group relative">
                  <div className="absolute -left-[25px] top-6 z-10 size-3 rounded-full border-2 border-background bg-hint transition-all group-hover:scale-125 group-hover:bg-foreground lg:-left-[41px] lg:top-8 lg:size-4" />

                  <Link href={`/education/daily-news/${dateStr}`} className="block">
                    <Card
                      className={cn(
                        'card-base overflow-hidden border-l-4 transition-colors hover:bg-surface',
                        borderClass
                      )}
                    >
                      <div className="grid h-full grid-cols-1 md:grid-cols-5">
                        <div className="relative h-40 overflow-hidden lg:col-span-2 md:h-auto">
                          <BriefingImage
                            src={briefing.heroImage}
                            title={briefing.title || 'Market Briefing'}
                            sentiment={briefing.sentiment}
                            sentimentColor={chipVariants({ variant: sentimentVariant })}
                            score={briefing.sentimentScore}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-card/40" />

                          <div className="absolute left-3 top-3 lg:hidden">
                            <Chip variant="neutral">
                              {new Date(briefing.date).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </Chip>
                          </div>
                        </div>

                        <div className="relative z-20 -mt-10 flex flex-col justify-center p-5 md:col-span-3 md:mt-0 md:p-6">
                          <div className="mb-2 flex items-center gap-2 md:mb-3">
                            <Chip variant={sentimentVariant}>{briefing.sentiment}</Chip>
                            <span className="hidden text-[11px] font-medium uppercase tracking-wide text-hint md:inline">
                              {new Date(briefing.date).toLocaleDateString(undefined, {
                                weekday: 'long',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          <h3 className="mb-2 line-clamp-2 text-lg font-medium leading-tight text-foreground md:text-xl">
                            {briefing.title}
                          </h3>

                          <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-muted">
                            {(briefing.summary as string[])?.[0] || 'Market analysis and key takeaways...'}
                          </p>

                          <div className="flex items-center text-[11px] font-medium text-foreground transition-all group-hover:gap-2">
                            Read Analysis
                            <ArrowRight className="ml-1 size-3" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:col-span-1 lg:block">
            <div className="sticky top-24">
              <HistoryCalendar availableDates={availableDates} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
