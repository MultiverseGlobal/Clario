import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import localFont from 'next/font/local';
import "./globals.css";
import { CanvasSea } from "@/components/ui/CanvasSea";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--next-font-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--next-font-mono",
  display: "swap",
});

// Since Geist might not be in older next/font/google, we use Inter as the closest robust fallback if Geist fails, but Next 15+ supports Geist in next/font/google.
import { Geist } from 'next/font/google';
const geist = Geist({
  subsets: ["latin"],
  variable: "--next-font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Metaphor — Make your AI tools work as one",
  description: "Metaphor connects your AI agents, MCP servers, and tools through shared context, intelligent handoffs, and coordinated execution — so work can move between them without you carrying the context.",
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
      </head>
      {/* Metaphor is light-mode first. White canvas, glass surfaces, monochrome obsidian signal. */}
      <body className={`${cormorant.variable} ${geist.variable} ${jetbrainsMono.variable} antialiased min-h-screen bg-transparent text-[#0A0A0A]`}>
        <CanvasSea />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
