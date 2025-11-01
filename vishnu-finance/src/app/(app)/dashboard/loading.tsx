import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

export default function DashboardLoading() {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Loading dashboard..." />
    </div>
  );
}

