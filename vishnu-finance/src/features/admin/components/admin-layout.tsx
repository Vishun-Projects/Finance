'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Shield, FileText, Map, Home, Users, ClipboardList, Menu, X, BookOpen, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navLinkVariants } from '@/design/variants';
import { patterns } from '@/design/patterns';
import { Button } from '@/components/ui/button';

const navItems = [
    { href: '/admin', label: 'Overview', icon: Home },
    { href: '/admin/documents', label: 'Documents', icon: FileText },
    { href: '/admin/super-documents', label: 'Super Documents', icon: BookOpen },
    { href: '/admin/bank-mappings', label: 'Bank Mappings', icon: Map },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/audit', label: 'Audit Logs', icon: ClipboardList },
    { href: '/admin/education', label: 'Manage Hub', icon: GraduationCap },
];

export function AdminClientLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const closeMobileNav = () => setMobileNavOpen(false);

    const isActive = (href: string) =>
        href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

    const renderNavLinks = (onNavigate?: () => void) =>
        navItems.map(item => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
                <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={navLinkVariants({ active })}
                >
                    <Icon className={cn('size-4', active ? 'text-foreground' : 'text-hint')} />
                    {item.label}
                </Link>
            );
        });

    return (
        <div className="flex min-h-screen bg-background">
            <aside className={cn(patterns.sidebar, 'fixed inset-y-0 z-50 hidden lg:flex')}>
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-md border border-border bg-surface">
                        <Shield className="size-4 text-foreground" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-foreground">Admin Console</p>
                        <p className="text-xs text-hint">Finance platform</p>
                    </div>
                </div>
                <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto custom-scrollbar">
                    {renderNavLinks()}
                </nav>
            </aside>

            <div
                className={cn(
                    'fixed inset-0 z-50 transition-opacity duration-300 lg:hidden',
                    mobileNavOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                )}
                aria-hidden={!mobileNavOpen}
            >
                <div className="absolute inset-0 bg-background/80" onClick={closeMobileNav} />
                <nav
                    className={cn(
                        patterns.sidebar,
                        'absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-lg transition-transform duration-300',
                        mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                >
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-md border border-border bg-surface">
                            <Shield className="size-4 text-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">Admin Console</p>
                            <p className="text-xs text-hint">Finance platform</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeMobileNav}
                            className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-foreground"
                            aria-label="Close navigation"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                    <div className="flex flex-col gap-0.5">{renderNavLinks(closeMobileNav)}</div>
                </nav>
            </div>

            <div className="flex flex-1 flex-col lg:pl-[var(--sidebar-width)]">
                <header className="sticky top-0 z-40 border-b border-border bg-background">
                    <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen(prev => !prev)}
                                className="inline-flex items-center justify-center rounded-md border border-border p-2 text-foreground hover:bg-surface lg:hidden"
                                aria-label="Toggle navigation"
                                aria-expanded={mobileNavOpen}
                            >
                                <Menu className="size-5" />
                            </button>
                            <div>
                                <h1 className="text-lg font-medium text-foreground">Admin Portal</h1>
                                <p className="hidden text-xs text-hint sm:block">
                                    Manage documents, bank mappings, and platform operations.
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/dashboard" className="gap-2">
                                <Home className="size-3.5" />
                                Back to App
                            </Link>
                        </Button>
                    </div>
                </header>

                <main className={cn(patterns.mainArea, 'min-h-[calc(100vh-4rem)]')}>
                    <div className={cn(patterns.pageShell, 'animate-in fade-in slide-in-from-bottom-4 duration-500')}>
                        <div className={patterns.pageFluid}>{children}</div>
                    </div>
                </main>
            </div>
        </div>
    );
}
