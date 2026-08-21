"use client";

import type Validator from "@/types/validator";
import {
  formatAtom,
  formatAtomUSD,
  formatPercentage,
} from "@/utils/format-numbers";
import { Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";

const DEFAULT_AVATAR = "/res/images/default_validator_photo.svg";

type SortField =
  | "name"
  | "percentageSold"
  | "avgDelegation"
  | "totalRewards"
  | "totalSold"
  | "leadingExchange";
type SortDirection = "asc" | "desc";

interface SortableHeaderProps {
  field: SortField;
  label: string;
  tooltip: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

const sortableHeaders = [
  {
    field: "percentageSold" as const,
    label: "Percentage Sold",
    tooltip: "(Total sold / Total rewards) * 100",
  },
  {
    field: "avgDelegation" as const,
    label: "Avg. Delegation",
    tooltip: "Average total stake of the validator",
  },
  {
    field: "totalRewards" as const,
    label: "Rewards",
    tooltip: "Commission rewards + self stake rewards",
  },
  {
    field: "totalSold" as const,
    label: "Sold Amount",
    tooltip: "Total transferred out from wallet (cummulative)",
  },
  {
    field: "leadingExchange" as const,
    label: "Leading Exchange",
    tooltip: "The exchange this validator sold the most to",
  },
];

const SortableHeader = ({
  field,
  label,
  tooltip,
  sortField,
  sortDirection,
  onSort,
}: SortableHeaderProps) => {
  const ariaSort =
    sortField === field
      ? sortDirection === "asc"
        ? "ascending"
        : "descending"
      : "none";

  return (
    <div
      role="columnheader"
      aria-sort={ariaSort}
      className="flex items-center justify-between gap-2 text-[#7c70c3] font-semibold text-base lg:text-lg justify-self-center select-none"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 cursor-pointer"
            onClick={() => onSort(field)}
          >
            <img src="/res/images/info.svg" alt="Info" width={14} height={14} className="mb-px"/>
            <span className="whitespace-nowrap mb-1 font-medium">{label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          className="bg-[#2C2749] text-white text-xs py-1.5 px-2 rounded-md cursor-default"
          side="top"
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={() => onSort(field)}
        className="hidden lg:flex flex-col items-center gap-0.5 cursor-pointer"
      >
        <span
          className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-b-[5px] ${
            sortField === field && sortDirection === "asc"
              ? "border-b-[#161616]"
              : "border-b-[#B7A6C6]"
          }`}
        ></span>
        <span
          className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-t-[5px] ${
            sortField === field && sortDirection === "desc"
              ? "border-t-[#161616]"
              : "border-t-[#B7A6C6]"
          }`}
        ></span>
      </button>
    </div>
  );
};

export default function ValidatorTable({
  validators,
  price,
}: {
  validators: Validator[];
  price: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("percentageSold");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isMobile, setIsMobile] = useState(false);
  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Sort validators first to establish the original ranking
  const sortedValidators = useMemo(() => {
    return [...validators].sort((a, b) => {
      let aValue;
      let bValue;

      switch (sortField) {
        case "name":
          aValue = a.moniker.toLowerCase();
          bValue = b.moniker.toLowerCase();
          break;
        case "percentageSold":
          aValue = a.percentage_sold;
          bValue = b.percentage_sold;
          break;
        case "avgDelegation":
          aValue = a.average_total_stake;
          bValue = b.average_total_stake;
          break;
        case "totalRewards":
          aValue = a.total_withdraw;
          bValue = b.total_withdraw;
          break;
        case "totalSold":
          aValue = a.sold;
          bValue = b.sold;
          break;
        case "leadingExchange":
          // Nulls (no sink sales) always sort last, regardless of direction.
          if (!a.leading_exchange && !b.leading_exchange) return 0;
          if (!a.leading_exchange) return 1;
          if (!b.leading_exchange) return -1;
          aValue = a.leading_exchange.toLowerCase();
          bValue = b.leading_exchange.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [validators, sortField, sortDirection]);

  // Create a map of validator rankings for O(1) lookup
  const validatorRankMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedValidators.forEach((validator, index) => {
      map.set(validator.operator_address, index + 1);
    });
    return map;
  }, [sortedValidators]);

  // Filter and sort validators using useMemo for better performance
  const filteredAndSortedValidators = useMemo(() => {
    // Filter by search query
    return searchQuery
      ? sortedValidators.filter((validator) =>
          validator.moniker.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : sortedValidators;
  }, [sortedValidators, searchQuery]);

  // Search/sort changing the result set invalidates how far we've paged in —
  // start back at the first page rather than showing a stale offset.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, sortField, sortDirection]);

  const visibleValidators = useMemo(
    () => filteredAndSortedValidators.slice(0, visibleCount),
    [filteredAndSortedValidators, visibleCount]
  );
  const remainingCount = filteredAndSortedValidators.length - visibleValidators.length;

  useEffect(() => {
    const update = () => {
      const wrappers = document.querySelectorAll<HTMLElement>(
        ".validators-table-validator-name-wrapper"
      );
      wrappers.forEach((wrap) => {
        const span = wrap.querySelector<HTMLElement>(
          ".validators-table-validator-name"
        );
        if (!span) return;
        const overflows = span.scrollWidth > wrap.clientWidth;
        span.classList.toggle("can-scroll", overflows);
      });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [validators]);

  // Track mobile viewport for moniker truncation on small screens only
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <div className="flex flex-col gap-2.5 px-5 lg:px-0">
      <div className="flex justify-between items-center w-full">
        <div className="text-xl font-[500] text-[#7c70c3] my-2">Validators</div>
      </div>
      <div className="flex flex-col relative rounded-[30px] bg-[#f5f5ff] border-[0.5px] border-[#bebee7] overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <img src="/res/images/search.svg" alt="" width={20} height={20} className="shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-xl font-[500] text-[#49306f] placeholder:text-[#7c70c3] focus:outline-none"
            placeholder="Search Validator"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <img src="/res/images/export.svg" alt="" width={20} height={20} className="shrink-0" />
        </div>
        <div className="pt-3 pb-4 overflow-x-auto lg:overflow-visible">
          <div role="table" className="w-full min-w-[1050px]">
            <div role="rowgroup">
              <div
                role="row"
                className="grid grid-cols-[18fr_10fr_12fr_12fr_12fr_10fr] items-center w-full pl-6 pr-2 gap-3 mb-3"
              >
                <div
                  role="columnheader"
                  className="flex w-full mb-1 items-center justify-start text-left text-[#7c70c3] font-semibold gap-0 text-base lg:text-lg whitespace-nowrap sticky left-0 -ml-6 pl-6 z-20 bg-[#f5f5ff] lg:bg-transparent select-none"
                >
                  Name
                </div>
                {sortableHeaders.map((header) => (
                  <SortableHeader
                    key={header.field}
                    field={header.field}
                    label={header.label}
                    tooltip={header.tooltip}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                ))}
              </div>
            </div>
            <div role="rowgroup" className="w-full">
              {visibleValidators.map((validator) => {
                const avatarSrc = validator.temporary_image_uri ?? DEFAULT_AVATAR;
                return (
                  <Link
                    key={validator.operator_address}
                    to="/validator/$operatorAddress"
                    params={{ operatorAddress: validator.operator_address }}
                    search={(prev) => prev}
                    role="row"
                    className="grid grid-cols-[18fr_10fr_12fr_12fr_12fr_10fr] items-center w-full pr-2 gap-3 py-0 my-2.5 lg:my-0 lg:py-1.5 hover:bg-[#e8e8ff] transition-colors duration-250 ease-in-out cursor-[var(--pointer-hand-dark)]"
                    aria-label={`Open details for ${validator.moniker}`}
                  >
                    <div
                      role="cell"
                      className="flex w-full items-center justify-start gap-4.5 h-full lg:h-full sticky left-0 pl-6 z-10 bg-[#f5f5ff] lg:bg-transparent overflow-hidden"
                    >
                      {/* Name */}
                      <div
                        className={`flex items-center relative ${avatarSrc === DEFAULT_AVATAR ? "rounded-none" : "rounded-full"} gap-2.5 aspect-square size-7.5 shrink-0`}
                      >
                        <img
                          src={avatarSrc}
                          alt={validator.moniker}
                          className={`w-full h-full ${avatarSrc === DEFAULT_AVATAR ? "rounded-none" : "rounded-full"}`}
                        />
                        {(() => {
                          const rank =
                            validatorRankMap.get(validator.operator_address) || 0;
                          const fontSize =
                            rank < 10
                              ? "text-[12px]"
                              : rank < 100
                                ? "text-[10px]"
                                : "text-[9px]";
                          return (
                            <div
                              className={`absolute -bottom-1.5 -left-1.5 bg-[#250055] text-white font-medium rounded-full flex items-center justify-center border-1 border-white w-5 h-5 pb-px ${fontSize}`}
                            >
                              {rank}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="text-nowrap -mt-0.5 w-fit overflow-hidden">
                        <div className="flex text-base md:text-xl gap-2.5 text-[#49306f] group">
                          <div className="relative overflow-hidden whitespace-nowrap flex-1 validators-table-validator-name-wrapper">
                            <span className="validators-table-validator-name whitespace-nowrap inline-block will-change-transform mb-1 [:is(.can-scroll)&]:group-hover:animate-[scrollText_10s_linear_infinite]">
                              {isMobile && validator.moniker.length > 13
                                ? `${validator.moniker.slice(0, 13)}...`
                                : validator.moniker}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      role="cell"
                      className="flex items-center justify-center font-bold gap-1.25 justify-self-center"
                    >
                      {/* Percentage Sold */}
                      <div className="flex items-center text-xl gap-1.5">
                        <span
                          className={`mb-1 ${
                            validator.percentage_sold > 50
                              ? "text-[#b82200]"
                              : validator.percentage_sold > 25
                                ? "text-[#ff6f43]"
                                : "text-[#13a719]"
                          }`}
                        >
                          {formatPercentage(validator.percentage_sold, 2)}%
                        </span>
                        {validator.percentage_sold < 25 && (
                          <img
                            className="flex items-center justify-center"
                            src="/res/images/check_green.svg"
                            alt="check"
                            width={14}
                            height={14}
                          />
                        )}
                      </div>
                    </div>
                    <div
                      role="cell"
                      className="text-center text-nowrap text-xl relative justify-self-center flex items-center justify-center flex-col gap-1"
                    >
                      {/* Avg Delegation */}
                      <div className="inline-flex gap-1 text-lg font-semibold text-[#633f9a] leading-5">
                        {validator.average_total_stake &&
                        validator.average_total_stake > 0
                          ? formatAtom(validator.average_total_stake, 1)
                          : "0"}{" "}
                        ATOM
                      </div>
                      <div className="text-base font-medium text-[#633f9a] leading-4 mb-1">
                        {`$${validator.average_total_stake && validator.average_total_stake > 0 ? formatAtomUSD(validator.average_total_stake, price, 1) : 0}`}
                      </div>
                    </div>
                    <div
                      role="cell"
                      className="text-center text-nowrap text-xl relative justify-self-center flex items-center justify-center flex-col gap-1"
                    >
                      {/* Total Rewards */}
                      <div className="inline-flex gap-1 text-lg font-semibold text-[#633f9a] leading-5">
                        {validator.total_withdraw && validator.total_withdraw > 0
                          ? formatAtom(validator.total_withdraw, 1)
                          : "0"}{" "}
                        ATOM
                      </div>
                      <div className="text-base font-medium text-[#633f9a] leading-4 mb-1">
                        {`$${validator.total_withdraw && validator.total_withdraw > 0 ? formatAtomUSD(validator.total_withdraw, price, 1) : 0}`}
                      </div>
                    </div>
                    <div
                      role="cell"
                      className="text-center text-nowrap text-xl relative justify-self-center flex items-center justify-center flex-col gap-1"
                    >
                      {/* Total Sold Amount */}
                      <div className="inline-flex gap-1 text-lg font-semibold text-[#633f9a] leading-5 items-center">
                        {validator.sold && validator.sold > 0
                          ? formatAtom(validator.sold, 1)
                          : "0"}{" "}
                        ATOM
                        {validator.total_withdraw < validator.sold && (
                            <Tooltip>
                              <TooltipTrigger className="flex items-center cursor-pointer ml-1">
                                <img
                                  src="/res/images/warning.svg"
                                  alt="Warning"
                                  width={14}
                                  height={14}
                                  className="mt-0.5"
                                />
                              </TooltipTrigger>
                              <TooltipContent
                                className="bg-[#2C2749] text-white text-base pt-1 pb-2 px-2 rounded-md cursor-default mb-1"
                                side="top"
                              >
                                The amount sold exceeds the total rewards
                                <br />
                                because the validator also sold tokens received
                                <br />
                                before the queried time interval.
                              </TooltipContent>
                            </Tooltip>
                          )}
                      </div>
                      <div className="text-base font-medium text-[#633f9a] leading-4 mb-1">
                        {`$${validator.sold && validator.sold > 0 ? formatAtomUSD(validator.sold, price, 1) : 0}`}
                      </div>
                    </div>
                    <div
                      role="cell"
                      className="text-center text-nowrap text-lg relative justify-self-center flex items-center justify-center overflow-hidden text-ellipsis text-[#633f9a] font-semibold"
                    >
                      {validator.leading_exchange ?? "—"}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        {remainingCount > 0 && (
          <div className="flex justify-center pb-4">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="text-base font-medium text-[#7c70c3] bg-[#f5f5ff] border-[0.5px] border-[#bebee7] rounded-xl px-4 py-2 hover:bg-[#e8e8ff] transition-colors duration-250 ease-in-out cursor-[var(--pointer-hand-dark)]"
            >
              Load more ({remainingCount} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
