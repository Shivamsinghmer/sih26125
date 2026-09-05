import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";

import "./globals.css";

const displaySerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display-serif",
  display: "swap",
});

const bodySans = Inter({
  subsets: ["latin"],
  variable: "--font-body-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BEL Asset Custody — SIH26125",
  description:
    "Credential-gated identity, access control and digital asset custody on a private permissioned chain.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${displaySerif.variable} ${bodySans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
