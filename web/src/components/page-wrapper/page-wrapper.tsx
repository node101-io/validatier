"use client";

import { useState, useRef } from "react";
import ScrollProvider from "@/components/scroll/scroll-provider";
import Intro from "@/components/intro/intro";
import Navbar from "@/components/navbar/navbar";
import Inner from "@/components/inner/inner";
import StakeWithUs from "@/components/stake-with-us/stake-with-us";
import Footer from "@/components/footer/footer";
import type Validator from "@/types/validator";
import type SummaryData from "@/types/summary";
import type Metric from "@/types/metric";

interface PageWrapperProps {
  validators: Validator[];
  summaryData: SummaryData;
  price: number;
  metrics: Metric[];
  delegationData: number[];
  soldData: number[];
  priceData: number[];
}

export default function PageWrapper({
  validators,
  summaryData,
  price,
  metrics,
  delegationData,
  soldData,
  priceData,
}: PageWrapperProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const innerRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    innerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  };

  const handleSearchFocus = (): boolean => {
    // Check if validator table is in viewport
    if (innerRef.current) {
      const rect = innerRef.current.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom >= 0;

      // Only scroll if not visible
      if (!isVisible) {
        innerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        return true; // Scrolled
      }
    }
    return false; // No scroll needed
  };

  return (
    <ScrollProvider className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-auto ml-0 h-screen rounded-0 bg-white transition-all duration-250">
      <Navbar
        onSearchChange={handleSearchChange}
        onSearchFocus={handleSearchFocus}
      />
      <Intro />
      <Inner
        validators={validators}
        summaryData={summaryData}
        price={price}
        metrics={metrics}
        delegationData={delegationData}
        soldData={soldData}
        priceData={priceData}
        searchQuery={searchQuery}
        ref={innerRef}
      />
      <StakeWithUs />
      <Footer />
    </ScrollProvider>
  );
}
