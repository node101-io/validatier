"use client";

import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./date-picker.css";
import { CalendarSVG } from "@/style/calendar-svg";
import { ArrowDownSVG } from "@/style/arrow-down-svg";

export default function DateRangePicker() {
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

    const handleRangeSelect = (range: (typeof predefinedRanges)[0]) => {
        setSelectedRange(range.label);
        if (range.days === 0) {
            setStartDate(new Date("2020-01-01"));
            setEndDate(new Date());
        } else {
            const today = new Date();
            const start = new Date(today);
            start.setDate(today.getDate() - range.days);
            setStartDate(start);
            setEndDate(today);
        }
        setIsOpen(false);
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

    return (
        <div
            ref={containerRef}
            className={`w-full h-full overflow-visible relative z-20 rounded-2xl border-1 border-[#bebee7] bg-[#f5f5ff] text-[#7c70c3] ${
                isOpen ? "shadow-xl md:top-[183px]" : ""
            }`}
        >
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="flex h-full w-full justify-between cursor-[var(--pointer-hand-dark)] items-center text-xl gap-2 p-1 rounded-2xl"
            >
                <span className="flex items-center gap-1 p-2">
                    <CalendarSVG stroke="#7c70c3" />
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
                    <ArrowDownSVG stroke="#7c70c3" />
                </div>
            </button>

            {isOpen && (
                <>
                    {/* dimmed backdrop on mobile */}
                    <div
                        className="fixed inset-0 lg:hidden z-[180] bg-[#EBEBFF]/70"
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        className="fixed lg:static right-5 top-[98px] lg:top-auto z-[200] w-[320px] max-w-[92vw] lg:w-full lg:max-w-none rounded-2xl lg:rounded-none border-1 border-[#bebee7] lg:border-0 bg-[#f5f5ff] pt-3 px-3 pb-3 lg:pt-2 lg:px-3 lg:pb-3 ml-auto"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                            <div className="w-full lg:w-44 shrink-0">
                                <div className="text-sm mb-2 font-medium opacity-80">
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
                                                className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${
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
