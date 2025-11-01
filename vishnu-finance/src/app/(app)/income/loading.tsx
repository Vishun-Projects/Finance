import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

export default function IncomeLoading() {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Loading income..." />
    </div>
  );
}

