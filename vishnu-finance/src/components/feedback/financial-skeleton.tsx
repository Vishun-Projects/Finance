import { Skeleton } from "@/components/ui/skeleton";

export default function FinancialSkeleton() {
    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <Skeleton className="h-8 w-64 rounded-none" /> {/* Title */}
                <div className="flex gap-2">
                    <Skeleton className="h-8 w-24 rounded-none" /> {/* Button */}
                    <Skeleton className="h-8 w-24 rounded-none" /> {/* Button */}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 border border-border rounded-none space-y-4 bg-card/50">
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-24 rounded-none" />
                            <Skeleton className="h-4 w-4 rounded-none" />
                        </div>
                        <Skeleton className="h-10 w-40 rounded-none" />
                        <Skeleton className="h-1 w-full rounded-none" />
                    </div>
                ))}
            </div>

            {/* Main Content Area (Chart/Table) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                <div className="lg:col-span-2 border border-border rounded-none p-6 space-y-8 bg-card/50">
                    <Skeleton className="h-4 w-1/3 rounded-none" />
                    <div className="flex items-end gap-3 h-64 pb-2">
                        {[...Array(12)].map((_, i) => (
                            <Skeleton key={i} className={`w-full rounded-none h-[${Math.floor(Math.random() * 60 + 30)}%]`} />
                        ))}
                    </div>
                </div>
                <div className="border border-border rounded-none p-6 space-y-6 bg-card/50">
                    <Skeleton className="h-4 w-1/2 rounded-none" />
                    <div className="space-y-6">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-10 w-10 rounded-none" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-3 w-3/4 rounded-none" />
                                    <Skeleton className="h-2 w-1/2 rounded-none" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
