"use client";

import Validator from "@/types/validator";
import {
    formatAtom,
    formatAtomUSD,
    formatNumber,
    formatPercentage,
} from "@/utils/format-numbers";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SortField =
    | "name"
    | "percentageSold"
    | "avgDelegation"
    | "totalRewards"
    | "totalSold"
    | "selfStake";
type SortDirection = "asc" | "desc";

export default function ValidatorTable({
    validators,
    searchQuery = "",
}: {
    validators: Validator[];
    searchQuery?: string;
}) {
    const router = useRouter();
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [isMobile, setIsMobile] = useState(false);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            if (sortDirection === "asc") {
                setSortDirection("desc");
            } else if (sortDirection === "desc") {
                // 3rd click - reset sorting
                setSortField(null);
                setSortDirection("asc");
            }
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const sortedValidators = [...validators].sort((a, b) => {
        if (!sortField) return 0;

        let aValue: any;
        let bValue: any;

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
                aValue = a.reward ?? 0;
                bValue = b.reward ?? 0;
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

    // Handle search filtering by showing/hiding rows
    useEffect(() => {
        if (!searchQuery) {
            document
                .querySelectorAll<HTMLElement>("[data-validator-row]")
                .forEach((row) => {
                    row.style.display = "";
                });
            return;
        }

        const query = searchQuery.toLowerCase();
        document
            .querySelectorAll<HTMLElement>("[data-validator-row]")
            .forEach((row) => {
                const moniker =
                    row.getAttribute("data-validator-moniker")?.toLowerCase() ||
                    "";
                row.style.display = moniker.includes(query) ? "" : "none";
            });
    }, [searchQuery]);
    return (
        <div className="flex flex-col gap-2.5 px-5 lg:px-0">
            <div className="flex justify-between items-center w-full">
                <div className="text-xl font-[500] text-[#7c70c3] my-2">
                    Validators
                </div>
            </div>
            <div className="flex flex-col relative rounded-[30px] bg-[#f5f5ff] border-[0.5px] border-[#bebee7] overflow-hidden">
                <div className="pt-3 pb-4 overflow-x-auto lg:overflow-visible">
                    <table className="w-full min-w-[900px] table-fixed border-collapse">
                        <thead>
                            <tr className="grid grid-cols-[140px_1fr_1fr_1fr_1fr_1fr] sm:grid-cols-[210px_1fr_1fr_1fr_1fr_1fr] lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] items-center w-full px-5 gap-5 mb-1">
                                <th
                                    className="flex items-center sm:w-full justify-start text-left text-[#7c70c3] font-semibold gap-0 text-base lg:text-lg whitespace-nowrap sticky left-0 -ml-5 pl-5 z-20 bg-[#f5f5ff] lg:bg-transparent cursor-[var(--pointer-hand-dark)] select-none"
                                    onClick={() => handleSort("name")}
                                >
                                    Name
                                    <div className="hidden lg:flex flex-col items-center gap-0.5 ml-2">
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-b-[7px] ${
                                                sortField === "name" &&
                                                sortDirection === "asc"
                                                    ? "border-b-[#161616]"
                                                    : "border-b-transparent"
                                            }`}
                                        ></span>
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-t-[7px] ${
                                                sortField === "name" &&
                                                sortDirection === "desc"
                                                    ? "border-t-[#161616]"
                                                    : "border-t-transparent"
                                            }`}
                                        ></span>
                                    </div>
                                </th>
                                <th
                                    className="flex items-center justify-between gap-2 lg:gap-3 text-[#7c70c3] font-semibold text-base lg:text-lg justify-self-center cursor-[var(--pointer-hand-dark)] select-none"
                                    onClick={() => handleSort("percentageSold")}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="whitespace-nowrap">
                                            Percentage Sold
                                        </span>
                                        <div className="relative group inline-flex">
                                            <span className="w-3 h-3 inline-block shrink-0 relative top-[1px] bg-[#7C71C3] [mask:url('/res/images/info.svg')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center]" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded bg-[#161616] text-white text-xs px-2 py-1 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100">
                                                (Total sold / Total rewards) *
                                                100
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden lg:flex flex-col items-center gap-0.5">
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-b-[7px] ${
                                                sortField ===
                                                    "percentageSold" &&
                                                sortDirection === "asc"
                                                    ? "border-b-[#161616]"
                                                    : "border-b-transparent"
                                            }`}
                                        ></span>
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-t-[7px] ${
                                                sortField ===
                                                    "percentageSold" &&
                                                sortDirection === "desc"
                                                    ? "border-t-[#161616]"
                                                    : "border-t-transparent"
                                            }`}
                                        ></span>
                                    </div>
                                </th>
                                <th
                                    className="flex items-center justify-between gap-2 lg:gap-3 text-[#7c70c3] font-semibold text-base lg:text-lg justify-self-center cursor-[var(--pointer-hand-dark)] select-none"
                                    onClick={() => handleSort("avgDelegation")}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="whitespace-nowrap">
                                            Avg Delegation
                                        </span>
                                        <div className="relative group inline-flex">
                                            <span className="w-3 h-3 inline-block shrink-0 relative top-[1px] bg-[#7C71C3] [mask:url('/res/images/info.svg')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center]" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded bg-[#161616] text-white text-xs px-2 py-1 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100">
                                                Average delegation
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden lg:flex flex-col items-center gap-0.5">
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-b-[7px] ${
                                                sortField === "avgDelegation" &&
                                                sortDirection === "asc"
                                                    ? "border-b-[#161616]"
                                                    : "border-b-transparent"
                                            }`}
                                        ></span>
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-t-[7px] ${
                                                sortField === "avgDelegation" &&
                                                sortDirection === "desc"
                                                    ? "border-t-[#161616]"
                                                    : "border-t-transparent"
                                            }`}
                                        ></span>
                                    </div>
                                </th>
                                <th
                                    className="flex items-center justify-between gap-2 lg:gap-3 text-[#7c70c3] font-semibold text-base lg:text-lg justify-self-center cursor-[var(--pointer-hand-dark)] select-none"
                                    onClick={() => handleSort("totalRewards")}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="whitespace-nowrap">
                                            Total Rewards
                                        </span>
                                        <div className="relative group inline-flex">
                                            <span className="w-3 h-3 inline-block shrink-0 relative top-[1px] bg-[#7C71C3] [mask:url('/res/images/info.svg')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center]" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded bg-[#161616] text-white text-xs px-2 py-1 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100">
                                                Total rewards
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden lg:flex flex-col items-center gap-0.5">
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-b-[7px] ${
                                                sortField === "totalRewards" &&
                                                sortDirection === "asc"
                                                    ? "border-b-[#161616]"
                                                    : "border-b-transparent"
                                            }`}
                                        ></span>
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-t-[7px] ${
                                                sortField === "totalRewards" &&
                                                sortDirection === "desc"
                                                    ? "border-t-[#161616]"
                                                    : "border-t-transparent"
                                            }`}
                                        ></span>
                                    </div>
                                </th>
                                <th
                                    className="flex items-center justify-between gap-2 lg:gap-3 text-[#7c70c3] font-semibold text-base lg:text-lg justify-self-center cursor-[var(--pointer-hand-dark)] select-none"
                                    onClick={() => handleSort("totalSold")}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="whitespace-nowrap">
                                            Total Sold Amount
                                        </span>
                                        <div className="relative group inline-flex">
                                            <span className="w-3 h-3 inline-block shrink-0 relative top-[1px] bg-[#7C71C3] [mask:url('/res/images/info.svg')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center]" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded bg-[#161616] text-white text-xs px-2 py-1 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100">
                                                Total sold amount
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden lg:flex flex-col items-center gap-0.5">
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-b-[7px] ${
                                                sortField === "totalSold" &&
                                                sortDirection === "asc"
                                                    ? "border-b-[#161616]"
                                                    : "border-b-transparent"
                                            }`}
                                        ></span>
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-t-[7px] ${
                                                sortField === "totalSold" &&
                                                sortDirection === "desc"
                                                    ? "border-t-[#161616]"
                                                    : "border-t-transparent"
                                            }`}
                                        ></span>
                                    </div>
                                </th>
                                <th
                                    className="flex items-center justify-between gap-2 lg:gap-3 text-[#7c70c3] font-semibold text-base lg:text-lg justify-self-center cursor-[var(--pointer-hand-dark)] select-none"
                                    onClick={() => handleSort("selfStake")}
                                >
                                    <div className="flex items-center gap-1">
                                        <span className="whitespace-nowrap">
                                            Self Stake
                                        </span>
                                        <div className="relative group inline-flex">
                                            <span className="w-3 h-3 inline-block shrink-0 relative top-[1px] bg-[#7C71C3] [mask:url('/res/images/info.svg')] [mask-size:contain] [mask-repeat:no-repeat] [mask-position:center]" />
                                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded bg-[#161616] text-white text-xs px-2 py-1 opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100">
                                                Self stake
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden lg:flex flex-col items-center gap-0.5">
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-b-[7px] ${
                                                sortField === "selfStake" &&
                                                sortDirection === "asc"
                                                    ? "border-b-[#161616]"
                                                    : "border-b-transparent"
                                            }`}
                                        ></span>
                                        <span
                                            className={`w-0 h-0 border-l-[5px] border-r-[5px] border-l-transparent border-r-transparent border-t-[7px] ${
                                                sortField === "selfStake" &&
                                                sortDirection === "desc"
                                                    ? "border-t-[#161616]"
                                                    : "border-t-transparent"
                                            }`}
                                        ></span>
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="w-full">
                            {sortedValidators.map((validator, index) => (
                                <tr
                                    key={index + "validator-table"}
                                    className="grid grid-cols-[140px_1fr_1fr_1fr_1fr_1fr] lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] items-center w-full px-5 gap-5 py-0 my-2.5 lg:my-0 lg:py-2.5 hover:bg-[#e8e8ff] transition-colors duration-250 ease-in-out cursor-[var(--pointer-hand-dark)]"
                                    operator-address={
                                        validator.operator_address
                                    }
                                    id={validator.operator_address}
                                    data-validator-row
                                    data-validator-moniker={validator.moniker}
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
                                    <td className="flex items-center justify-start gap-4.5 h-full lg:h-full sticky left-0 -ml-5 pl-5 z-10 bg-[#f5f5ff] lg:bg-transparent overflow-hidden">
                                        {/* Name */}
                                        <div className="flex items-center relative rounded-full gap-2.5 aspect-square min-w-7.5 max-w-7.5">
                                            <div
                                                className={`flex items-center justify-center min-w-[18px] max-w-[18px] min-h-[18px] max-h-[18px] absolute -left-1.5 -bottom-1.5 text-[#f5f5ff] bg-[#250055] border-1 border-[#f5f5ff] z-20 rounded-full ${
                                                    index + 1 >= 100
                                                        ? "text-[10px]"
                                                        : index + 1 >= 10
                                                        ? "text-[12px]"
                                                        : "text-[14px]"
                                                }`}
                                            >
                                                <span className="mb-1 ml-0">
                                                    {index + 1}
                                                </span>
                                            </div>
                                            <img
                                                src={
                                                    validator.temporary_image_uri
                                                }
                                                alt={validator.moniker}
                                                className="w-full h-full rounded-full"
                                            />
                                        </div>
                                        <div className="text-nowrap -mt-0.5 w-[80%]">
                                            <div className="flex text-base md:text-xl gap-2.5 text-[#49306f]">
                                                <div className="inline-block relative overflow-hidden whitespace-nowrap w-[120px] validators-table-validator-name-wrapper">
                                                    <span className="inline-block whitespace-nowrap validators-table-validator-name">
                                                        {isMobile &&
                                                        validator.moniker
                                                            .length > 13
                                                            ? `${validator.moniker.slice(
                                                                  0,
                                                                  13
                                                              )}...`
                                                            : validator.moniker}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="flex items-center justify-center font-bold gap-1.25 justify-self-center">
                                        {/* Percentage Sold */}
                                        {validator.percentage_sold ===
                                            undefined ||
                                        validator.percentage_sold === null ? (
                                            <span className="text-current">
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
                                                {validator.percentage_sold <
                                                    25 && (
                                                    <img
                                                        className="flex items-center justify-center"
                                                        src="/res/images/check_green.svg"
                                                    />
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-center text-nowrap text-xl relative justify-self-center">
                                        {/* Avg Delegation */}
                                        <div className="inline-flex gap-1 text-xl text-[#633f9a]">
                                            {validator.average_total_stake &&
                                            validator.average_total_stake > 0
                                                ? formatAtom(
                                                      validator.average_total_stake,
                                                      2
                                                  )
                                                : "0"}{" "}
                                            ATOM
                                        </div>
                                        <div className="text-base font-[500] text-[#633f9a]">
                                            {validator.average_total_stake
                                                ? `$${formatAtomUSD(
                                                      validator.average_total_stake,
                                                      2
                                                  )}`
                                                : "$0"}
                                        </div>
                                    </td>
                                    <td className="text-center text-nowrap text-xl relative justify-self-center">
                                        {/* Total Rewards */}
                                        <div className="inline-flex gap-1 text-xl text-[#633f9a]">
                                            {validator.reward &&
                                            validator.reward > 0
                                                ? formatAtom(
                                                      validator.reward,
                                                      2
                                                  )
                                                : "0"}{" "}
                                            ATOM
                                        </div>
                                        <div className="text-base font-[500] text-[#633f9a]">
                                            {validator.reward
                                                ? `$${formatAtomUSD(
                                                      validator.reward
                                                  )}`
                                                : "$0"}
                                        </div>
                                    </td>
                                    <td className="text-center text-nowrap text-xl relative justify-self-center">
                                        {/* Total Sold Amount */}
                                        <div className="inline-flex gap-1 text-xl text-[#633f9a]">
                                            {validator.sold &&
                                            validator.sold > 0
                                                ? formatAtom(validator.sold, 2)
                                                : "0"}{" "}
                                            ATOM
                                        </div>
                                        <div className="text-base font-[500] text-[#633f9a]">
                                            {validator.sold
                                                ? `$${formatAtomUSD(
                                                      validator.sold
                                                  )}`
                                                : "$0"}
                                        </div>
                                    </td>
                                    <td className="text-center text-nowrap text-xl relative justify-self-center">
                                        {/* Self Stake */}
                                        <div className="inline-flex gap-1 text-xl text-[#633f9a]">
                                            {validator.self_stake &&
                                            validator.self_stake > 0
                                                ? formatAtom(
                                                      validator.self_stake,
                                                      2
                                                  )
                                                : "0"}{" "}
                                            ATOM
                                        </div>
                                        <div className="text-base font-[500] text-[#633f9a]">
                                            {validator.self_stake
                                                ? `$${formatAtomUSD(
                                                      validator.self_stake
                                                  )}`
                                                : "$0"}
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
