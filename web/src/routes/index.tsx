import { createFileRoute } from '@tanstack/react-router'
import PageWrapper from '@/components/page-wrapper/page-wrapper'
import { getSummary, getValidators } from '@/lib/data'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [summary, validators] = await Promise.all([getSummary(), getValidators()])
    return { summary, validators }
  },
  component: Home,
})

function toDailySeries(stats: { data: { timestamp: (number | null)[]; total_stake: (number | null)[]; total_sold: (number | null)[]; price: (number | null)[] } }[]) {
  const delegationData: number[] = []
  const soldData: number[] = []
  const priceData: number[] = []
  for (const bucket of stats) {
    const { timestamp, total_stake, total_sold, price } = bucket.data
    for (let i = 0; i < timestamp.length; i++) {
      if (timestamp[i] === null) continue
      delegationData.push(total_stake[i] ?? 0)
      soldData.push(total_sold[i] ?? 0)
      priceData.push(price[i] ?? 0)
    }
  }
  return { delegationData, soldData, priceData }
}

function Home() {
  const { summary, validators } = Route.useLoaderData()
  const { delegationData, soldData, priceData } = toDailySeries(summary.stats)
  const price = summary.metrics.find((m) => m.id === 'price')?.valueNative ?? 0

  return (
    <PageWrapper
      validators={validators.validators}
      summaryData={summary.summaryData}
      price={price}
      metrics={summary.metrics}
      delegationData={delegationData}
      soldData={soldData}
      priceData={priceData}
    />
  )
}
