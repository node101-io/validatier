"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./date-picker.css";
import { CalendarSVG } from "@/style/calendar-svg";
import { ArrowDownSVG } from "@/style/arrow-down-svg";
import { genesisDate } from "../../../../backend/models/Cache/functions/getFormattedCacheData";

export default function DateRangePicker({
  variant = "light",
  initialStartDate,
  initialEndDate,
  initialInterval = "last_365_days",
}: {
  variant?: "light" | "dark";
  initialStartDate?: Date;
  initialEndDate?: Date;
  initialInterval?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState<Date | null>(
    initialStartDate || null
  );
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate || null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState("Last year");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const predefinedRanges = [
    { label: "Last 3 months", months: 3 },
    { label: "Last 6 months", months: 6 },
    { label: "Last year", months: 12 },
    { label: "All time", months: 0 },
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

  const handleRangeSelect = (range: (typeof predefinedRanges)[0]) => {
    setSelectedRange(range.label);
    if (range.months === 0) {
      // All time - use genesis date
      setStartDate(genesisDate);
      setEndDate(new Date());
      // Set cookies for full range (all time) and specific interval
      const bottom = formatForCookie(genesisDate);
      const top = formatForCookie(new Date());
      setCookie("selectedDateBottom", bottom);
      setCookie("selectedDateTop", top);
      const interval = LABEL_TO_INTERVAL[range.label];
      if (interval) setCookie("specificRange", interval);
    } else {
      // Calculate based on months
      const today = new Date();
      const start = new Date(today);
      start.setMonth(today.getMonth() - range.months);
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
    startTransition(() => {
      router.refresh();
    });
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const mapped = INTERVAL_TO_LABEL[initialInterval];
    if (mapped) {
      setSelectedRange(mapped);
    } else {
      setSelectedRange("Custom");
    }
  }, [initialInterval]);

  const isDark = variant === "dark";
  const containerClasses = isDark
    ? "border-white/60 bg-white/10 backdrop-blur-lg text-white"
    : "border-[#bebee7] bg-[#f5f5ff] text-[#7c70c3]";
  const iconStroke = isDark ? "#ffffff" : "#7c70c3";

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden relative z-20 rounded-xl border-1 ${containerClasses} ${
        isOpen ? "shadow-xl lg:dp-trigger-grow" : ""
      } ${variant === "light" ? "h-8 w-full sm:h-full" : "h-full w-full"}`}
    >
      {isPending && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-lg z-50 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        disabled={isPending}
        className={`flex h-full justify-between cursor-[var(--pointer-hand-dark)] items-center text-xl gap-2 p-1 rounded-2xl ${
          variant === "light" ? "w-8 sm:w-full" : "w-full"
        } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span className="flex items-center gap-1 p-0.5 sm:p-2">
          <CalendarSVG stroke={iconStroke} />
        </span>
        {isOpen && (
          <span className="hidden lg:block whitespace-nowrap text-xl font-medium opacity-90 mb-1">
            {selectedRange}
          </span>
        )}
        <span className="hidden lg:flex gap-0.5 -mt-0.5 w-fit overflow-hidden mx-auto">
          <span className="inline text-ellipsis">{formatDate(startDate)}</span>
          <span>-</span>
          <span className="inline text-ellipsis">{formatDate(endDate)}</span>
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
            className="fixed lg:static max-lg:rounded-xl max-lg:left-1/2 max-lg:top-1/2 max-lg:-translate-x-1/2 max-lg:-translate-y-1/2 max-lg:w-[90%] max-lg:max-w-2xl lg:top-auto z-[200] lg:w-full lg:max-w-none border-1 border-[#bebee7] lg:border-0 bg-[#f5f5ff] pt-3 px-3 pb-3 lg:pt-2 lg:px-3 lg:pb-3 ml-auto dp-animate-in"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
              <div className="w-full lg:w-44 shrink-0 py-2">
                <ul className="flex flex-col gap-1">
                  {predefinedRanges.map((range) => (
                    <li key={range.label}>
                      <button
                        type="button"
                        onClick={() => handleRangeSelect(range)}
                        className={`w-full text-left !text-[#161616] text-lg rounded-xl px-3 pt-1.5 pb-2.5 cursor-pointer transition-colors ${
                          selectedRange === range.label
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
              <div className="hidden lg:block flex-1 min-w-0">
                <DatePicker
                  selectsRange
                  startDate={startDate || undefined}
                  endDate={endDate || undefined}
                  minDate={genesisDate}
                  maxDate={new Date()}
                  onChange={(dates: [Date | null, Date | null]) => {
                    const [start, end] = dates;
                    setStartDate(start);
                    setEndDate(end);
                    if (start && end) {
                      // Calculate the difference in days
                      const diffInMs = end.getTime() - start.getTime();
                      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

                      // Minimum 90 days (3 months) required
                      if (diffInDays < 90) {
                        // Reset the selection if less than 90 days
                        setStartDate(null);
                        setEndDate(null);
                        alert(
                          "Please select a date range of at least 3 months (90 days)."
                        );
                        return;
                      }

                      setCookie("selectedDateBottom", formatForCookie(start));
                      setCookie("selectedDateTop", formatForCookie(end));
                      // Set custom interval to trigger dynamic data generation
                      setCookie("specificRange", "custom");
                      setSelectedRange("Custom");
                      setIsOpen(false);
                      startTransition(() => {
                        router.refresh();
                      });
                    }
                  }}
                  inline
                  calendarStartDay={1}
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
