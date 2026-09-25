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
  title: "CredLock — SIH26125",
  description:
    "Credential-gated identity, access control and digital asset custody on a private permissioned chain.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Browser extensions commonly stamp attributes onto <html> before React
    // hydrates (password managers, accessibility tools, and whatever adds
    // `data-cap-chrome-extension-installed`). That is a difference React cannot
    // reconcile and cannot fix, so it warns. Suppression here is shallow — it
    // covers this element's own attributes only, so a real hydration mismatch
    // inside any component still reports normally.
    <html
      lang="en"
      className={`${displaySerif.variable} ${bodySans.variable}`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
