import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Metaphor — The Context Operating System",
  description: "Metaphor is the Context Operating System for intelligent applications — transforming fragmented events into a living structured knowledge graph.",
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
