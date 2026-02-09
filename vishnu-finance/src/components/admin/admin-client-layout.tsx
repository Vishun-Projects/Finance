'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { Shield, FileText, Map, Home, Users, ClipboardList, Menu, X, BookOpen, Palette, GraduationCap } from 'lucide-react';

const navItems = [
    { href: '/admin', label: 'Overview', icon: Home },
    { href: '/admin/documents', label: 'Documents', icon: FileText },
    { href: '/admin/super-documents', label: 'Super Documents', icon: BookOpen },
    { href: '/admin/bank-mappings', label: 'Bank Mappings', icon: Map },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/audit', label: 'Audit Logs', icon: ClipboardList },
    { href: '/admin/education', label: 'Manage Hub', icon: GraduationCap },
    { href: '/admin/design', label: 'Design System', icon: Palette },
];

export function AdminClientLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const closeMobileNav = () => setMobileNavOpen(false);

    return (
        <div className="min-h-screen bg-background flex">
            <aside className="hidden lg:flex w-64 flex-col border-r border-border/50 bg-background/60 backdrop-blur-xl fixed inset-y-0 z-50">
                <div className="flex items-center gap-2 px-6 py-5 border-b border-border/50">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                        <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground font-display">Superuser Console</p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Finance Admin Panel</p>
                    </div>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {navItems.map(item => {
                        const active = pathname === item.href;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${active
                                    ? 'bg-primary/10 text-primary shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground/70'}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Mobile flyout navigation */}
            <div
                className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none'
                    }`}
                aria-hidden={!mobileNavOpen}
            >
                <div
                    className={`absolute inset-0 bg-background/80 backdrop-blur-md transition-opacity duration-300 ${mobileNavOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                    onClick={closeMobileNav}
                />
                <nav
                    className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border/50 bg-background/80 backdrop-blur-xl shadow-2xl transition-transform duration-300 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    <div className="flex items-center gap-2 px-5 py-5 border-b border-border/50">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-foreground font-display">Superuser Console</p>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Finance Admin Panel</p>
                        </div>
                        <button
                            type="button"
                            onClick={closeMobileNav}
                            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 bg-muted/20"
                            aria-label="Close navigation"
                        >
                            <X className="w-4 h-4" />
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
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${active
                                        ? 'bg-primary/10 text-primary shadow-sm'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground/70'}`} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </nav>
            </div>

            <div className="flex-1 flex flex-col lg:pl-64 transition-all duration-300">
                <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
                    <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMobileNavOpen(prev => !prev)}
                                className="lg:hidden inline-flex items-center justify-center rounded-xl border border-border/50 bg-background/50 px-2.5 py-2 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 backdrop-blur-sm"
                                aria-label="Toggle navigation"
                                aria-expanded={mobileNavOpen}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-foreground font-display">Admin Portal</h1>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider hidden sm:block">
                                    Manage global documents, bank field mappings, and superuser operations.
                                </p>
                            </div>
                        </div>
                        <Link
                            href="/dashboard"
                            className="glass-card px-4 py-2 rounded-xl text-xs font-bold text-foreground hover:text-primary transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <Home className="w-3.5 h-3.5" />
                            Back to App
                        </Link>
                    </div>
                </header>

                <main className="flex-1 min-h-[calc(100vh-4rem)]">
                    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">{children}</div>
                </main>
            </div>
        </div>
    );
}
