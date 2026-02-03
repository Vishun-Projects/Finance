import { Skeleton } from "@/components/ui/skeleton";

export default function PageSkeleton() {
    return (
        <div className="w-full h-full p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/3 rounded-lg" />
                <Skeleton className="h-4 w-2/3 max-w-md rounded-md opacity-60" />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Card */}
                <div className="md:col-span-2 space-y-6">
                    <Skeleton className="w-full h-64 rounded-xl" />
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>

                {/* Sidebar / Secondary */}
                <div className="space-y-6">
                    <Skeleton className="w-full h-32 rounded-xl" />
                    <Skeleton className="w-full h-32 rounded-xl" />
                    <Skeleton className="w-full h-32 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
