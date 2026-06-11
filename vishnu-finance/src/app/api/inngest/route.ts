import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';

const processImages = inngest.createFunction(
  { id: 'process-images', triggers: [{ event: 'vishnu/images.process' }] },
  async ({ event }) => {
    return { processed: event.data?.count ?? 0, status: 'queued' };
  },
);

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processImages],
});
