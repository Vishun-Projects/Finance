"use client";

import { useMemo, useRef, useState } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChartConfig } from "@/lib/advisor-chart-types";

export type { ChartConfig, ChartType, ChartDataPoint } from "@/lib/advisor-chart-types";

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

function findLargestSvg(container: HTMLElement): SVGSVGElement | null {
    const svgs = Array.from(container.querySelectorAll("svg"));
    if (svgs.length === 0) return null;
    let best: SVGSVGElement | null = null;
    let bestArea = 0;
    for (const svg of svgs) {
        const box = svg.getBoundingClientRect();
        const area = Math.max(0, box.width) * Math.max(0, box.height);
        if (area > bestArea) {
            bestArea = area;
            best = svg;
        }
    }
    return best;
}

function resolveCssVarsInClone(source: SVGElement, clone: SVGElement) {
    const sourceNodes = [source, ...Array.from(source.querySelectorAll("*"))];
    const cloneNodes = [clone, ...Array.from(clone.querySelectorAll("*"))];
    const len = Math.min(sourceNodes.length, cloneNodes.length);
    for (let i = 0; i < len; i += 1) {
        const src = sourceNodes[i] as Element;
        const dst = cloneNodes[i] as Element;
        const cs = getComputedStyle(src);
        for (const prop of ["fill", "stroke", "color", "stop-color"] as const) {
            let value = cs.getPropertyValue(prop).trim();
            if (!value || value === "none" || value.includes("url(")) continue;
            // Resolve CSS variables to concrete colors for portable SVG/PNG
            if (value.startsWith("var(")) {
                const fallback = cs.getPropertyValue(prop.replace("stroke", "color"));
                const computed =
                    prop === "fill" || prop === "stop-color"
                        ? cs.fill
                        : prop === "stroke"
                          ? cs.stroke
                          : cs.color;
                value = computed || fallback || value;
            }
            if (value && value !== "none") {
                dst.setAttribute(prop === "color" ? "fill" : prop, value);
            }
        }
        const opacity = cs.getPropertyValue("opacity");
        if (opacity && opacity !== "1") dst.setAttribute("opacity", opacity);
    }
}

function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function prepareChartSvgClone(container: HTMLElement): {
    clone: SVGSVGElement;
    width: number;
    height: number;
} {
    const svg = findLargestSvg(container);
    if (!svg) throw new Error("No chart SVG found");

    const box = svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(box.width));
    const height = Math.max(1, Math.round(box.height));

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(width));
    clone.setAttribute("height", String(height));
    if (!clone.getAttribute("viewBox")) {
        clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
    resolveCssVarsInClone(svg, clone);
    return { clone, width, height };
}

async function exportChartSvg(container: HTMLElement, filenameBase: string) {
    const { clone } = prepareChartSvgClone(container);
    const xml = new XMLSerializer().serializeToString(clone);
    downloadBlob(
        `${filenameBase}.svg`,
        new Blob([`<?xml version="1.0" encoding="UTF-8"?>${xml}`], {
            type: "image/svg+xml;charset=utf-8",
        }),
    );
}

