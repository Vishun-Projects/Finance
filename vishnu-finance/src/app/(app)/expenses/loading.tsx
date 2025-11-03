import { LoadingSpinner } from '@/components/feedback/loading-spinner';

export default function ExpensesLoading() {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <LoadingSpinner size="lg" text="Loading expenses..." />
    </div>
  );
}

