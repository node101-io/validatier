"use client";

import { Await } from "@tanstack/react-router";
import ScrollProvider from "@/components/scroll/scroll-provider";
import Intro from "@/components/intro/intro";
import Navbar from "@/components/navbar/navbar";
import Inner from "@/components/inner/inner";
import StakeWithUs from "@/components/stake-with-us/stake-with-us";
import Footer from "@/components/footer/footer";
import { HomeSkeleton } from "@/components/loading/loading-veil";
import type { MonthlyBucket, SummaryJson, ValidatorsJson } from "@/types/data";

function toDailySeries(stats: MonthlyBucket[]) {
  const delegationData: number[] = [];
  const soldData: number[] = [];
  const priceData: number[] = [];
  const timestamps: number[] = [];
  for (const bucket of stats) {
    const { timestamp, total_stake, total_sold, price } = bucket.data;
    for (let i = 0; i < timestamp.length; i++) {
      const ts = timestamp[i];
      if (ts === null) continue;
      timestamps.push(ts);
      delegationData.push(total_stake[i] ?? 0);
      soldData.push(total_sold[i] ?? 0);
      priceData.push(price[i] ?? 0);
    }
  }
  return { delegationData, soldData, priceData, timestamps };
}

interface PageWrapperProps {
  summaryPromise: Promise<SummaryJson>;
  validatorsPromise: Promise<ValidatorsJson>;
}

export default function PageWrapper({ summaryPromise, validatorsPromise }: PageWrapperProps) {
  return (
    <ScrollProvider className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-auto ml-0 h-screen rounded-0 bg-white transition-all duration-250">
      <Navbar />
      <Intro />
      {/* Shell above renders immediately; only this data-dependent section
          suspends while summary/validators stream in from Mongo. */}
      <Await promise={summaryPromise} fallback={<HomeSkeleton />}>
        {(summary) => (
          <Await promise={validatorsPromise} fallback={<HomeSkeleton />}>
            {(validatorsJson) => {
              const { delegationData, soldData, priceData, timestamps } = toDailySeries(summary.stats);
              const price = summary.metrics.find((m) => m.id === "price")?.valueNative ?? 0;
              return (
                <Inner
                  validators={validatorsJson.validators}
                  summaryData={summary.summaryData}
                  price={price}
                  metrics={summary.metrics}
                  delegationData={delegationData}
                  soldData={soldData}
                  priceData={priceData}
                  timestamps={timestamps}
                  sinkBreakdown={summary.sinkBreakdown}
                />
              );
            }}
          </Await>
        )}
      </Await>
      <StakeWithUs />
      <Footer />
    </ScrollProvider>
  );
}
