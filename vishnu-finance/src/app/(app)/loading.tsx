import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';

export default function AppLoading() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}

