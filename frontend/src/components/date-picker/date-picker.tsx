"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./date-picker.css";
import { CalendarSVG } from "@/style/calendar-svg";
import { ArrowDownSVG } from "@/style/arrow-down-svg";

export default function DateRangePicker({
    variant = "light",
}: {
    variant?: "light" | "dark";
}) {
    const router = useRouter();
    const [startDate, setStartDate] = useState<Date | null>(
        new Date("2024-09-19")
    );
    const [endDate, setEndDate] = useState<Date | null>(new Date("2025-09-19"));
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState("Last year");
    const containerRef = useRef<HTMLDivElement | null>(null);

    const predefinedRanges = [
        { label: "Last 3 months", days: 90 },
        { label: "Last 6 months", days: 180 },
        { label: "Last year", days: 365 },
        { label: "All time", days: 0 },
    ];

    const LABEL_TO_INTERVAL: Record<string, string> = {
        "Last 3 months": "last_90_days",
        "Last 6 months": "last_180_days",
        "Last year": "last_365_days",
        "All time": "all_time",
    };
    const INTERVAL_TO_LABEL: Record<string, string> = Object.fromEntries(
        Object.entries(LABEL_TO_INTERVAL).map(([label, interval]) => [
            interval,
            label,
        ])
    );

    const formatForCookie = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const setCookie = (name: string, value: string) => {
        // 90 days expiry by default; server only needs current values
        const maxAge = 60 * 60 * 24 * 90;
        document.cookie = `${name}=${encodeURIComponent(
            value
        )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    };

    const getCookie = (name: string) => {
        if (typeof document === "undefined") return undefined;
        const match = document.cookie
            .split(";")
            .map((c) => c.trim())
            .find((c) => c.startsWith(`${name}=`));
        return match ? decodeURIComponent(match.split("=")[1]) : undefined;
    };

    const handleRangeSelect = (range: (typeof predefinedRanges)[0]) => {
        setSelectedRange(range.label);
        if (range.days === 0) {
            setStartDate(new Date("2020-01-01"));
            setEndDate(new Date());
            // Set cookies for full range (all time) and specific interval
            const bottom = formatForCookie(new Date("2020-01-01"));
            const top = formatForCookie(new Date());
            setCookie("selectedDateBottom", bottom);
            setCookie("selectedDateTop", top);
            const interval = LABEL_TO_INTERVAL[range.label];
            if (interval) setCookie("specificRange", interval);
        } else {
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() - range.days);
            setStartDate(start);
            setEndDate(today);
            // Set cookies for computed range and specific interval
            const bottom = formatForCookie(start);
            const top = formatForCookie(today);
            setCookie("selectedDateBottom", bottom);
            setCookie("selectedDateTop", top);
            const interval = LABEL_TO_INTERVAL[range.label];
            if (interval) setCookie("specificRange", interval);
        }
        setIsOpen(false);
        // Refresh server components to use new cookies immediately
        router.refresh();
    };

    const formatDate = (date: Date | null) => {
        if (!date) return "";
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    useEffect(() => {
        const bottom = getCookie("selectedDateBottom");
        const top = getCookie("selectedDateTop");
        const interval = getCookie("specificRange");

        if (bottom) {
            const d = new Date(bottom);
            if (!isNaN(d.getTime())) setStartDate(d);
        }
        if (top) {
            const d = new Date(top);
            if (!isNaN(d.getTime())) setEndDate(d);
        }

        const mapped = interval ? INTERVAL_TO_LABEL[interval] : undefined;
        if (mapped) {
            setSelectedRange(mapped);
        } else if (bottom || top) {
            setSelectedRange("Custom");
        }
    }, []);

    const isDark = variant === "dark";
    const containerClasses = isDark
        ? "border-white/60 bg-white/10 backdrop-blur-lg text-white"
        : "border-[#bebee7] bg-[#f5f5ff] text-[#7c70c3]";
    const iconStroke = isDark ? "#ffffff" : "#7c70c3";

    return (
        <div
            ref={containerRef}
            className={`overflow-visible relative z-20 rounded-xl border-1 ${containerClasses} ${
                isOpen ? "shadow-xl md:top-[162px] lg:dp-trigger-grow" : ""
            } ${
                variant === "light" ? "h-8 w-full sm:h-full" : "h-full w-full"
            }`}
        >
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className={`flex h-full justify-between cursor-[var(--pointer-hand-dark)] items-center text-xl gap-2 p-1 rounded-2xl ${
                    variant === "light" ? "w-8 sm:w-full" : "w-full"
                }`}
            >
                <span className="flex items-center gap-1 p-0.5 sm:p-2">
                    <CalendarSVG stroke={iconStroke} />
                </span>
                {isOpen && (
                    <span className="hidden lg:block whitespace-nowrap text-[16px] font-medium opacity-90">
                        {selectedRange}
                    </span>
                )}
                <span className="hidden lg:flex gap-0.5 -mt-0.5 w-fit overflow-hidden">
                    <span className="inline text-ellipsis">
                        {formatDate(startDate)}
                    </span>
                    <span>-</span>
                    <span className="inline text-ellipsis">
                        {formatDate(endDate)}
                    </span>
                </span>
                <div
                    className={`hidden lg:block -mb-1.5 mr-1 transition-transform ${
                        isOpen ? "rotate-180" : "rotate-0"
                    }`}
                >
                    <ArrowDownSVG stroke={iconStroke} />
                </div>
            </button>

            {isOpen && (
                <>
                    {/* dimmed backdrop on mobile */}
                    <div
                        className="fixed inset-0 lg:hidden z-[180] bg-[#EBEBFF]/70 dp-backdrop-in"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className="fixed lg:static right-5.25 top[98px] lg:top-auto z-[200] w[320px] max-w[92vw] lg:w/full lg:max-w-none rounded-2xl lg:rounded-none border-1 border-[#bebee7] lg:border-0 bg-[#f5f5ff] pt-3 px-3 pb-3 lg:pt-2 lg:px-3 lg:pb-3 ml-auto dp-animate-in"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                            <div className="w-full lg:w-44 shrink-0">
                                <div className="text-sm mb-2 font-medium opacity-80 !text-[#7c70c3]">
                                    {selectedRange}
                                </div>
                                <ul className="flex flex-col gap-1">
                                    {predefinedRanges.map((range) => (
                                        <li key={range.label}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRangeSelect(range)
                                                }
                                                className={`w-full text-left !text-[#7c70c3] rounded-xl px-3 py-2 transition-colors ${
                                                    selectedRange ===
                                                    range.label
                                                        ? "bg-[#e8e8ff]"
                                                        : "hover:bg-[#ececff]"
                                                }`}
                                            >
                                                {range.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex-1 min-w-0">
                                <DatePicker
                                    selectsRange
                                    startDate={startDate || undefined}
                                    endDate={endDate || undefined}
                                    onChange={(
                                        dates: [Date | null, Date | null]
                                    ) => {
                                        const [start, end] = dates;
                                        setStartDate(start);
                                        setEndDate(end);
                                        if (start && end) {
                                            setCookie(
                                                "selectedDateBottom",
                                                formatForCookie(start)
                                            );
                                            setCookie(
                                                "selectedDateTop",
                                                formatForCookie(end)
                                            );
                                            router.refresh();
                                        }
                                    }}
                                    inline
                                    showMonthDropdown
                                    showYearDropdown
                                    dropdownMode="select"
                                />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
