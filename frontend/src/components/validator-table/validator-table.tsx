"use client";

import Validator from "@/types/validator";
import {
  formatAtom,
  formatAtomUSD,
  formatNumber,
  formatPercentage,
} from "@/utils/format-numbers";
import { useRouter } from "next13-progressbar";
import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";

type SortField =
  | "name"
  | "percentageSold"
  | "avgDelegation"
  | "totalRewards"
  | "totalSold"
  | "selfStake";
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
    field: "selfStake" as const,
    label: "Self Stake",
    tooltip: "Validator's own stake on itself",
  },
];

const SortableHeader = ({
  field,
  label,
  tooltip,
  sortField,
  sortDirection,
  onSort,
}: SortableHeaderProps) => (
  <th className="flex items-center justify-between gap-2 text-[#7c70c3] font-semibold text-base lg:text-lg justify-self-center select-none cursor-pointer">
    <Tooltip>
      <TooltipTrigger
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => onSort(field)}
      >
        <Image src="/res/images/info.svg" alt="Info" width={14} height={14} />
        <span className="whitespace-nowrap mb-1 font-medium">{label}</span>
      </TooltipTrigger>
      <TooltipContent
        className="bg-[#2C2749] text-white text-xs py-1.5 px-2 rounded-md cursor-default"
        side="top"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
    <div
      className="hidden lg:flex flex-col items-center gap-0.5"
      onClick={() => onSort(field)}
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
    </div>
  </th>
);

export default function ValidatorTable({
  validators,
  searchQuery = "",
  price,
}: {
  validators: Validator[];
  searchQuery?: string;
  price: number;
}) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("percentageSold");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isMobile, setIsMobile] = useState(false);

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
          aValue = a.percentage_sold ?? 0;
          bValue = b.percentage_sold ?? 0;
          break;
        case "avgDelegation":
          aValue = a.average_total_stake ?? 0;
          bValue = b.average_total_stake ?? 0;
          break;
        case "totalRewards":
          aValue = a.total_withdraw ?? 0;
          bValue = b.total_withdraw ?? 0;
          break;
        case "totalSold":
          aValue = a.sold ?? 0;
          bValue = b.sold ?? 0;
          break;
        case "selfStake":
          aValue = a.self_stake ?? 0;
          bValue = b.self_stake ?? 0;
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
    const onResize = () => setIsMobile(window.innerWidth < 768);
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
        <div className="pt-3 pb-4 overflow-x-auto lg:overflow-visible">
          <table className="w-full min-w-[900px] table-fixed border-collapse">
            <thead>
              <tr className="grid grid-cols-[140px_1fr_1fr_1fr_1fr_1fr] sm:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] items-center w-full px-5 gap-3 mb-3">
                <th className="flex mb-1 items-center sm:w-full justify-start text-left text-[#7c70c3] font-semibold gap-0 text-base lg:text-lg whitespace-nowrap sticky left-0 -ml-5 pl-5 z-20 bg-[#f5f5ff] lg:bg-transparent select-none">
                  Name
                </th>
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
              </tr>
            </thead>
            <tbody className="w-full">
              {filteredAndSortedValidators.map((validator, index) => (
                <tr
                  key={validator.operator_address}
                  className="grid grid-cols-[140px_1fr_1fr_1fr_1fr_1fr] lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] items-center w-full px-5 gap-5 py-0 my-2.5 lg:my-0 lg:py-1.5 hover:bg-[#e8e8ff] transition-colors duration-250 ease-in-out cursor-[var(--pointer-hand-dark)]"
                  onClick={() => {
                    router.push(`/validator/${validator.operator_address}`);
                  }}
                >
                  <td className="flex items-center justify-start gap-4.5 h-full lg:h-full sticky left-0 -ml-5 pl-5 z-10 bg-[#f5f5ff] lg:bg-transparent overflow-hidden">
                    {/* Name */}
                    <div
                      className={`flex items-center relative ${validator.temporary_image_uri === "/res/images/default_validator_photo.svg" ? "rounded-none" : "rounded-full"} gap-2.5 aspect-square size-7.5 shrink-0`}
                    >
                      <img
                        src={validator.temporary_image_uri}
                        alt={validator.moniker}
                        className={`w-full h-full ${validator.temporary_image_uri === "/res/images/default_validator_photo.svg" ? "rounded-none" : "rounded-full"}`}
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
                    <div className="text-nowrap -mt-0.5 w-[80%]">
                      <div className="flex text-base md:text-xl gap-2.5 text-[#49306f]">
                        <div className="inline-block relative overflow-hidden whitespace-nowrap w-[120px] validators-table-validator-name-wrapper">
                          <span className="inline-block whitespace-nowrap validators-table-validator-name mb-1">
                            {isMobile && validator.moniker.length > 13
                              ? `${validator.moniker.slice(0, 13)}...`
                              : validator.moniker}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="flex items-center justify-center font-bold gap-1.25 justify-self-center">
                    {/* Percentage Sold */}
                    {validator.percentage_sold === undefined ||
                    validator.percentage_sold === null ? (
                      <span className="text-current">-</span>
                    ) : (
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
                          <Image
                            className="flex items-center justify-center"
                            src="/res/images/check_green.svg"
                            alt="check"
                            width={14}
                            height={14}
                          />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="text-center text-nowrap text-xl relative justify-self-center flex items-center justify-center flex-col gap-1">
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
                  </td>
                  <td className="text-center text-nowrap text-xl relative justify-self-center flex items-center justify-center flex-col gap-1">
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
                  </td>
                  <td className="text-center text-nowrap text-xl relative justify-self-center flex items-center justify-center flex-col gap-1">
                    {/* Total Sold Amount */}
                    <div className="inline-flex gap-1 text-lg font-semibold text-[#633f9a] leading-5 items-center">
                      {validator.sold && validator.sold > 0
                        ? formatAtom(validator.sold, 1)
                        : "0"}{" "}
                      ATOM
                      {validator.total_withdraw !== undefined &&
                        validator.sold !== undefined &&
                        validator.total_withdraw < validator.sold && (
                          <Tooltip>
                            <TooltipTrigger className="flex items-center cursor-pointer ml-1">
                              <Image
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
                  </td>
                  <td className="text-center text-nowrap text-xl relative justify-self-center flex items-center justify-center flex-col gap-1">
                    {/* Self Stake */}
                    <div className="inline-flex gap-1 text-lg font-semibold text-[#633f9a] leading-5">
                      {validator.self_stake && validator.self_stake > 0
                        ? formatAtom(validator.self_stake, 1)
                        : "0"}{" "}
                      ATOM
                    </div>
                    <div className="text-base font-medium text-[#633f9a] leading-4 mb-1">
                      {`$${validator.self_stake && validator.self_stake > 0 ? formatAtomUSD(validator.self_stake, price, 1) : 0}`}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
