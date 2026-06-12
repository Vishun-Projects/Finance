'use client';

import { Bar, BarChart, Cell, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer } from '@/components/ui/chart-container';

export interface SidebarBarPoint {
  name: string;
  value: number;
}

interface TransactionAnalyticsChartProps {
  data: SidebarBarPoint[];
  formatAmount: (value: number) => string;
  colors: readonly string[];
}

export function TransactionAnalyticsChart({ data, formatAmount, colors }: TransactionAnalyticsChartProps) {
  return (
    <ChartContainer height={88}>
      <BarChart data={data} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fill: 'var(--muted)', fontSize: 8 }}
          tickFormatter={(val) => (val.length > 4 ? `${val.slice(0, 4)}…` : val)}
        />
        <YAxis hide />
        <RechartsTooltip
          formatter={(value: number) => [formatAmount(value), 'Spent']}
          contentStyle={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '11px',
          }}
        />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} barSize={12}>
          {data.map((entry, index) => (
            <Cell key={`cell-${entry.name}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