async function exportChartPng(container: HTMLElement, filenameBase: string) {
    const { clone, width, height } = prepareChartSvgClone(container);
    const xml = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("Failed to rasterize chart"));
            image.src = url;
        });
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");
        ctx.scale(scale, scale);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const pngBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))),
                "image/png",
            );
        });
        downloadBlob(`${filenameBase}.png`, pngBlob);
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function ChartMessage({ config, className }: ChartMessageProps) {
    const {
        type,
        title,
        subtitle,
        data,
        dataKeys,
        colors = DEFAULT_COLORS,
        xAxisKey = "name",
        height = 280,
        defaultHiddenKeys,
    } = config;

    const chartRef = useRef<HTMLDivElement>(null);
    const [exporting, setExporting] = useState<"png" | "svg" | null>(null);
    const [hidden, setHidden] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        for (const key of defaultHiddenKeys || []) init[key] = true;
        return init;
    });

    const filenameBase = (title || "advisor-chart")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "advisor-chart";

    const toggleSeries = (dataKey: string) => {
        setHidden((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
    };

    const onLegendClick = (payload: unknown) => {
        const dataKey =
            payload &&
            typeof payload === "object" &&
            "dataKey" in payload &&
            (payload as { dataKey?: unknown }).dataKey != null
                ? String((payload as { dataKey: unknown }).dataKey)
                : "";
        if (dataKey) toggleSeries(dataKey);
    };

    const ChartComponent = useMemo(() => {
        const strokeColor = "var(--muted)";
        const gridColor = "var(--border)";
        const tooltipBg = "var(--card)";
        const tooltipBorder = "var(--border)";
        const textColor = "var(--foreground)";

        const axisProps = {
            stroke: strokeColor,
            fontSize: 10,
            tickLine: false as const,
            axisLine: false as const,
        };

        const tooltipProps = {
            contentStyle: {
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                color: textColor,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                fontSize: "12px",
            },
            itemStyle: { color: textColor },
        };

        switch (type) {
            case "line":
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis dataKey={xAxisKey} {...axisProps} />
                            <YAxis
                                {...axisProps}
                                tickFormatter={(value) =>
                                    `₹${Number(value).toLocaleString("en-IN", { notation: "compact", maximumFractionDigits: 1 })}`
                                }
                            />
                            <Tooltip
                                {...tooltipProps}
                                formatter={(value) =>
                                    `₹${Number(value).toLocaleString("en-IN")}`
                                }
                            />
                            <Legend
                                wrapperStyle={{ cursor: "pointer", fontSize: 11 }}
                                onClick={onLegendClick as never}
                            />
                            {dataKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={key.toLowerCase().includes("cashflow") || key.toLowerCase().includes("projected") ? 2.5 : 1.5}
                                    strokeDasharray={
                                        key.toLowerCase().includes("cashflow") ||
                                        key.toLowerCase().includes("projected")
                                            ? undefined
                                            : "4 3"
                                    }
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                    hide={Boolean(hidden[key])}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                );
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
                            <XAxis dataKey={xAxisKey} {...axisProps} />
                            <YAxis {...axisProps} tickFormatter={(value) => `₹${value}`} />
                            <Tooltip {...tooltipProps} />
                            <Legend
                                wrapperStyle={{ cursor: "pointer", fontSize: 11 }}
                                onClick={onLegendClick as never}
                            />
                            {dataKeys.map((key, index) => (
                                <Area
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={colors[index % colors.length]}
                                    fillOpacity={1}
                                    fill={`url(#color-${key})`}
                                    hide={Boolean(hidden[key])}
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
                            <XAxis dataKey={xAxisKey} {...axisProps} />
                            <YAxis {...axisProps} tickFormatter={(value) => `₹${value}`} />
                            <Tooltip cursor={{ fill: strokeColor, opacity: 0.1 }} {...tooltipProps} />
                            <Legend
                                wrapperStyle={{ cursor: "pointer", fontSize: 11 }}
                                onClick={onLegendClick as never}
                            />
                            {dataKeys.map((key, index) => (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    fill={colors[index % colors.length]}
                                    radius={[4, 4, 0, 0]}
                                    hide={Boolean(hidden[key])}
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
                                data={data.filter((row) => {
                                    const name = String(row[xAxisKey] ?? row.name ?? "");
                                    return !hidden[name];
                                })}
                                dataKey={dataKeys[0]}
                                nameKey={xAxisKey}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                            >
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={colors[index % colors.length]}
                                        stroke="var(--card)"
                                    />
                                ))}
                            </Pie>
                            <Tooltip {...tooltipProps} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                wrapperStyle={{ cursor: "pointer", fontSize: 11 }}
                                onClick={onLegendClick as never}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                );
            default:
                return null;
        }
    }, [type, data, dataKeys, colors, xAxisKey, hidden]);

    const runExport = async (kind: "png" | "svg") => {
        if (!chartRef.current) return;
        setExporting(kind);
        try {
            if (kind === "svg") await exportChartSvg(chartRef.current, filenameBase);
            else await exportChartPng(chartRef.current, filenameBase);
        } catch (err) {
            console.error(err);
        } finally {
            setExporting(null);
        }
    };

    const hiddenCount = dataKeys.filter((k) => hidden[k]).length;

    return (
        <div
            className={cn(
                "w-full overflow-hidden rounded-xl border border-border/70 bg-card/70",
                className,
            )}
        >
            <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3.5 py-2">
                <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                        {title || "Chart"}
                    </p>
                    {subtitle ? (
                        <p className="mt-0.5 text-[10px] leading-snug text-muted">{subtitle}</p>
                    ) : null}
                    {hiddenCount > 0 ? (
                        <p className="mt-0.5 text-[10px] text-muted">
                            {hiddenCount} series hidden — click legend to toggle
                        </p>
                    ) : (
                        <p className="mt-0.5 text-[10px] text-muted">Click a legend item to show/hide</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-muted"
                        disabled={exporting != null}
                        onClick={() => void runExport("png")}
                    >
                        {exporting === "png" ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                            <Download className="mr-1 size-3" />
                        )}
                        PNG
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[11px] text-muted"
                        disabled={exporting != null}
                        onClick={() => void runExport("svg")}
                    >
                        {exporting === "svg" ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                            <Download className="mr-1 size-3" />
                        )}
                        SVG
                    </Button>
                </div>
            </div>
            <div ref={chartRef} className="p-3" style={{ height }}>
                {ChartComponent}
            </div>
        </div>
    );
}
