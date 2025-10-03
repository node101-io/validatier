import type { Metadata } from "next";
import "./globals.css";
import { Tooltip } from "radix-ui";
import Providers from "./providers";

const title = "Validatier";
const description =
  "Your validators' guide to the galaxy - showcasing behaviors, contributions, and impact within the Cosmos ecosystem";

export const metadata: Metadata = {
  metadataBase: new URL("https://validatier.node101.io"),
  title: title,
  description: description,
  keywords: [
    "Cosmos",
    "validator",
    "staking",
    "ATOM",
    "blockchain",
    "delegation",
    "rewards",
    "analytics",
  ],
  openGraph: {
    title: title,
    description: description,
    images: [
      {
        url: "/res/images/meta/meta.webp",
        width: 1200,
        height: 630,
        alt: title,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: title,
    description: description,
    images: ["/res/images/meta/meta.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Tooltip.Provider delayDuration={0} skipDelayDuration={0}>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin=""
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@300..900&family=VT323&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          <Providers>{children}</Providers>
        </body>
      </html>
    </Tooltip.Provider>
  );
}
