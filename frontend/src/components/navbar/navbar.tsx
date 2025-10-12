"use client";

import "@/../public/css/index/header.css";
import "@/../public/css/index/navbar.css";
import { LogoSVG } from "@/style/logo-svg";
import { LogoMobileSVG } from "@/style/logo-mobile-svg";
import DateRangePicker from "@/components/date-picker/date-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import { useScrollContext } from "@/components/scroll/scroll-provider";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

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
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [mobileLogoActive, setMobileLogoActive] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const backgroundClass = useMemo(() => {
    if (isValidatorPage) return "after:bg-white";
    return pastIntro
      ? "after:bg-white"
      : "after:bg-[linear-gradient(0deg,transparent_0%,rgba(46,74,122,0.8)_50%,rgba(46,74,122,1)_100%)]";
  }, [isValidatorPage, pastIntro]);

  const borderClass = useMemo(() => {
    if (isValidatorPage) return "";
    return pastIntro ? "degrade-navbar" : "";
  }, [isValidatorPage, pastIntro]);

  const brandFill = isValidatorPage || pastIntro ? "#250754" : "#f5f5ff";
  const showSearch = !isValidatorPage && pastIntro;
  const mobileShowsSmallLogo = isValidatorPage || (showSearch && mobileLogoActive && !isSearching);

  return (
    <div
      className={`flex w-full px-6 ${backgroundClass} ${borderClass} ${heightClass} ${
        pastIntro || isValidatorPage
          ? "justify-between py-4"
          : "justify-center sm:justify-between py-8"
      } max-sm:py-3! items-start gap-3 fixed z-[100] top-0 left-0 right-0 transition-all duration-300 group h-fit after:absolute after:left-0 after:top-0 after:w-full after:h-19 max-sm:after:h-14 after:z-[-1]`}
    >
      <Link
        href="/"
        className="flex items-center justify-center z-20 user-select-none h-[46px] max-sm:h-[30px] mr-1"
      >
        <LogoSVG fill={brandFill} className="h-full w-auto max-sm:hidden" />
        <div className="relative h-full w-auto sm:hidden inline-flex mr-auto">
          {/* Sizer to preserve layout width/height */}
          <div className="invisible h-full w-auto">
            {mobileShowsSmallLogo ? (
              <LogoMobileSVG fill={brandFill} className="h-full w-auto" />
            ) : (
              <LogoSVG fill={brandFill} className="h-full w-auto" />
            )}
          </div>
          {/* Crossfade layer */}
          <AnimatePresence initial={false}>
            {mobileShowsSmallLogo ? (
              <motion.div
                key="logo-mobile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <LogoMobileSVG fill={brandFill} className="h-full w-auto" />
              </motion.div>
            ) : (
              <motion.div
                key="logo-default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <LogoSVG fill={brandFill} className="h-full w-auto" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Link>
      {!isValidatorPage && (
        <motion.div
          layout
          transition={{ duration: 0.25, type: "spring", bounce: 0.2 }}
          className={`transition-all duration-1000 overflow-visible ml-auto ${
            pastIntro ? "flex" : "hidden sm:flex"
          } max-sm:flex-1 max-sm:min-w-0`}
        >
          <input
            type="text"
            className={`text-xl font-[500] border-1 ml-auto ${
              showSearch ? "visible opacity-100" : "invisible opacity-0"
            } border-[#bebee7] text-[#7c70c3] !bg-[#f5f5ff] bg-[url(/res/images/search.svg)] bg-no-repeat transition-all duration-500 ease-in-out relative ${
              isSearching ? "animate-pulse" : ""
            } ${
              pastIntro
                ? `${searchFocused ? "max-sm:w-full sm:w-[275px] max-sm:pl-10" : "max-sm:w-8 sm:w-[250px] max-sm:pl-8"} bg-position-[6px_5px] sm:bg-position-[13px_13px] max-sm:h-8 sm:h-11.5 rounded-xl sm:pl-10`
                : "w-[250px] bg-position-[13px_13px] h-11.5 rounded-2xl pl-11.5 pb-1"
            }`}
            placeholder="Search Validator"
            value={searchValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchValue(newValue);
              
              // Clear existing timeout
              if (searchTimeoutRef.current) {
                window.clearTimeout(searchTimeoutRef.current);
              }
              
              // Add bounce-back effect and debounced search
              setIsSearching(true);
              
              searchTimeoutRef.current = window.setTimeout(() => {
                if (onSearchChange) {
                  onSearchChange(newValue);
                }
                setIsSearching(false);
                searchTimeoutRef.current = null;
              }, 300); // 300ms debounce
            }}
            onFocus={() => {
              setSearchFocused(true);
              if (blurTimeoutRef.current) {
                window.clearTimeout(blurTimeoutRef.current);
                blurTimeoutRef.current = null;
              }
              // Only activate mobile logo if not currently searching
              if (!isSearching) {
                setMobileLogoActive(true);
              }
            }}
            onBlur={() => {
              setSearchFocused(false);
              if (blurTimeoutRef.current) {
                window.clearTimeout(blurTimeoutRef.current);
              }
              blurTimeoutRef.current = window.setTimeout(() => {
                // Only deactivate mobile logo if not currently searching
                if (!isSearching) {
                  setMobileLogoActive(false);
                }
                blurTimeoutRef.current = null;
              }, 250);
            }}
          />
        </motion.div>
      )}
      <div
        className={`flex items-start transition-all duration-1000 ${
          !pastIntro && !isValidatorPage ? "hidden sm:flex" : "flex"
        }`}
      >
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
