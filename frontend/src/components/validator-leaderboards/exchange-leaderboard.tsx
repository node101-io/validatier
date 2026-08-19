"use client";

import type Leaderboard from "@/types/leaderboard";
import type { SinkBreakdownEntry } from "@/types/data";
import { formatAtom, formatAtomUSD } from "@/utils/format-numbers";
import { useState } from "react";

type SortDirection = "asc" | "desc";

const DEFAULT_AVATAR = "/res/images/default_validator_photo.svg";

// Sibling of validator-leaderboard.tsx, sharing its card chrome/header/summary
// classes so the three leaderboard cards read as one set — but a separate
// component rather than a branch in that file: an exchange entry has no
// operator_address (no detail page to link to) and no avatar (no logo source
// in defined_accounts.csv), so the row markup genuinely differs. Also: with
// only ~6-7 exchanges, sorting reverses the list instead of slicing top/bottom
// 10 (validator-leaderboard.tsx's scheme would render an empty second state).
export default function ExchangeLeaderboard({
  entries,
  leaderboard,
  price,
}: {
  entries: SinkBreakdownEntry[];
  leaderboard: Leaderboard;
  price: number;
}) {
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // entries arrive sold-desc from the API (docs/05); "asc" just reverses it.
  const sortedEntries =
    sortDirection === "desc" ? entries : [...entries].reverse();

  return (
    <div className="flex flex-col pt-4 pb-2 overflow-hidden min-w-[320px] sm:min-w-[420px] lg:min-w-0 w-full h-full p-0 bg-[#f5f5ff] border-[0.5px] border-[#bebee7] rounded-[20px] gap-1">
      <div className="flex items-center justify-between w-full px-4">
        <div
          className="flex items-center gap-1 cursor-[var(--pointer-hand-dark)] select-none"
          onClick={handleSort}
        >
          <div className="text-[#7c70c3] font-normal text-lg sm:text-xl mb-1">
            {leaderboard.title}
          </div>
          <div className="flex justify-center ml-1.25">
            {sortDirection === "asc" ? (
              <div
                className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-[#49306f]"
                id="triangle-up-leaderboard"
              ></div>
            ) : (
              <div
                className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-[#49306f]"
                id="triangle-down-leaderboard"
              ></div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 h-6 mb-4">
        <div className="flex items-baseline flex-nowrap gap-1.25 mb-auto">
          <div className="text-nowrap text-2xl sm:text-4xl/3 font-bold text-[#49306f] mb-0.5">
            {leaderboard.summaryContent}
          </div>
          {leaderboard.usdValue && (
            <div className="block items-baseline w-full h-[14px] font-[500] text-base sm:text-xl text-[#7c70c3]">
              {leaderboard.usdValue}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col h-fit gap-0">
        {sortedEntries.map((entry, index) => (
          <div
            key={entry.name}
            className="flex items-center justify-between py-2 px-3 lg:px-4"
          >
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <div className="w-3 text-right text-[#7c70c3] select-none shrink-0">
                {index + 1}
              </div>
              <div className="flex items-center min-w-7.5 max-w-7.5 aspect-square rounded-none overflow-hidden shrink-0">
                <img
                  src={DEFAULT_AVATAR}
                  alt={entry.name}
                  className="w-full h-full object-cover rounded-none"
                />
              </div>
              <div className="flex-1 min-w-0 text-base sm:text-lg text-[#49306f] overflow-hidden text-ellipsis text-nowrap">
                {entry.name}
              </div>
            </div>
            <div className="flex gap-4 sm:gap-5 text-[#7c70c3] text-[15px] sm:text-[16px] text-nowrap">
              <div className="flex flex-row items-center gap-2 sm:gap-3 w-full justify-end">
                <div className="flex items-center !justify-end text-end text-sm sm:text-lg w-[110px] sm:w-[120px] whitespace-nowrap tabular-nums truncate">
                  {formatAtom(entry.sold, 1)} ATOM
                </div>
                <div className="flex items-center !justify-end text-end text-sm sm:text-lg w-[64px] whitespace-nowrap tabular-nums truncate">
                  ${formatAtomUSD(entry.sold, price, 1)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
