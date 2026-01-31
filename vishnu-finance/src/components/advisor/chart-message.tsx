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
    dataKeys: string[]; // Keys to plot (e.g., ["value", "projected"])
    colors?: string[];
    xAxisKey?: string; // Key for X-axis labels, defaults to "name"
    height?: number;
}

interface ChartMessageProps {
    config: ChartConfig;
    className?: string;
}

const DEFAULT_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))"
];

export function ChartMessage({ config, className }: ChartMessageProps) {
    const { type, title, data, dataKeys, colors = DEFAULT_COLORS, xAxisKey = "name", height = 300 } = config;

    const ChartComponent = useMemo(() => {
        const strokeColor = "hsl(var(--muted-foreground) / 0.5)";
        const gridColor = "hsl(var(--border))";
        const tooltipBg = "hsl(var(--card))";
        const tooltipBorder = "hsl(var(--border))";
        const textColor = "hsl(var(--foreground))";

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
                                    borderRadius: '12px',
                                    border: '1px solid hsl(var(--border))',
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
                                    borderRadius: '12px',
                                    border: '1px solid hsl(var(--border))',
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
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="hsl(var(--card))" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: tooltipBg,
                                    borderColor: tooltipBorder,
                                    color: textColor,
                                    borderRadius: '12px',
                                    border: '1px solid hsl(var(--border))',
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
        <Card className={cn("w-full bg-card border border-border shadow-xl overflow-hidden", className)}>
            {title && (
                <CardHeader className="pb-2 border-b border-border">
                    <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
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
