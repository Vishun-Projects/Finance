import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Shield,
  Target,
  Wallet,
} from 'lucide-react';
import { PublicContentLayout } from '@/components/legal/public-content-layout';
import { legalConfig } from '@/lib/legal-config';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: BarChart3,
    title: 'Smart dashboard',
    description: 'Track income, expenses, and net worth in one place.',
  },
  {
    icon: Wallet,
    title: 'Bank imports',
    description: 'Import PDF and CSV statements with automatic categorization.',
  },
  {
    icon: Target,
    title: 'Goals & plans',
    description: 'Deadlines, wishlist, salary structure, and phase money planning.',
  },
  {
    icon: Brain,
    title: 'AI advisor',
    description: 'Insights and education tailored to your financial data.',
  },
  {
    icon: Shield,
    title: 'Secure by design',
    description: 'Encrypted sessions, document vault, and privacy controls.',
  },
];

export function AboutPageContent() {
  return (
    <PublicContentLayout>
      <div className="space-y-10">
        <section>
          <p className="text-sm font-medium text-primary">Operated by {legalConfig.legalName}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Personal finance management,{' '}
            <span className="text-primary">built for India</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">
            {legalConfig.brandName} helps you organize income, expenses, goals, and financial
            decisions in one secure platform — with INR-focused workflows and tools that match how
            you actually manage money.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg" className="w-full gap-2 rounded-lg sm:w-auto">
              <Link href="/auth?tab=register">
                Get started free
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full rounded-lg sm:w-auto">
              <Link href="/auth?tab=login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">What you get</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border/80 bg-card/50 p-5 transition-colors hover:border-border hover:bg-card"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="size-5 text-primary" aria-hidden />
                </div>
                <h3 className="font-medium text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/80 bg-card/50 p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Pricing</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Paid subscription plans are coming soon. Register for free access to core features
            today. For business or custom deployment inquiries, contact{' '}
            <a
              href={`mailto:${legalConfig.supportEmail}`}
              className="font-medium text-primary hover:underline"
            >
              {legalConfig.supportEmail}
            </a>
            . Policy pages are available in the menu and footer.
          </p>
        </section>
      </div>
    </PublicContentLayout>
  );
}
