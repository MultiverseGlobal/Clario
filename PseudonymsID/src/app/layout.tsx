import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Pseudonyms ID",
  description: "Sovereign identity layer across the ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="flex flex-col min-h-screen bg-[var(--pds-canvas)] text-[var(--pds-text-primary)] font-['Archivo',sans-serif] antialiased">
        <Navigation />
        <main className="flex-1 w-full flex flex-col items-center">
          {children}
        </main>
      </body>
    </html>
  );
}

