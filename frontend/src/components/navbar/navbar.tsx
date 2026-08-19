"use client";

import "@/styles/index/header.css";
import "@/styles/index/navbar.css";
import { LogoSVG } from "@/style/logo-svg";
import { LogoMobileSVG } from "@/style/logo-mobile-svg";
import { useEffect, useMemo, useState } from "react";
import { useScrollContext } from "@/components/scroll/scroll-provider";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";

// DATE RANGE PICKER — removed on purpose (docs/05-static-json-contract.md:
// all_time only, no interval/date filtering). Kept here as a dead comment,
// not deleted, so a future "bring back filtering" task doesn't have to
// reconstruct this from scratch or dig through git history.
//
// Removed import:
//   import DateRangePicker from "@/components/date-picker/date-picker";
//
// Removed props (were passed down from page-wrapper.tsx / the route loaders):
//   initialStartDate?: Date;
//   initialEndDate?: Date;
//   initialInterval?: string;
//
// Removed render, right after the logo <Link> below, inside its own
// wrapper (the search input that used to sit alongside it has since moved
// into validator-table.tsx):
//   <div
//     role="table"
//     className={`flex items-start transition-all duration-1000 ${
//       !pastIntro && !isValidatorPage ? "hidden sm:flex" : "flex"
//     }`}
//   >
//     <DateRangePicker
//       variant={pastIntro || isValidatorPage ? "light" : "dark"}
//       initialStartDate={initialStartDate}
//       initialEndDate={initialEndDate}
//       initialInterval={initialInterval}
//     />
//   </div>
//
// The component itself (frontend/src/components/date-picker/date-picker.tsx,
// ~267 lines, + date-picker.css + style/{arrow-down-svg,calendar-svg}.tsx) is
// recoverable verbatim from git history at commit 79db787^ (last commit
// before the Next.js -> TanStack Start rewrite deleted the old frontend/).
// Re-porting it needs: next/navigation's useRouter().refresh() ->
// TanStack Router's router.invalidate(), the cookie-write mechanism kept as
// is, and genesisDate (was imported from the now-deleted backend Cache
// model) redefined locally as `new Date("2021-02-18")`. It would also need
// a real interval query param on the JSON export (docs/05 is all_time-only
// today), not just a frontend change.

export default function Navbar({
  isValidatorPage = false,
}: {
  isValidatorPage?: boolean;
}) {
  const { scrollY } = useScrollContext();
  const [introHeight, setIntroHeight] = useState<number>(300);
  const [pastIntro, setPastIntro] = useState<boolean>(false);

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
    return pastIntro
      ? "after:bg-white"
      : "after:bg-[linear-gradient(0deg,hsla(216,47%,33%,0)0%,hsla(216,47%,33%,0.01)8.1%,hsla(216,47%,33%,0.04)15.5%,hsla(216,47%,33%,0.09)22.5%,hsla(216,47%,33%,0.16)29%,hsla(216,47%,33%,0.25)35.3%,hsla(216,47%,33%,0.36)41.2%,hsla(216,47%,33%,0.5)47.1%,hsla(216,47%,33%,0.64)52.9%,hsla(216,47%,33%,0.75)58.8%,hsla(216,47%,33%,0.84)64.7%,hsla(216,47%,33%,0.91)71%,hsla(216,47%,33%,0.96)77.5%,hsla(216,47%,33%,0.99)84.5%,hsla(216,47%,33%,1)91.9%,hsla(216,47%,33%,1)100%)]";
  }, [isValidatorPage, pastIntro]);

  const borderClass = useMemo(() => {
    if (isValidatorPage) return "";
    return pastIntro ? "degrade-navbar" : "";
  }, [isValidatorPage, pastIntro]);

  const brandFill = isValidatorPage || pastIntro ? "#250754" : "#f5f5ff";
  const mobileShowsSmallLogo = isValidatorPage;

  return (
    <div
      className={`flex w-full px-6 ${backgroundClass} ${borderClass} ${
        pastIntro || isValidatorPage
          ? "justify-between py-4"
          : "justify-center sm:justify-between py-8"
      } max-sm:py-3! items-start gap-3 fixed z-[100] top-0 left-0 right-0 transition-all duration-300 group h-fit after:absolute after:left-0 after:top-0 after:w-full after:h-19 max-sm:after:h-14 after:z-[-1]`}
    >
      <Link
        to="/"
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
    </div>
  );
}
