import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Tooltip } from 'radix-ui'

import appCss from '../styles.css?url'

const title = 'Validatier'
const description =
  "Your validators' guide to the galaxy - showcasing behaviors, contributions, and impact within the Cosmos ecosystem"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title },
      { name: 'description', content: description },
      {
        name: 'keywords',
        content: 'Cosmos, validator, staking, ATOM, blockchain, delegation, rewards, analytics',
      },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: '/res/images/meta/meta.webp' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: '/res/images/meta/meta.webp' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: '' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@300..900&family=VT323&display=swap',
      },
    ],
  }),
  // Fallback for any route without its own notFoundComponent (routes with a
  // more specific one, e.g. /validator/$operatorAddress, override this).
  notFoundComponent: RootNotFound,
  shellComponent: RootDocument,
})

function RootNotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full gap-3 text-[#7c70c3]">
      <div className="text-2xl font-semibold text-[#250054]">Page not found</div>
      <a href="/" className="underline">Back to dashboard</a>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
          {children}
        </Tooltip.Provider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
