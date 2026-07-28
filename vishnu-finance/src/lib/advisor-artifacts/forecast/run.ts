import { parseForecastRequest } from './parse';
import { loadForecastInputs } from './load';
import { computeForecastResult } from './compute';
import type { ForecastComputeResult } from './types';

export async function runForecast(args: {
  userId: string;
  query: string;
  now?: Date;
}): Promise<ForecastComputeResult> {
  const request = parseForecastRequest(args.query, args.now ?? new Date());
  const inputs = await loadForecastInputs(args.userId, request);
  return computeForecastResult({
    transactions: inputs.transactions,
    targets: inputs.targets,
    window: request.window,
    windowBuckets: inputs.windowBuckets,
    goalsFundingNeedMonthly: inputs.goalsFundingNeedMonthly,
    now: args.now,
  });
}
