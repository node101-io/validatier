import Navbar from "@/components/navbar/navbar";
import Validator from "../../../../../backend/models/Validator/Validator";
import { FormattedValidatorPageData } from "../../../../../backend/models/Validator/functions/getFormattedValidatorPageData";
import NetworkSummary from "@/components/network-summary/network-summary";
import {
  formatAtom,
  formatAtomUSD,
  formatPercentage,
} from "@/utils/format-numbers";
import GraphMetrics from "@/components/graph-metrics/graph-metrics";
import StakeWithUs from "@/components/stake-with-us/stake-with-us";
import Footer from "@/components/footer/footer";
import { connectMongoose } from "@/lib/mongoose";
import { cookies as getCookies } from "next/headers";
import { redirect } from "next/navigation";
import Chain, { ChainInterface } from "../../../../../backend/models/Chain/Chain";
import CopyableOperatorAddress from "@/components/copyable-operator-address/copyable-operator-address";
import Link from "next/link";
import Image from "next/image";

const getDefaultDates = () => {
  const today = new Date();
  const lastYear = new Date(today);
  lastYear.setMonth(today.getMonth() - 12);
  return { start: lastYear, end: today };
};

export default async function ValidatorPage({
  params,
}: {
  params: Promise<{ operatorAddress: string }>;
}) {
  await connectMongoose();

  const operatorAddress = (await params).operatorAddress;

  const cookies = await getCookies();

  const bottomCookie = cookies.get("selectedDateBottom")?.value;
  const topCookie = cookies.get("selectedDateTop")?.value;
  const specificRangeCookie = cookies.get("specificRange")?.value;

  const defaultDates = getDefaultDates();
  const initialStartDate = bottomCookie
    ? new Date(bottomCookie)
    : defaultDates.start;
  const initialEndDate = topCookie ? new Date(topCookie) : defaultDates.end;
  const initialInterval = specificRangeCookie || "last_365_days";

  const bottomTimestamp = initialStartDate.getTime();
  const topTimestamp = initialEndDate.getTime();

  const [chains, formattedData] = await Promise.all([
    new Promise<ChainInterface[]>((resolve) => {
      Chain.getAllChains((err, chains) => {
        if (err || !chains) throw new Error(err ?? "unknown_error");

        resolve(chains);
      });
    }),
    new Promise<FormattedValidatorPageData>((resolve) => {
      Validator.getFormattedValidatorPageData(
        {
          operator_address: operatorAddress,
          bottom_timestamp: bottomTimestamp,
          top_timestamp: topTimestamp,
          chain_identifier: "cosmoshub",
          interval: specificRangeCookie || "last_365_days",
        },
        (err, data) => {
          if (err || !data) throw new Error(err ?? "unknown_error");

          resolve(data);
        }
      );
    }),
  ]);

  const price =
    chains.find((chain) => chain.name === "cosmoshub")?.usd_exchange_rate ?? 0;

  if (!formattedData.validator) return redirect("/");

  const formatOrdinal = (rank: number) => {
    const suffixes = ["th", "st", "nd", "rd"];
    const lastTwoDigits = rank % 100;
    const suffix =
      suffixes[(lastTwoDigits - 20) % 10] ||
      suffixes[lastTwoDigits] ||
      suffixes[0];
    return `${rank}${suffix}`;
  };

  return (
    <div className="flex flex-col items-center relative overflow-hidden h-screen w-full">
      <div className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-auto ml-0 h-screen rounded-0 bg-white transition-all duration-250">
        <Navbar
          isValidatorPage={true}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          initialInterval={initialInterval}
        />
        <div className="mt-19 w-full lg:w-[1100px] h-fit lg:px-10">
          <div className="flex flex-col w-full gap-5 mt-5">
            <div className="px-5 lg:px-0">
              <div className="flex flex-col gap-5 sm:gap-0 sm:flex-row items-center justify-between w-full rounded-3xl px-6 py-7.5 border-[0.5px] border-[#bebee7] bg-[#f5f5ff]">
                {/* Validator Info */}
                <div className="flex items-center gap-2.5">
                  <img
                    src={
                      formattedData.validator.temporary_image_uri ||
                      "/res/images/default_validator_photo.svg"
                    }
                    alt={formattedData.validator.moniker}
                    className={`size-10 object-cover ${formattedData.validator.temporary_image_uri ? "rounded-full" : "rounded-none"}`}
                  />
                  <div>
                    <div className="text-xl font-semibold text-[#250054] leading-5">
                      {formattedData.validator.moniker}
                    </div>
                    <CopyableOperatorAddress
                      operatorAddress={formattedData.validator.operator_address}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-5 text-base">
                  <Link
                    href={formattedData.validator.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <Image
                      src="/res/images/web.svg"
                      alt="website"
                      width={12}
                      height={12}
                      className="w-3 h-3 overflow-clip"
                    />
                    <span className="mb-1">Website</span>
                  </Link>
                  <Link
                    href={`https://www.mintscan.io/cosmos/validators/${formattedData.validator.operator_address}`}
                    target="_blank"
                    className="flex items-center gap-1"
                    rel="noopener noreferrer"
                  >
                    <span className="mb-1">Explorer</span>
                  </Link>
                  <Link
                    href={`https://wallet.keplr.app/chains/cosmos-hub?modal=validator&chain=cosmoshub-4&validator_address=${formattedData.validator.operator_address}`}
                    target="_blank"
                    className="flex items-center justify-center h-6 gap-1 rounded-xl px-2.5 bg-[#250054] !text-white cursor-pointer"
                    rel="noopener noreferrer"
                  >
                    <span className="mb-1">Stake</span>
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row flex-nowrap justify-start gap-5 overflow-y-hidden ml-0 p-0 px-5 lg:px-0">
              {/* Network Summary */}
              <div className="shrink-0 flex-1">
                <NetworkSummary
                  leftColumn={
                    <>
                      <div className="flex text-xl font-normal text-[#7c70c3] text-nowrap items-center">
                        Total Self Stake
                      </div>
                      <div
                        className="text-[28px] font-bold text-[#49306f] leading-3 mb-0.5 text-nowrap"
                        id="summary-self-stake-amount-native"
                      >
                        {(() => {
                          const initial = (formattedData.validator).initial_self_stake_prefix_sum ?? 0;
                          const total = Math.max((formattedData.validator.self_stake ?? 0) + initial, 0);
                          return `${formatAtom(total)} ATOM`;
                        })()}
                      </div>
                      <div
                        className="font-medium text-[20px] text-[#7c70c3]"
                        id="summary-self-stake-amount-usd"
                      >
                        {(() => {
                          const initial = (formattedData.validator).initial_self_stake_prefix_sum ?? 0;
                          const total = Math.max((formattedData.validator.self_stake ?? 0) + initial, 0);
                          return `$${formatAtomUSD(total, price)}`;
                        })()}
                      </div>
                    </>
                  }
                  rightColumn={
                    <div className="text-nowrap mt-auto text-[#7c70c3] font-medium text-base">
                      {formatOrdinal(formattedData.ranks.selfStakeRank)} out of{" "}
                      {formattedData.ranks.totalValidators}
                    </div>
                  }
                />
              </div>
              <div className="shrink-0 flex-1">
                <NetworkSummary
                  leftColumn={
                    <>
                      <div className="flex text-xl font-normal text-[#7c70c3] text-nowrap items-center">
                        Percentage sold
                      </div>
                      <div
                        className="text-[36px] leading-[22px] font-bold text-[#49306f] text-nowrap mb-0.5"
                        id="summary-percentage-sold-native"
                      >
                        {formattedData.validator.percentage_sold
                          ? `${formatPercentage(formattedData.validator.percentage_sold, 1)}%`
                          : "%0"}
                      </div>
                      <div className="font-medium text-[20px] text-[#7c70c3]"></div>
                    </>
                  }
                  rightColumn={
                    <div className="text-nowrap mt-auto text-[#7c70c3] font-medium text-base">
                      {formatOrdinal(formattedData.ranks.percentageSoldRank)}{" "}
                      out of {formattedData.ranks.totalValidators}
                    </div>
                  }
                />
              </div>
              <div className="shrink-0 flex-1">
                <NetworkSummary
                  leftColumn={
                    <>
                      <div className="flex text-xl font-normal text-[#7c70c3] text-nowrap items-center">
                        Commission
                      </div>
                      <div
                        className="text-[36px] leading-[22px] font-bold text-[#49306f] text-nowrap mb-0.5"
                        id="summary-average-self-stake-ratio-native"
                      >
                        {formattedData.validator.commission_rate
                          ? `${formatPercentage(
                              Number(formattedData.validator.commission_rate) *
                                100,
                              2
                            )}%`
                          : "0%"}
                      </div>
                      <div className="font-medium text-[20px] text-[#7c70c3]"></div>
                    </>
                  }
                  rightColumn={
                    <div className="text-nowrap mt-auto text-[#7c70c3] font-medium text-base">
                      Fee from rewards
                    </div>
                  }
                />
              </div>
            </div>
            <GraphMetrics
              price={price}
              metrics={formattedData.metrics}
              firstSeries={[
                {
                  name: "Average Delegation",
                  data: formattedData.validatorGraphData.total_stake,
                },
              ]}
              secondSeries={[
                {
                  name: "Total Sold Amount",
                  data: formattedData.validatorGraphData.total_sold,
                },
              ]}
              thirdSeries={[
                {
                  name: "ATOM Price",
                  data: formattedData.priceData,
                },
              ]}
            />
          </div>
        </div>
        <StakeWithUs />
        <Footer />
      </div>
    </div>
  );
}
