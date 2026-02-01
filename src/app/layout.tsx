import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "WikiReplay - Watch Wikipedia Articles Evolve",
    template: "%s | WikiReplay",
  },
  description: "Visualize the complete edit history of any Wikipedia article. Watch how articles evolved from their first edit to today.",
  keywords: ["Wikipedia", "edit history", "article evolution", "wiki viewer", "revision history", "Wikipedia timeline"],
  authors: [{ name: "WikiReplay" }],
  openGraph: {
    title: "WikiReplay - Watch Wikipedia Articles Evolve",
    description: "Visualize the complete edit history of any Wikipedia article. Watch how articles evolved from their first edit to today.",
    type: "website",
    siteName: "WikiReplay",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "WikiReplay - Watch Wikipedia Articles Evolve",
    description: "Visualize the complete edit history of any Wikipedia article.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
