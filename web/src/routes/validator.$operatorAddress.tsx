import { createFileRoute, redirect } from '@tanstack/react-router'
import Navbar from '@/components/navbar/navbar'
import NetworkSummary from '@/components/network-summary/network-summary'
import GraphMetrics from '@/components/graph-metrics/graph-metrics'
import StakeWithUs from '@/components/stake-with-us/stake-with-us'
import Footer from '@/components/footer/footer'
import CopyableOperatorAddress from '@/components/copyable-operator-address/copyable-operator-address'
import { formatPercentage } from '@/utils/format-numbers'
import { getValidatorDetail } from '@/lib/data'
import type { MonthlyBucket } from '@/types/data'

export const Route = createFileRoute('/validator/$operatorAddress')({
  loader: async ({ params }) => {
    const detail = await getValidatorDetail({ data: params.operatorAddress })
    if (!detail) throw redirect({ to: '/' })
    return detail
  },
  component: ValidatorPage,
})

function flattenGraphSeries(stats: MonthlyBucket[]) {
  const total_stake: number[] = []
  const total_sold: number[] = []
  const priceData: number[] = []
  for (const bucket of stats) {
    const { timestamp, total_stake: stake, total_sold: sold, price } = bucket.data
    for (let i = 0; i < timestamp.length; i++) {
      if (timestamp[i] === null) continue
      total_stake.push(stake[i] ?? 0)
      total_sold.push(sold[i] ?? 0)
      priceData.push(price[i] ?? 0)
    }
  }
  return { total_stake, total_sold, priceData }
}

const formatOrdinal = (rank: number) => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const lastTwoDigits = rank % 100
  const suffix = suffixes[(lastTwoDigits - 20) % 10] || suffixes[lastTwoDigits] || suffixes[0]
  return `${rank}${suffix}`
}

function ValidatorPage() {
  const { validator, metrics, stats, ranks } = Route.useLoaderData()
  const price = metrics.find((m) => m.id === 'price')?.valueNative ?? 0
  const { total_stake, total_sold, priceData } = flattenGraphSeries(stats)

  return (
    <div className="flex flex-col items-center relative overflow-hidden h-screen w-full">
      <div className="flex flex-col w-full items-center relative overflow-x-hidden overflow-y-auto ml-0 h-screen rounded-0 bg-white transition-all duration-250">
        <Navbar isValidatorPage={true} />
        <div className="mt-19 w-full lg:w-[1100px] h-fit lg:px-10">
          <div className="flex flex-col w-full gap-5 mt-5">
            <div className="px-5 lg:px-0">
              <div className="flex flex-col gap-5 sm:gap-0 sm:flex-row items-center justify-between w-full rounded-3xl px-6 py-7.5 border-[0.5px] border-[#bebee7] bg-[#f5f5ff]">
                {/* Validator Info */}
                <div className="flex items-center gap-2.5">
                  <img
                    src={validator.temporary_image_uri || '/res/images/default_validator_photo.svg'}
                    alt={validator.moniker}
                    className={`size-10 object-cover ${validator.temporary_image_uri ? 'rounded-full' : 'rounded-none'}`}
                  />
                  <div>
                    <div className="text-xl font-semibold text-[#250054] leading-5">
                      {validator.moniker}
                    </div>
                    <CopyableOperatorAddress operatorAddress={validator.operator_address} />
                  </div>
                </div>
                <div className="flex items-center gap-5 text-base">
                  {validator.website && (
                    <a
                      href={validator.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      <img src="/res/images/web.svg" alt="website" width={12} height={12} className="w-3 h-3 overflow-clip" />
                      <span className="mb-1">Website</span>
                    </a>
                  )}
                  <a
                    href={`https://www.mintscan.io/cosmos/validators/${validator.operator_address}`}
                    target="_blank"
                    className="flex items-center gap-1"
                    rel="noopener noreferrer"
                  >
                    <span className="mb-1">Explorer</span>
                  </a>
                  <a
                    href={`https://wallet.keplr.app/chains/cosmos-hub?modal=validator&chain=cosmoshub-4&validator_address=${validator.operator_address}`}
                    target="_blank"
                    className="flex items-center justify-center h-6 gap-1 rounded-xl px-2.5 bg-[#250054] !text-white cursor-pointer"
                    rel="noopener noreferrer"
                  >
                    <span className="mb-1">Stake</span>
                  </a>
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
                        Percentage sold
                      </div>
                      <div
                        className="text-[36px] leading-[22px] font-bold text-[#49306f] text-nowrap mb-0.5"
                        id="summary-percentage-sold-native"
                      >
                        {validator.percentage_sold
                          ? `${formatPercentage(validator.percentage_sold, 1)}%`
                          : '%0'}
                      </div>
                      <div className="font-medium text-[20px] text-[#7c70c3]"></div>
                    </>
                  }
                  rightColumn={
                    <div className="text-nowrap mt-auto text-[#7c70c3] font-medium text-base">
                      {formatOrdinal(ranks.percentageSoldRank)} out of {ranks.totalValidators}
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
                        {validator.commission_rate
                          ? `${formatPercentage(Number(validator.commission_rate) * 100, 2)}%`
                          : '0%'}
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
              metrics={metrics}
              firstSeries={[
                {
                  name: 'Average Delegation',
                  data: total_stake,
                },
              ]}
              secondSeries={[
                {
                  name: 'Total Sold Amount',
                  data: total_sold,
                },
              ]}
              thirdSeries={[
                {
                  name: 'ATOM Price',
                  data: priceData,
                },
              ]}
            />
          </div>
        </div>
        <StakeWithUs />
        <Footer />
      </div>
    </div>
  )
}
