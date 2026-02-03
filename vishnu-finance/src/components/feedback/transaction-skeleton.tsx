import { Skeleton } from "@/components/ui/skeleton";

export default function TransactionSkeleton() {
    return (
        <div className="w-full space-y-6 animate-in fade-in duration-500">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center py-4">
                <Skeleton className="h-10 w-full sm:w-64 rounded-lg" />
                <div className="flex gap-2 w-full sm:w-auto">
                    <Skeleton className="h-10 w-24 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
            </div>

            {/* Table Header */}
            <div className="border rounded-xl overflow-hidden">
                <div className="bg-muted/40 p-4 grid grid-cols-12 gap-4">
                    <Skeleton className="col-span-1 h-4 w-4" />
                    <Skeleton className="col-span-3 h-4 w-20" />
                    <Skeleton className="col-span-2 h-4 w-20" />
                    <Skeleton className="col-span-2 h-4 w-20" />
                    <Skeleton className="col-span-2 h-4 w-20" />
                    <Skeleton className="col-span-2 h-4 w-20" />
                </div>

                {/* Table Rows */}
                <div className="divide-y">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="p-4 grid grid-cols-12 gap-4 items-center">
                            <Skeleton className="col-span-1 h-4 w-4 rounded" />

                            {/* Description + Icon */}
                            <div className="col-span-3 flex gap-3 items-center">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-1">
                                    <Skeleton className="h-3 w-32" />
                                    <Skeleton className="h-2 w-16" />
                                </div>
                            </div>

                            <Skeleton className="col-span-2 h-4 w-16" /> {/* Date */}
                            <Skeleton className="col-span-2 h-6 w-24 rounded-full" /> {/* Category */}
                            <Skeleton className="col-span-2 h-4 w-20" /> {/* Amount */}
                            <Skeleton className="col-span-2 h-4 w-4 ml-auto" /> {/* Action */}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
