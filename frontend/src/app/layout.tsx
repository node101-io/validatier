import type { Metadata } from "next";
import "./globals.css";
import { Tooltip } from "radix-ui";

export const metadata: Metadata = {
  title: "Validatier",
  description: "Validatier",
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
        <body>{children}</body>
      </html>
    </Tooltip.Provider>
  );
}
