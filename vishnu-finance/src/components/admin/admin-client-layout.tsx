'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Shield, FileText, Map, Home, Users, ClipboardList, Menu, X, BookOpen, Palette } from 'lucide-react';

const navItems = [
    { href: '/admin', label: 'Overview', icon: Home },
    { href: '/admin/documents', label: 'Documents', icon: FileText },
    { href: '/admin/super-documents', label: 'Super Documents', icon: BookOpen },
    { href: '/admin/bank-mappings', label: 'Bank Mappings', icon: Map },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/audit', label: 'Audit Logs', icon: ClipboardList },
    { href: '/admin/design', label: 'Design System', icon: Palette },
];

export function AdminClientLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const closeMobileNav = () => setMobileNavOpen(false);

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="hidden lg:flex w-64 flex-col border-r bg-muted/40">
                <div className="flex items-center gap-2 px-6 py-5 border-b">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                        <p className="text-sm font-semibold text-foreground">Superuser Console</p>
                        <p className="text-xs text-muted-foreground">Finance Admin Panel</p>
                    </div>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1">
                    {navItems.map(item => {
                        const active = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${active
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Mobile flyout navigation */}
            <div
                className={`lg:hidden fixed inset-0 z-40 transition ${mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none'
                    }`}
                aria-hidden={!mobileNavOpen}
            >
                <div
                    className={`absolute inset-0 bg-background/70 backdrop-blur-sm transition-opacity ${mobileNavOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                    onClick={closeMobileNav}
                />
                <nav
                    className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r bg-background shadow-lg transition-transform ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    <div className="flex items-center gap-2 px-5 py-5 border-b">
                        <Shield className="w-5 h-5 text-primary" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">Superuser Console</p>
                            <p className="text-xs text-muted-foreground">Finance Admin Panel</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeMobileNav}
                            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            aria-label="Close navigation"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="px-3 py-4 space-y-1">
                        {navItems.map(item => {
                            const active = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={closeMobileNav}
                                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${active
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>

            <div className="flex-1 flex flex-col">
                <header className="border-b bg-card/70 backdrop-blur-sm">
                    <div className="w-full px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen(prev => !prev)}
                                className="lg:hidden inline-flex items-center justify-center rounded-md border border-border/60 bg-card px-2.5 py-2 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                                aria-label="Toggle navigation"
                                aria-expanded={mobileNavOpen}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">Admin Portal</h1>
                                <p className="text-xs text-muted-foreground">
                                    Manage global documents, bank field mappings, and superuser operations.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard"
                            className="text-xs text-muted-foreground hover:text-primary transition"
                        >
                            Back to App
                        </Link>
                    </div>
                </header>

                <main className="flex-1">
                    <div className="w-full px-4 sm:px-6 lg:px-10 py-6">{children}</div>
                </main>
            </div>
        </div>
    );
}
