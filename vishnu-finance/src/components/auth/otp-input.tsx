"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (value: string) => void;
    className?: string;
    disabled?: boolean;
}

export function OTPInput({
    length = 6,
    value,
    onChange,
    className,
    disabled = false,
}: OTPInputProps) {
    const inputs = React.useRef<(HTMLInputElement | null)[]>([]);

    const focusInput = (index: number) => {
        const input = inputs.current[index];
        if (input) {
            input.focus();
        }
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        index: number
    ) => {
        const val = e.target.value;
        if (isNaN(Number(val))) return;

        const newValue = value.split("");
        newValue[index] = val.substring(val.length - 1);
        const newString = newValue.join("");
        onChange(newString);

        if (val && index < length - 1) {
            focusInput(index + 1);
        }
    };

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number
    ) => {
        if (e.key === "Backspace") {
            if (!value[index] && index > 0) {
                focusInput(index - 1);
                const newValue = value.split("");
                newValue[index - 1] = "";
                onChange(newValue.join(""));
            } else {
                const newValue = value.split("");
                newValue[index] = "";
                onChange(newValue.join(""));
            }
        } else if (e.key === "ArrowLeft" && index > 0) {
            focusInput(index - 1);
        } else if (e.key === "ArrowRight" && index < length - 1) {
            focusInput(index + 1);
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData("text/plain").slice(0, length);
        if (!/^\d+$/.test(pastedData)) return;

        onChange(pastedData);
        if (pastedData.length === length) {
            inputs.current[length - 1]?.focus();
        } else {
            inputs.current[pastedData.length]?.focus();
        }
    };

    return (
        <div className={cn("flex gap-2", className)}>
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        inputs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value[i] || ""}
                    onChange={(e) => handleChange(e, i)}
                    onKeyDown={(e) => handleKeyDown(e, i)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={cn(
                        "h-12 w-12 text-center text-xl font-semibold border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
                        disabled && "opacity-50 cursor-not-allowed bg-muted"
                    )}
                    autoComplete="one-time-code"
                />
            ))}
        </div>
    );
}
