import { createFileRoute } from '@tanstack/react-router'
import PageWrapper from '@/components/page-wrapper/page-wrapper'
import { getSummary, getValidators } from '@/lib/data'
import type { MonthlyBucket } from '@/types/data'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [summary, validators] = await Promise.all([getSummary(), getValidators()])
    return { summary, validators }
  },
  component: Home,
})

function toDailySeries(stats: MonthlyBucket[]) {
  const delegationData: number[] = []
  const soldData: number[] = []
  const priceData: number[] = []
  const timestamps: number[] = []
  for (const bucket of stats) {
    const { timestamp, total_stake, total_sold, price } = bucket.data
    for (let i = 0; i < timestamp.length; i++) {
      const ts = timestamp[i]
      if (ts === null) continue
      timestamps.push(ts)
      delegationData.push(total_stake[i] ?? 0)
      soldData.push(total_sold[i] ?? 0)
      priceData.push(price[i] ?? 0)
    }
  }
  return { delegationData, soldData, priceData, timestamps }
}

function Home() {
  const { summary, validators } = Route.useLoaderData()
  const { delegationData, soldData, priceData, timestamps } = toDailySeries(summary.stats)
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
      timestamps={timestamps}
    />
  )
}
