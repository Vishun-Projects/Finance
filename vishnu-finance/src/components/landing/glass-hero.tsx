"use client";

import { Sparkles, ArrowRight } from "lucide-react";

export function GlassHero() {
    return (
        <section className="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center pt-16 pb-12 z-20">
            {/* Subtle animated floating pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium backdrop-blur-md mb-8 hover:bg-blue-500/20 transition-colors cursor-default">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Powered by Gemini 3.1</span>
            </div>

            {/* Premium Typography */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
                Master your money.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                    Without the math.
                </span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl font-light leading-relaxed mb-10">
                Stop tracking pennies and start building wealth. Our AI analyzes your habits, projects your future, and gives you actionable steps to get there.
            </p>

            {/* Decorative blurs behind text */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[50%] bg-blue-500/10 blur-[100px] -z-10 pointer-events-none rounded-full" />
        </section>
    );
}
