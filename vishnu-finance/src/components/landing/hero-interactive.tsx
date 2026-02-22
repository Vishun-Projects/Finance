"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, ArrowRight, Wallet, Activity } from 'lucide-react';

interface HeroInteractiveProps {
    onDataGenerated: (data: any) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
}

export function HeroInteractive({ onDataGenerated, isLoading, setIsLoading }: HeroInteractiveProps) {
    const [profile, setProfile] = useState('');
    const [income, setIncome] = useState('');
    const [goal, setGoal] = useState('');
    const [error, setError] = useState('');

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !income || !goal) {
            setError('Please fill in all fields to generate your preview!');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/landing-preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ profile, income, goal }),
            });

            if (!res.ok) {
                throw new Error('Failed to generate preview');
            }

            const data = await res.json();
            onDataGenerated(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto xl:mx-0 flex flex-col justify-center gap-8 xl:pr-12">

            <form onSubmit={handleGenerate} className="bg-slate-900/40 backdrop-blur-3xl p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all duration-500 space-y-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-white/80 ml-1 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-white/60" />
                            I am a...
                        </label>
                        <Input
                            placeholder="e.g. Graphic Designer, Student, Doctor"
                            value={profile}
                            onChange={(e) => setProfile(e.target.value)}
                            className="h-12 border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-white/20 placeholder:text-white/30 transition-colors"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-white/80 ml-1 flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-white/60" />
                            Making roughly...
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50">₹</span>
                            <Input
                                type="number"
                                placeholder="50000"
                                value={income}
                                onChange={(e) => setIncome(e.target.value)}
                                className="h-12 pl-8 border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-white/20 placeholder:text-white/30 transition-colors"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-white/80 ml-1 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-white/60" />
                            And I want to save for...
                        </label>
                        <Input
                            placeholder="e.g. A new laptop, Emergency fund, Thailand trip"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            className="h-12 border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-white/20 placeholder:text-white/30 transition-colors"
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="pt-4">
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 text-base font-semibold rounded-2xl group/btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all duration-300 shadow-lg shadow-blue-500/25"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating Magic...
                                </div>
                            ) : (
                                <span className="flex items-center gap-2">
                                    Generate My Preview
                                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
