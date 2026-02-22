"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MenuToggleIcon, MobileMenu } from "@/components/ui/header-1-mobile-menu";
export function GlassNav() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

    const links = [
        { label: 'Platform', href: '#platform' },
        { label: 'Solutions', href: '#solutions' },
        { label: 'Security', href: '#security' },
    ];

    return (
        <header
            className={cn(
                'fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-5xl rounded-3xl transition-all duration-500 ease-out border',
                scrolled
                    ? 'bg-slate-950/60 backdrop-blur-3xl border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] py-3'
                    : 'bg-transparent border-transparent py-4'
            )}
        >
            <nav className="mx-auto flex w-full items-center justify-between px-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                        VF
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tight">
                        Vishnu Finance
                    </span>
                </div>

                <div className="hidden items-center gap-8 md:flex">
                    <div className="flex items-center gap-6">
                        {links.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                    <div className="h-4 w-[1px] bg-white/20" />
                    <div className="flex items-center gap-4">
                        <a href="/auth?tab=login" className="text-sm font-medium text-white hover:text-white/80 transition-colors">
                            Log in
                        </a>
                        <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-6 backdrop-blur-md transition-all">
                            Get Started
                        </Button>
                    </div>
                </div>

                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setOpen(!open)}
                    className="md:hidden text-white hover:bg-white/10 rounded-full"
                    aria-label="Toggle menu"
                >
                    <MenuToggleIcon open={open} className="size-5" duration={300} />
                </Button>
            </nav>

            <MobileMenu open={open} className="flex flex-col gap-6 p-6 bg-slate-950/95 backdrop-blur-3xl border border-white/10 rounded-3xl mt-2 mx-4">
                <div className="grid gap-y-4">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="text-lg font-medium text-white/80 hover:text-white"
                        >
                            {link.label}
                        </a>
                    ))}
                </div>
                <div className="h-[1px] w-full bg-white/10" />
                <div className="flex flex-col gap-4">
                    <Button variant="ghost" className="w-full text-white hover:bg-white/10 justify-start text-lg h-12">
                        Log in
                    </Button>
                    <Button className="w-full bg-white text-slate-950 hover:bg-white/90 rounded-2xl h-12 text-lg">
                        Get Started
                    </Button>
                </div>
            </MobileMenu>
        </header>
    );
}
