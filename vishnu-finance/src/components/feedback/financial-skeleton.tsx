import { Skeleton } from "@/components/ui/skeleton";

export default function FinancialSkeleton() {
    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <Skeleton className="h-10 w-48 rounded-lg" /> {/* Title */}
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24 rounded-md" /> {/* Button */}
                    <Skeleton className="h-10 w-24 rounded-md" /> {/* Button */}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-6 border rounded-xl space-y-4">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                ))}
            </div>

            {/* Main Content Area (Chart/Table) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
                <div className="lg:col-span-2 border rounded-xl p-6 space-y-4">
                    <Skeleton className="h-6 w-1/3" />
                    <div className="flex items-end gap-2 h-64 pb-2">
                        {[...Array(12)].map((_, i) => (
                            <Skeleton key={i} className={`w-full rounded-t-md h-[${Math.floor(Math.random() * 80 + 20)}%]`} />
                        ))}
                    </div>
                </div>
                <div className="border rounded-xl p-6 space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-1 flex-1">
                                    <Skeleton className="h-3 w-3/4" />
                                    <Skeleton className="h-2 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
