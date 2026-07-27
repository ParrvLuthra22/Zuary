import type { Metadata, Viewport } from "next";
import { Eczar, Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

const eczar = Eczar({
  variable: "--font-eczar",
  subsets: ["devanagari"],
  weight: ["500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "ZUARY — Cut sharp.",
    template: "%s — ZUARY",
  },
  description:
    "Trousers cut in fixed runs from Indian mills. Three fits, one block.",
  openGraph: {
    title: "ZUARY — Cut sharp.",
    description:
      "Trousers cut in fixed runs from Indian mills. Three fits, one block.",
    type: "website",
    locale: "en_IN",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1C1E20" },
    { media: "(prefers-color-scheme: light)", color: "#FAFAF8" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables have to sit on <html>: globals.css aliases them
    // (--font-display: var(--font-inter-tight)) at :root, and a custom property
    // that references an undefined one computes to invalid and inherits down.
    <html
      lang="en"
      data-theme="dark"
      style={{ colorScheme: "dark" }}
      className={`${interTight.variable} ${jetbrainsMono.variable} ${inter.variable} ${eczar.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeProvider>
          <main>{children}</main>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
