import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'vishnu-finance' });

/** Fire-and-forget when Inngest env is configured; no-op otherwise. */
export async function emitInngestEvent<T extends Record<string, unknown>>(
  name: string,
  data: T,
): Promise<void> {
  if (!process.env.INNGEST_EVENT_KEY && !process.env.INNGEST_SIGNING_KEY) {
    return;
  }
  try {
    await inngest.send({ name, data });
  } catch (error) {
    console.warn('[inngest] event send failed', error);
  }
}
