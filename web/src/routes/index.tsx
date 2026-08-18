import { createFileRoute } from '@tanstack/react-router'
import PageWrapper from '@/components/page-wrapper/page-wrapper'
import type Validator from '@/types/validator'
import type SummaryData from '@/types/summary'
import type Metric from '@/types/metric'

export const Route = createFileRoute('/')({ component: Home })

// TEMP: hand-written placeholder data for the component-port step (Faz B).
// Real data wiring (reading public/data/*.json) happens in Faz C.
const validators: Validator[] = [
  {
    moniker: 'Node101',
    temporary_image_uri: null,
    operator_address: 'cosmosvaloper1lrzxwu4dmy8030waevcpft7rpxjjz26cpzvumd',
    website: 'https://node101.io',
    commission: 5,
    average_total_stake: 1_250_000,
    total_withdraw: 42_000,
    sold: 18_000,
    percentage_sold: 42.86,
  },
  {
    moniker: 'Ztake.org',
    temporary_image_uri: null,
    operator_address: 'cosmosvaloper102ruvpv2srmunfffxavttxnhezln6fnc54at8c',
    website: 'https://ztake.org/',
    commission: 7,
    average_total_stake: 37_729,
    total_withdraw: 1_625,
    sold: 0,
    percentage_sold: 0,
  },
]

const summaryData: SummaryData = {
  total_stake_sum: 281_371_239,
  total_withdraw_sum: 1_596_957,
  total_sold: 893_825,
  percentage_sold: 55.97,
}

const metrics: Metric[] = [
  { id: 'total_stake_sum', color: '#FF9404', title: 'Average Delegation', valueNative: summaryData.total_stake_sum },
  { id: 'total_sold', color: '#5856D7', title: 'Total Sold Amount', valueNative: summaryData.total_sold },
  { id: 'price', color: '#31ADE6', title: 'Average ATOM Price', valueNative: 1.45 },
]

const delegationData = [270_000_000, 275_000_000, 278_000_000, 281_371_239]
const soldData = [700_000, 780_000, 840_000, 893_825]
const priceData = [1.3, 1.35, 1.4, 1.45]

function Home() {
  return (
    <PageWrapper
      validators={validators}
      summaryData={summaryData}
      price={1.45}
      metrics={metrics}
      delegationData={delegationData}
      soldData={soldData}
      priceData={priceData}
    />
  )
}
