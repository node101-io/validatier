"use client";

import "@/../public/css/index/header.css";
import "@/../public/css/index/navbar.css";
import { LogoSVG } from "@/style/logo-svg";
import DateRangePicker from "@/components/date-picker/date-picker";
import { useEffect, useMemo, useState } from "react";
import { useScrollContext } from "@/components/scroll/scroll-provider";

export default function Navbar({
    isValidatorPage = false,
    onSearchChange,
}: {
    isValidatorPage?: boolean;
    onSearchChange?: (query: string) => void;
}) {
    const { scrollY } = useScrollContext();
    const [introHeight, setIntroHeight] = useState<number>(300);
    const [pastIntro, setPastIntro] = useState<boolean>(false);
    const [searchValue, setSearchValue] = useState<string>("");

    const heightClass = isValidatorPage
        ? "h-[75px]"
        : pastIntro
        ? "h-[50px] sm:h-[100px]"
        : "h-[75px] sm:h-[150px]";

    useEffect(() => {
        if (typeof window === "undefined") return;
        const root = document.documentElement;
        const raw = getComputedStyle(root).getPropertyValue(
            "--intro-main-wrapper-height"
        );
        const parsed = parseFloat(raw);
        if (!Number.isNaN(parsed)) setIntroHeight(parsed);
    }, []);

    useEffect(() => {
        if (!scrollY) return;

        const unsubscribe = scrollY.on("change", (y) => {
            setPastIntro(y >= introHeight * 0.3);
        });

        return unsubscribe;
    }, [scrollY, introHeight]);

    useEffect(() => {
        if (scrollY) {
            const currentY = scrollY.get();
            setPastIntro(currentY >= introHeight * 0.3);
        }
    }, [scrollY, introHeight]);

    const backgroundClass = useMemo(() => {
        if (isValidatorPage) return "bg-white";
        return pastIntro ? "bg-white" : "bg-transparent";
    }, [isValidatorPage, pastIntro]);

    const borderClass = useMemo(() => {
        if (isValidatorPage) return "";
        return pastIntro ? "degrade-navbar" : "";
    }, [isValidatorPage, pastIntro]);

    const brandFill = isValidatorPage || pastIntro ? "#250754" : "#f5f5ff";
    const brandTextClass =
        isValidatorPage || pastIntro ? "text-[#250754]" : "text-[#f5f5ff]";
    const showSearch = !isValidatorPage && pastIntro;

    return (
        <div
            className={`flex flex-row w-full ${heightClass} px-6 ${backgroundClass} ${borderClass} ${
                pastIntro || isValidatorPage
                    ? "justify-between"
                    : "justify-center sm:justify-between"
            } items-center gap-3 flex-nowrap fixed z-[100] top-0 left-0 right-0 transition-all duration-300 group`}
        >
            <a
                href="/"
                className={`flex gap-2 mr-0 sm:mr-8 z-20 user-select-none flex-row items-center justify-center transition-all duration-500 ${
                    pastIntro || isValidatorPage
                        ? "h-[17px] sm:h-[26px] my-1.5"
                        : "h-[11px] sm:h-[26px] my-0 sm:my-1.5"
                } group-focus-within:opacity-0 group-focus-within:translate-x-[-100%] sm:group-focus-within:opacity-100 sm:group-focus-within:translate-x-0`}
            >
                <div
                    className="flex min-w-fit h-full min-h-full items-center justify-center"
                    id="banner-logo"
                >
                    <LogoSVG
                        fill={brandFill}
                        className="aspect-[1.6] block min-h-full h-full w-auto max-h-full max-w-full"
                    />
                </div>
                <div
                    className={`transition-all duration-250 ease-in-out font-bold text-nowrap ${brandTextClass} ${
                        pastIntro || isValidatorPage
                            ? "text-[26px] sm:text-[42px] -mt-1.5"
                            : "text-xl sm:text-[42px] -mt-0 sm:-mt-1.5"
                    }`}
                    id="banner-title"
                >
                    VALIDATIER
                </div>
            </a>
            <div
                className={`flex w-fit items-center gap-3 transition-all duration-1000 overflow-visible ${
                    !pastIntro && !isValidatorPage ? "hidden sm:flex" : "flex"
                }`}
            >
                {!isValidatorPage && (
                    <div
                        className={`w-fit h-fit relative ${
                            pastIntro ? "block" : "hidden sm:block"
                        }`}
                    >
                        <input
                            type="text"
                            className={`text-xl font-[500] border-1 ${
                                showSearch
                                    ? "visible opacity-100"
                                    : "invisible opacity-0"
                            } border-[#bebee7] text-[#7c70c3] !bg-[#f5f5ff] bg-[url(/res/images/search.svg)] bg-no-repeat transition-all duration-500 ease-in-out relative ${
                                pastIntro
                                    ? "w-8 focus:w-[275px] sm:focus:w-[250px] sm:w-[250px] bg-position-[6px_5px] sm:bg-position-[13px_13px] h-8 sm:h-11.5 rounded-xl pl-8 focus:pl-10 sm:pl-10 focus:ml-[-168px] sm:focus:ml-0"
                                    : "w-[250px] bg-position-[13px_13px] h-11.5 rounded-2xl pl-11.5 pb-1 mt-0.5"
                            }`}
                            placeholder="Search Validator"
                            value={searchValue}
                            onChange={(e) => {
                                setSearchValue(e.target.value);
                                if (onSearchChange) {
                                    onSearchChange(e.target.value);
                                }
                            }}
                        />
                    </div>
                )}
                <DateRangePicker
                    variant={pastIntro || isValidatorPage ? "light" : "dark"}
                />
            </div>
        </div>
    );
}
