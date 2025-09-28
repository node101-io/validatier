"use client";

import { useState, useRef } from "react";
import ScrollProvider from "@/components/scroll/scroll-provider";
import Intro from "@/components/intro/intro";
import Navbar from "@/components/navbar/navbar";
import Inner from "@/components/inner/inner";
import StakeWithUs from "@/components/stake-with-us/stake-with-us";
import Footer from "@/components/footer/footer";
import Validator from "@/types/validator";
import { ValidatorsSummaryDataInterface } from "../../../../src/models/Validator/Validator";
import Metric from "@/types/metric";

interface PageWrapperProps {
    validators: Validator[];
    summaryData: ValidatorsSummaryDataInterface;
    price: number;
    metrics: Metric[];
    delegationData: number[];
    soldData: number[];
    priceData: number[];
    smallSelfStakeAmountGraphData: number[];
    smallSelfStakeRatioGraphData: number[];
}

export default function PageWrapper({
    validators,
    summaryData,
    price,
    metrics,
    delegationData,
    soldData,
    priceData,
    smallSelfStakeAmountGraphData,
    smallSelfStakeRatioGraphData,
}: PageWrapperProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const innerRef = useRef<HTMLDivElement>(null);

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        if (query && innerRef.current) {
            const element = innerRef.current;
            const elementPosition = element.offsetTop;
            const offsetPosition = elementPosition - 75;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
            });
        }
    };

    return (
        <ScrollProvider className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-scroll ml-0 h-screen rounded-0 bg-white transition-all duration-250">
            <Navbar onSearchChange={handleSearchChange} />
            <Intro />
            <Inner
                validators={validators}
                summaryData={summaryData}
                price={price}
                metrics={metrics}
                delegationData={delegationData}
                soldData={soldData}
                priceData={priceData}
                smallSelfStakeAmountGraphData={smallSelfStakeAmountGraphData}
                smallSelfStakeRatioGraphData={smallSelfStakeRatioGraphData}
                searchQuery={searchQuery}
                ref={innerRef}
            />
            <StakeWithUs />
            <Footer />
        </ScrollProvider>
    );
}
