"use client";

import Validator from "@/types/validator";
import Leaderboard from "@/types/leaderboard";
import {
    formatAtom,
    formatAtomUSD,
    formatPercentage,
} from "@/utils/format-numbers";
import { useState } from "react";
import { useRouter } from "next/navigation";

type SortDirection = "asc" | "desc";

export default function ValidatorLeaderboard({
    validators,
    leaderboard,
}: {
    validators: Validator[];
    leaderboard: Leaderboard;
}) {
    const router = useRouter();
    const [sortDirection, setSortDirection] = useState<SortDirection | null>(
        leaderboard.type === "totalSold" ? "desc" : "asc"
    );

    const handleSort = () => {
        if (sortDirection === null) {
            setSortDirection("asc");
        } else if (sortDirection === "asc") {
            setSortDirection("desc");
        } else {
            setSortDirection(null);
        }
    };

    const sortedValidators = (() => {
        if (sortDirection === "asc") return validators.slice(0, 10);
        if (sortDirection === "desc") return validators.slice(10, 20);
        if (leaderboard.type === "totalSold") return validators.slice(10, 20);
        return validators.slice(0, 10);
    })();
    return (
        <div className="flex flex-col overflow-hidden min-w-[320px] sm:min-w-[420px] lg:min-w-[500px] w-full h-full p-0 bg-[#f5f5ff] border-[0.5px] border-[#bebee7] rounded-[20px] gap-1">
            <div className="flex items-center justify-between w-full px-4 pt-4">
                {/* Each Leaderboard Header */}
                <div
                    className="flex items-center gap-1 cursor-[var(--pointer-hand-dark)] select-none"
                    onClick={handleSort}
                >
                    {/* Each Leaderboard Table Type Content */}
                    <div className="text-[#7c70c3] font-normal text-lg sm:text-xl">
                        {leaderboard.title}
                    </div>
                    <div className="flex flex-col justify-center gap-0.5 ml-1.25 -mb-0.75">
                        <div
                            className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] ${
                                sortDirection === "asc"
                                    ? "border-b-[#49306f]"
                                    : "border-b-transparent"
                            }`}
                            id="triangle-up-leaderboard"
                        ></div>
                        <div
                            className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] ${
                                sortDirection === "desc"
                                    ? "border-t-[#49306f]"
                                    : "border-t-transparent"
                            }`}
                            id="triangle-down-leaderboard"
                        ></div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between mb-4 sm:mb-6 px-4">
                {/* Each Leaderboard Summary */}
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
                {sortedValidators.map((validator, index) => (
                    <div
                        key={index + leaderboard.type}
                        className="flex items-center justify-between cursor-[var(--pointer-hand-dark)] py-3 px-3 lg:px-4 hover:bg-[#e8e8ff] transition-colors duration-250 ease-in-out"
                        operator-address={validator.operator_address}
                        onClick={() => {
                            sessionStorage.setItem(
                                `validator_${validator.operator_address}`,
                                JSON.stringify(validator)
                            );
                            router.push(
                                `/validator/${validator.operator_address}`
                            );
                        }}
                    >
                        <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                            {/* Row index (separate from avatar) */}
                            <div className="w-3 text-right text-[#7c70c3] select-none shrink-0">
                                {index + 1}
                            </div>
                            {/* Avatar image */}
                            <div className="flex items-center min-w-7.5 max-w-7.5 aspect-square rounded-full overflow-hidden shrink-0">
                                <img
                                    src={validator.temporary_image_uri}
                                    alt={validator.moniker}
                                    className="w-full h-full rounded-full"
                                />
                            </div>
                            <div className="flex-1 min-w-0 w-auto sm:w-[150px] text-base sm:text-lg text-[#49306f] overflow-hidden text-ellipsis text-nowrap">
                                {/* Each Leaderboard Validator Name */}
                                <span className="sm:hidden">
                                    {validator.moniker.length > 9
                                        ? `${validator.moniker.slice(0, 9)}...`
                                        : validator.moniker}
                                </span>
                                <span className="hidden sm:inline">
                                    {validator.moniker}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-4 sm:gap-5 text-[#7c70c3] text-[15px] sm:text-[16px] text-nowrap">
                            {/* Each Leaderboard Validator Data Wrapper */}
                            {leaderboard.type === "percentageSold" ? (
                                <div className="flex items-center font-bold gap-1">
                                    {validator.percentage_sold === undefined ||
                                    validator.percentage_sold === null ? (
                                        <span className="text-[#b82200] text-xl">
                                            -
                                        </span>
                                    ) : (
                                        <div className="flex items-center text-xl gap-1.5">
                                            <span
                                                className={`${
                                                    validator.percentage_sold >
                                                    50
                                                        ? "text-[#b82200]"
                                                        : validator.percentage_sold >
                                                          25
                                                        ? "text-[#ff6f43]"
                                                        : "text-[#13a719]"
                                                }`}
                                            >
                                                {formatPercentage(
                                                    validator.percentage_sold,
                                                    2
                                                )}
                                                %
                                            </span>
                                            {validator.percentage_sold < 25 && (
                                                <img
                                                    className="flex items-center justify-center"
                                                    src="/res/images/check_green.svg"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : leaderboard.type === "totalSold" ? (
                                <div className="flex flex-row items-center gap-2 sm:gap-3 w-full justify-end">
                                    <div className="flex items-center !justify-end text-end text-sm sm:text-lg min-w-0 max-w-[110px] truncate">
                                        {formatAtom(validator.sold ?? 0, 2)}{" "}
                                        ATOM
                                    </div>
                                    <div className="flex items-center !justify-end text-end text-sm sm:text-lg min-w-0 max-w-[110px] truncate">
                                        {validator.sold
                                            ? `$${formatAtomUSD(
                                                  validator.sold ?? 0,
                                                  2
                                              )}`
                                            : "0 ATOM"}
                                    </div>
                                </div>
                            ) : (
                                <></>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
