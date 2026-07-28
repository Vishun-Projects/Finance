export type ChartType = 'area' | 'bar' | 'pie' | 'line';

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface ChartConfig {
  type: ChartType;
  title?: string;
  /** Optional subtitle under the title (e.g. pace derivation) */
  subtitle?: string;
  data: ChartDataPoint[];
  dataKeys: string[];
  colors?: string[];
  xAxisKey?: string;
  height?: number;
  /** Legend series hidden by default (click legend to show) */
  defaultHiddenKeys?: string[];
}
