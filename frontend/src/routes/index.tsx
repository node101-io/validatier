import { createFileRoute } from '@tanstack/react-router'
import PageWrapper from '@/components/page-wrapper/page-wrapper'
import { getSummary, getValidators } from '@/lib/data'
import { isRangePreset } from '@/types/range'
import type { RangeSearch } from '@/types/range'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): RangeSearch => ({
    range: isRangePreset(search.range) ? search.range : undefined,
    until: typeof search.until === 'string' ? search.until : undefined,
  }),
  loaderDeps: ({ search }) => ({ range: search.range, until: search.until }),
  // Not awaited: the shell (Navbar/Intro) renders and streams immediately,
  // PageWrapper suspends on these two promises internally via <Await>.
  loader: ({ deps }) => ({
    summaryPromise: getSummary({ data: deps }),
    validatorsPromise: getValidators({ data: deps }),
  }),
  component: Home,
})

function Home() {
  const { summaryPromise, validatorsPromise } = Route.useLoaderData()
  return <PageWrapper summaryPromise={summaryPromise} validatorsPromise={validatorsPromise} />
}
