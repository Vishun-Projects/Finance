import { RouteLoadingState } from '@/components/feedback/route-fallbacks';

export default function DeadlinesLoading() {
  return (
    <RouteLoadingState
      title="Loading deadlines"
      description="Syncing your reminders and due dates…"
      className="min-h-[50vh]"
    />
  );
}
