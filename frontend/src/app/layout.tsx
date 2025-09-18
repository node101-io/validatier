import type { Metadata } from "next";
import "./globals.css";
import "@/../public/css/index/general.css";
import "@/../public/css/index/index.css";
// import "@/../public/css/index/header.css";
import "@/../public/css/index/intro.css";
// import "@/../public/css/index/navbar.css";
import "@/../public/css/index/summary.css";
import "@/../public/css/index/validators.css";
import "@/../public/css/index/table.css";
import "@/../public/css/index/graph.css";
import "@/../public/css/index/export.css";
import "@/../public/css/index/mobile_start.css";

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
    );
}
