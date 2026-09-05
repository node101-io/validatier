"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import {
  GENESIS_DATE,
  RANGE_PRESETS,
  RANGE_PRESET_LABELS,
} from "@/types/range";
import type { RangePreset, RangeSearch } from "@/types/range";

// New selector: two independent pills — "data of [preset]" (a look-back
// length) and "until [day]" (a single picked day). The window is always
// [until - preset, until] (or [genesis, until] for all_time), resolved
// backend-side by backend/api/lib/dateRange.ts — this component only ever
// writes the two URL search params, never computes the window itself.
//
// Replaces the pre-rewrite date-range-picker (recovered at git commit
// 79db787^ for reference) — same navbar slot, same light/dark theming
// convention, but hand-built calendar instead of react-datepicker (removed
// from the dependency tree along with the old picker; a single-day grid is
// small enough not to need it).

function toDateOnly(value: string | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function toDateParam(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function CalendarSVG({ stroke }: { stroke: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  );
}

function ChevronSVG({ stroke, open }: { stroke: string; open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6"></path>
    </svg>
  );
}

export default function DateRangeSelector({ variant = "light" }: { variant?: "light" | "dark" }) {
  // strict:false — this renders inside Navbar, shared by both "/" and
  // "/validator/$operatorAddress", so it can't be tied to one route's search type.
  const search = useSearch({ strict: false }) as RangeSearch;
  const navigate = useNavigate();
  const isNavigating = useRouterState({ select: (s) => s.status === "pending" });

  const [openPanel, setOpenPanel] = useState<"range" | "until" | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedPreset: RangePreset = search.range ?? "all_time";
  const selectedUntil = toDateOnly(search.until) ?? startOfUtcDay(new Date());
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(Date.UTC(selectedUntil.getUTCFullYear(), selectedUntil.getUTCMonth(), 1)),
  );

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    };
    if (openPanel) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openPanel]);

  const updateSearch = (patch: Partial<RangeSearch>) => {
    navigate({
      to: ".",
      search: (prev: RangeSearch) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    });
  };

  const handlePresetSelect = (preset: RangePreset) => {
    updateSearch({ range: preset === "all_time" ? undefined : preset });
    setOpenPanel(null);
  };

  const handleDaySelect = (day: Date) => {
    updateSearch({ until: toDateParam(day) });
    setOpenPanel(null);
  };

  const todayUtc = useMemo(() => startOfUtcDay(new Date()), []);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getUTCFullYear();
    const month = calendarMonth.getUTCMonth();
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    // Monday-first grid: JS getUTCDay() is 0=Sun..6=Sat, shift to 0=Mon..6=Sun.
    const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    const cells: Array<Date | null> = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
    return cells;
  }, [calendarMonth]);

  const isDark = variant === "dark";
  const pillClasses = isDark
    ? "border-white/60 bg-white/10 backdrop-blur-lg text-white"
    : "border-[#bebee7] bg-[#f5f5ff] text-[#7c70c3]";
  const iconStroke = isDark ? "#ffffff" : "#7c70c3";

  const canGoPrevMonth = calendarMonth.getTime() > Date.UTC(GENESIS_DATE.getUTCFullYear(), GENESIS_DATE.getUTCMonth(), 1);
  const canGoNextMonth = calendarMonth.getTime() < Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1);

  return (
    <div ref={containerRef} className="relative flex items-center gap-4 z-30">
      {isNavigating && (
        <div className="absolute -inset-1 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 border-2 border-[#7c70c3]/30 border-t-[#7c70c3] rounded-full animate-spin" />
        </div>
      )}

      {/* "data of [preset]" — label sits outside the box */}
      <div className="relative flex items-center gap-2">
        <span className={`text-base font-medium whitespace-nowrap ${isDark ? "text-white/80" : "text-[#7c70c3]"}`}>
          data of
        </span>
        <button
          type="button"
          onClick={() => setOpenPanel((p) => (p === "range" ? null : "range"))}
          className={`flex items-center gap-2 h-11.5 px-4 rounded-2xl border-1 text-lg font-medium whitespace-nowrap cursor-[var(--pointer-hand-dark)] ${pillClasses}`}
        >
          <span>{RANGE_PRESET_LABELS[selectedPreset]}</span>
          <ChevronSVG stroke={iconStroke} open={openPanel === "range"} />
        </button>
        {openPanel === "range" && (
          <div className="absolute top-full mt-2 left-0 z-40 min-w-[180px] rounded-xl border-1 border-[#bebee7] bg-[#f5f5ff] p-1.5 shadow-xl">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={`w-full text-left text-[#250054] text-base rounded-lg px-3 py-2 cursor-[var(--pointer-hand-dark)] transition-colors ${
                  selectedPreset === preset ? "bg-[#e8e8ff]" : "hover:bg-[#ececff]"
                }`}
              >
                {RANGE_PRESET_LABELS[preset]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* "until [day]" — label sits outside the box */}
      <div className="relative flex items-center gap-2">
        <span className={`text-base font-medium whitespace-nowrap ${isDark ? "text-white/80" : "text-[#7c70c3]"}`}>
          until
        </span>
        <button
          type="button"
          onClick={() => setOpenPanel((p) => (p === "until" ? null : "until"))}
          className={`flex items-center gap-2 h-11.5 px-4 rounded-2xl border-1 text-lg font-medium whitespace-nowrap cursor-[var(--pointer-hand-dark)] ${pillClasses}`}
        >
          <CalendarSVG stroke={iconStroke} />
          <span>
            {selectedUntil.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </span>
          <ChevronSVG stroke={iconStroke} open={openPanel === "until"} />
        </button>
        {openPanel === "until" && (
          <div className="absolute top-full mt-2 right-0 z-40 w-[280px] rounded-xl border-1 border-[#bebee7] bg-[#f5f5ff] p-3 shadow-xl">
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                disabled={!canGoPrevMonth}
                onClick={() => setCalendarMonth((m) => new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() - 1, 1)))}
                className="text-[#7c70c3] disabled:opacity-30 cursor-[var(--pointer-hand-dark)] disabled:cursor-default px-1"
              >
                ‹
              </button>
              <div className="text-[#250054] font-medium">
                {calendarMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}
              </div>
              <button
                type="button"
                disabled={!canGoNextMonth}
                onClick={() => setCalendarMonth((m) => new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1)))}
                className="text-[#7c70c3] disabled:opacity-30 cursor-[var(--pointer-hand-dark)] disabled:cursor-default px-1"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} className="text-xs text-[#7c70c3]/70 py-1">
                  {w}
                </div>
              ))}
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`blank-${i}`} />;
                const disabled = day.getTime() < GENESIS_DATE.getTime() || day.getTime() > todayUtc.getTime();
                const isSelected = day.getTime() === selectedUntil.getTime();
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleDaySelect(day)}
                    className={`aspect-square rounded-lg text-sm cursor-[var(--pointer-hand-dark)] disabled:cursor-default disabled:opacity-25 ${
                      isSelected
                        ? "bg-[#7c70c3] text-white"
                        : "text-[#49306f] hover:bg-[#e8e8ff]"
                    }`}
                  >
                    {day.getUTCDate()}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
