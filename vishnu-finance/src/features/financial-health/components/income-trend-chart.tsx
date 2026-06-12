'use client';

import { Area, AreaChart, Tooltip, XAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart-container';
import { formatRupees } from '@/lib/utils';

export interface IncomeTrendChartPoint {
  month: string;
  amount: number;
  formattedAmount: string;
}

interface IncomeTrendChartProps {
  data: IncomeTrendChartPoint[];
  height?: number;
}

export function IncomeTrendChart({ data, height = 250 }: IncomeTrendChartProps) {
  return (
    <ChartContainer height={height}>
      <AreaChart data={data}>
        <Tooltip
          formatter={(value: number) => formatRupees(value)}
          labelFormatter={(label) => `Month ${label}`}
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
        />
        <XAxis dataKey="month" hide />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--foreground)"
          strokeWidth={2}
          fillOpacity={0.12}
          fill="var(--foreground)"
          animationDuration={1000}
        />
      </AreaChart>
    </ChartContainer>
  );
}
