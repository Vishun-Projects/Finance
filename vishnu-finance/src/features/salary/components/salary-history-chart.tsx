'use client';

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart-container';
import { formatRupees } from '@/lib/utils';

export interface SalaryHistoryChartPoint {
  date: string;
  salary: number;
  fullDate: string;
}

interface SalaryHistoryChartProps {
  data: SalaryHistoryChartPoint[];
  height?: number;
}

export function SalaryHistoryChart({ data, height = 130 }: SalaryHistoryChartProps) {
  return (
    <ChartContainer height={height} className="flex-1">
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.35} />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
        <YAxis hide tickFormatter={(v) => `${(v / 100000).toFixed(0)}L`} />
        <Tooltip
          formatter={(value: number) => formatRupees(value)}
          labelFormatter={(_, items) => (items?.[0]?.payload as { fullDate?: string })?.fullDate ?? ''}
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Line type="monotone" dataKey="salary" stroke="var(--foreground)" strokeWidth={2} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}
