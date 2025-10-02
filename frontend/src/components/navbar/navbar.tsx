"use client";

import "@/../public/css/index/header.css";
import "@/../public/css/index/navbar.css";
import { LogoSVG } from "@/style/logo-svg";
import DateRangePicker from "@/components/date-picker/date-picker";
import { useEffect, useMemo, useState } from "react";
import { useScrollContext } from "@/components/scroll/scroll-provider";
import Link from "next/link";

export default function Navbar({
  isValidatorPage = false,
  onSearchChange,
  initialStartDate,
  initialEndDate,
  initialInterval,
}: {
  isValidatorPage?: boolean;
  onSearchChange?: (query: string) => void;
  initialStartDate?: Date;
  initialEndDate?: Date;
  initialInterval?: string;
}) {
  const { scrollY } = useScrollContext();
  const [introHeight, setIntroHeight] = useState<number>(300);
  const [pastIntro, setPastIntro] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  const heightClass = "h-[80px]";

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
    if (isValidatorPage) return "after:bg-white";
    return pastIntro ? "after:bg-white" : "after:bg-[linear-gradient(0deg,transparent_0%,rgba(46,74,122,0.7)_72%,rgba(46,74,122,1)_100%)]";
  }, [isValidatorPage, pastIntro]);

  const borderClass = useMemo(() => {
    if (isValidatorPage) return "";
    return pastIntro ? "degrade-navbar" : "";
  }, [isValidatorPage, pastIntro]);

  const brandFill = isValidatorPage || pastIntro ? "#250754" : "#f5f5ff";
  const showSearch = !isValidatorPage && pastIntro;

  return (
    <div
      className={`flex w-full ${heightClass} px-6 ${backgroundClass} ${borderClass} ${
        pastIntro || isValidatorPage
          ? "justify-between py-4"
          : "justify-center sm:justify-between py-8"
      } items-start gap-3 fixed z-[100] top-0 left-0 right-0 transition-all duration-300 group h-fit after:absolute after:left-0 after:top-0 after:w-full after:h-19 after:z-[-1]`}
    >
      <Link
        href="/"
        className={`flex gap-2 mr-0 sm:mr-8 z-20 user-select-none flex-row items-center justify-center transition-all duration-500 h-full group-focus-within:opacity-0 group-focus-within:translate-x-[-100%] sm:group-focus-within:opacity-100 sm:group-focus-within:translate-x-0`}
      >
        <LogoSVG fill={brandFill} className="block w-full h-full" />
      </Link>
      <div
        className={`flex w-fit items-start gap-3 transition-all duration-1000 overflow-visible ${
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
                showSearch ? "visible opacity-100" : "invisible opacity-0"
              } border-[#bebee7] text-[#7c70c3] !bg-[#f5f5ff] bg-[url(/res/images/search.svg)] bg-no-repeat transition-all duration-500 ease-in-out relative ${
                pastIntro
                  ? "w-8 focus:w-[275px] sm:focus:w-[250px] sm:w-[250px] bg-position-[6px_5px] sm:bg-position-[13px_13px] h-8 sm:h-11.5 rounded-xl pl-8 focus:pl-10 sm:pl-10 focus:ml-[-168px] sm:focus:ml-0"
                  : "w-[250px] bg-position-[13px_13px] h-11.5 rounded-2xl pl-11.5 pb-1"
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
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          initialInterval={initialInterval}
        />
      </div>
    </div>
  );
}
