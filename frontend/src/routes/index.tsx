import { createFileRoute } from '@tanstack/react-router'
import PageWrapper from '@/components/page-wrapper/page-wrapper'
import { getSummary, getValidators } from '@/lib/data'

export const Route = createFileRoute('/')({
  // Not awaited: the shell (Navbar/Intro) renders and streams immediately,
  // PageWrapper suspends on these two promises internally via <Await>.
  loader: () => ({
    summaryPromise: getSummary(),
    validatorsPromise: getValidators(),
  }),
  component: Home,
})

function Home() {
  const { summaryPromise, validatorsPromise } = Route.useLoaderData()
  return <PageWrapper summaryPromise={summaryPromise} validatorsPromise={validatorsPromise} />
}
