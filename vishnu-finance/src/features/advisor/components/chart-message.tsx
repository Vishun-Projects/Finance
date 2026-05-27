"use client";

import { useMemo } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ChartType = "area" | "bar" | "pie";

export interface ChartDataPoint {
    name: string;
    [key: string]: string | number;
}

export interface ChartConfig {
    type: ChartType;
    title?: string;
    data: ChartDataPoint[];
    dataKeys: string[];
    colors?: string[];
    xAxisKey?: string;
    height?: number;
}

interface ChartMessageProps {
    config: ChartConfig;
    className?: string;
}

const DEFAULT_COLORS = [
    "var(--chart-credits)",
    "var(--info)",
    "var(--warning)",
    "var(--purple)",
    "var(--orange)",
];

export function ChartMessage({ config, className }: ChartMessageProps) {
    const { type, title, data, dataKeys, colors = DEFAULT_COLORS, xAxisKey = "name", height = 300 } = config;

    const ChartComponent = useMemo(() => {
        const strokeColor = "var(--muted)";
        const gridColor = "var(--border)";
        const tooltipBg = "var(--card)";
        const tooltipBorder = "var(--border)";
        const textColor = "var(--foreground)";

        switch (type) {
            case "area":
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                {dataKeys.map((key, index) => (
                                    <linearGradient key={key} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis
                                dataKey={xAxisKey}
                                stroke={strokeColor}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke={strokeColor}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `₹${value}`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: tooltipBg,
                                    borderColor: tooltipBorder,
                                    color: textColor,
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    fontSize: '12px'
                                }}
                                itemStyle={{ color: textColor }}
                            />
                            <Legend />
                            {dataKeys.map((key, index) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={colors[index % colors.length]}
                                    fillOpacity={1}
                                    fill={`url(#color-${key})`}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                );
            case "bar":
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis
                                dataKey={xAxisKey}
                                stroke={strokeColor}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke={strokeColor}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `₹${value}`}
                            />
                            <Tooltip
                                cursor={{ fill: strokeColor, opacity: 0.1 }}
                                contentStyle={{
                                    backgroundColor: tooltipBg,
                                    borderColor: tooltipBorder,
                                    color: textColor,
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    fontSize: '12px'
                                }}
                                itemStyle={{ color: textColor }}
                            />
                            <Legend />
                            {dataKeys.map((key, index) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={colors[index % colors.length]}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                );
            case "pie":
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey={dataKeys[0]}
                                nameKey={xAxisKey}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="var(--card)" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: tooltipBg,
                                    borderColor: tooltipBorder,
                                    color: textColor,
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    fontSize: '12px'
                                }}
                                itemStyle={{ color: textColor }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                );
            default:
                return null;
        }
    }, [type, data, dataKeys, colors, xAxisKey]);

    return (
        <Card className={cn("card-base w-full overflow-hidden shadow-none", className)}>
            {title && (
                <CardHeader className="border-b border-border pb-2">
                    <CardTitle className="text-[11px] font-medium uppercase tracking-[0.08em] text-hint">
                        {title}
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className="p-4" style={{ height }}>
                {ChartComponent}
            </CardContent>
        </Card>
    );
}
