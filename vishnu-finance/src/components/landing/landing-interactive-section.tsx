"use client";

import { useState } from "react";
import { HeroInteractive } from "@/components/landing/hero-interactive";
import { GlassHero } from "@/components/landing/glass-hero";
import { PreviewDashboard } from "@/components/landing/preview-dashboard";

export default function LandingInteractiveSection() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="w-full flex flex-col items-center gap-12">
            <GlassHero />

            <div className="grid xl:grid-cols-2 gap-12 xl:gap-8 items-start w-full max-w-7xl">
                <HeroInteractive
                    onDataGenerated={setData}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                />
                <div className="w-full relative">
                    <PreviewDashboard data={data} isLoading={isLoading} />
                </div>
            </div>
        </div>
    );
}
